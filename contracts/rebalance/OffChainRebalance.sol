// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";
import {IExchange} from "../core/IExchange.sol";

import {IWETH} from "../interfaces/IWETH.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {AccessController} from "../access/AccessController.sol";

import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";
import {IIndexOperations} from "../core/IIndexOperations.sol";

import {IHandler} from "../handler/IHandler.sol";

import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

import {RebalanceLibrary} from "./RebalanceLibrary.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {FunctionParameters} from "../FunctionParameters.sol";

contract OffChainRebalance is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  using SafeMathUpgradeable for uint256;
  using SafeMathUpgradeable for uint96;
  IIndexSwap public index;

  AccessController public accessController;
  ITokenRegistry public tokenRegistry;
  IAssetManagerConfig public assetManagerConfig;
  IExchange public exchange;

  IPriceOracle public oracle;

  uint256 public lastPaused;
  uint256 internal lastRebalanced;

  event EnableRebalance(uint256 time, uint96[] _newWeights);

  event EnableRebalanceAndUpdateRecord(uint256 time, address[] _newTokens, uint96[] _newWeights);

  event PullAndRedeemForUpdateWeights(
    uint256 time,
    uint256[] oldWeights,
    uint256[] newWeights,
    address[] sellTokens,
    address[] buyTokens
  );

  event PullAndRedeemForUpdateTokens(uint256 time, uint96[] _newWeights, address[] _newTokens);

  event EXTERNAL_REBALANCE_COMPLETED();
  bytes public updateTokenStateData;
  bytes public updateWeightStateData;

  constructor() {}

  function init(address _index, address _accessController) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    if (_index == address(0) || _accessController == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    index = IIndexSwap(_index);
    accessController = AccessController(_accessController);
    tokenRegistry = ITokenRegistry(index.tokenRegistry());
    exchange = IExchange(index.exchange());
    oracle = IPriceOracle(index.oracle());
    assetManagerConfig = IAssetManagerConfig(index.iAssetManagerConfig());
  }

  modifier onlyAssetManager() {
    if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotAssetManager();
    }
    _;
  }

  function getCurrentWeights() public returns (uint256[] memory) {
    return RebalanceLibrary.getCurrentWeights(index, index.getTokens());
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Weight,called to pull and redeem tokens
   * @param inputData NewWeights and LpSlippage in struct
   */
  function enableRebalance(FunctionParameters.EnableRebalanceData memory inputData) external virtual onlyAssetManager {
    index.setPaused(true);
    index.updateRecords(index.getTokens(), inputData._newWeights);

    pullAndRedeemForUpdateWeights(inputData._lpSlippage);

    emit EnableRebalance(block.timestamp, inputData._newWeights);
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Tokens,called to pull and redeem tokens
   * @param _newTokens Array of new tokens
   * @param _newWeights Array of new newights
   * @param _lpSlippage array os lpSlippage
   */
  function enableRebalanceAndUpdateRecord(
    address[] memory _newTokens,
    uint96[] memory _newWeights,
    uint256[] calldata _lpSlippage
  ) public virtual onlyAssetManager {
    for (uint256 i = 0; i < _newTokens.length; i++) {
      if (!(!assetManagerConfig.whitelistTokens() || assetManagerConfig.whitelistedToken(_newTokens[i]))) {
        revert ErrorLibrary.TokenNotWhitelisted();
      }
    }
    index.setPaused(true);
    _pullAndRedeemForUpdateTokens(_newWeights, _newTokens, _lpSlippage);
    index.updateTokenList(_newTokens);
    index.updateRecords(_newTokens, _newWeights);

    pullAndRedeemForUpdateWeights(_lpSlippage);

    emit EnableRebalanceAndUpdateRecord(block.timestamp, _newTokens, _newWeights);
  }

  /**
   * @notice The function is internal function of update Tokens,called to pull,redeem and sell tokens
   * @param _newTokens Array of new tokens
   * @param _newWeights Array of new newights
   * @param _lpSlippage array os lpSlippage
   */
  function _pullAndRedeemForUpdateTokens(
    uint96[] memory _newWeights,
    address[] memory _newTokens,
    uint256[] calldata _lpSlippage
  ) internal virtual onlyAssetManager {
    uint256[] memory newDenorms = RebalanceLibrary.evaluateNewDenorms(index, _newTokens, _newWeights);
    address[] memory tokens = index.getTokens();
    address[] memory tokenSell = new address[](tokens.length);
    if (index.totalSupply() > 0) {
      for (uint256 i = 0; i < tokens.length; i++) {
        if (newDenorms[i] == 0) {
          uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, tokens[i]);
          _pullAndRedeem(tokenBalance, _lpSlippage[i], tokens[i]);
          tokenSell[i] = tokens[i];
        }
        index.deleteRecord(tokens[i]);
      }
    }
    updateTokenStateData = abi.encode(tokenSell);
    emit PullAndRedeemForUpdateTokens(block.timestamp, _newWeights, _newTokens);
  }

  /**
   * @notice The function is internal function of update Weights,called to pull and redeem  tokens
   * @param _lpSlippage array os lpSlippage
   */
  function pullAndRedeemForUpdateWeights(uint256[] memory _lpSlippage) public virtual onlyAssetManager {
    address[] memory tokens = index.getTokens();
    uint256[] memory oldWeights = getCurrentWeights();
    uint256[] memory buyWeights = new uint256[](tokens.length);
    uint256[] memory newWeights = new uint256[](tokens.length);
    address[] memory sellTokens = new address[](tokens.length);
    address[] memory buyTokens = new address[](tokens.length);
    uint256 sumWeightsToSwap;
    for (uint256 i = 0; i < tokens.length; i++) {
      newWeights[i] = uint256(index.getRecord(tokens[i]).denorm);
      if (newWeights[i] < oldWeights[i]) {
        uint256 swapAmount = RebalanceLibrary.getAmountToSwap(index, tokens[i], newWeights[i], oldWeights[i]);
        _pullAndRedeem(swapAmount, _lpSlippage[i], tokens[i]);
        sellTokens[i] = tokens[i];
      } else if (newWeights[i] > oldWeights[i]) {
        uint256 diff = newWeights[i].sub(oldWeights[i]);
        sumWeightsToSwap = sumWeightsToSwap.add(diff);
        buyTokens[i] = tokens[i];
        buyWeights[i] = diff;
      }
    }
    index.setRedeemed(true);
    updateWeightStateData = abi.encode(sellTokens, buyTokens, buyWeights, sumWeightsToSwap);
    emit PullAndRedeemForUpdateWeights(block.timestamp, oldWeights, newWeights, sellTokens, buyTokens);
  }

  /**
   * @notice The function is internal function to Pull from Vault
   * @param swapAmount Amount to Pull From Vault
   * @param token Token to Pull From Vault
   * @param _lpSlippage array os lpSlippage
   */
  function _pullAndRedeem(uint256 swapAmount, uint256 _lpSlippage, address token) internal virtual onlyAssetManager {
    RebalanceLibrary.beforePullAndRedeem(index, assetManagerConfig, token);
    exchange._pullFromVault(token, swapAmount, address(this));
    if (!tokenRegistry.getTokenInformation(token).primary) {
      IHandler handler = IHandler(tokenRegistry.getTokenInformation(token).handler);
      address[] memory underlying = handler.getUnderlying(token);
      TransferHelper.safeTransfer(token, address(handler), swapAmount);
      handler.redeem(
        FunctionParameters.RedeemData(
          swapAmount,
          _lpSlippage,
          address(this),
          token,
          exchange.isWETH(token, address(handler))
        )
      );
      for (uint256 j = 0; j < underlying.length; j++) {
        if (underlying[j] == tokenRegistry.getETH()) {
          IWETH(underlying[j]).deposit{value: address(this).balance}();
        }
      }
    }
  }

  /**
   * @notice The function is 3rd transaction of update tokens and update weights, used to stake and deposit tokens
   * @param inputData array of buyToken,swapData,buyAmount,tokens,protocolFee and address of offChainHandler
   * @param _lpSlippage array of lpSlippage
   */
  function externalRebalance(FunctionParameters.ZeroExData calldata inputData, uint256[] calldata _lpSlippage) public {
    RebalanceLibrary.beforeExternalRebalance(index, tokenRegistry);
    if (lastRebalanced > lastPaused || block.timestamp >= (lastPaused + 10 minutes)) {
      _externalRebalance(inputData, _lpSlippage);
    } else {
      if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
        revert ErrorLibrary.OnlyAssetManagerCanCall();
      }
      _externalRebalance(inputData, _lpSlippage);
    }
    emit EXTERNAL_REBALANCE_COMPLETED();
  }

  /**
   * @notice The function is internal fucntion of external rebalance, used to stake and deposit tokens
   * @param inputData array of buyToken,swapData,buyAmount,tokens,protocolFee and address of offChainHandler
   * @param _lpSlippage array of lpSlippage
   */
  function _externalRebalance(
    FunctionParameters.ZeroExData calldata inputData,
    uint256[] calldata _lpSlippage
  ) internal virtual {
    IIndexOperations indexOperations = IIndexOperations(tokenRegistry.IndexOperationHandler());
    _stake(inputData, indexOperations, _lpSlippage);
    updateTokenStateData = abi.encode();
    updateWeightStateData = abi.encode();
    index.setRedeemed(false);
    index.setPaused(false);
  }

  /**
   * @notice The function is 2nd Transaction of update token and update weights,used to sell redeemed tokens using api
   * @param _sellToken array of tokens to sell
   * @param _sellSwapData array of callData for sellTokens
   * @param _offChainHandler address of offChainHandler, use to swap tokens
   */
  function _externalSell(
    address[] calldata _sellToken,
    bytes[] calldata _sellSwapData,
    address _offChainHandler
  ) public virtual onlyAssetManager {
    RebalanceLibrary.beforeExternalSell(index, tokenRegistry, _offChainHandler);
    for (uint256 i = 0; i < _sellToken.length; i++) {
      uint256 _balance = IERC20Upgradeable(_sellToken[i]).balanceOf(address(this));
      IndexSwapLibrary._transferAndSwapUsingOffChainHandler(
        _sellToken[i],
        IExternalSwapHandler(_offChainHandler).getETH(),
        _balance,
        address(this),
        _sellSwapData[i],
        _offChainHandler,
        0
      );
    }
  }

  /**
   * @notice The function is internal fucntion of external rebalance, used to stake and deposit tokens to vault
   * @param inputData array of buyToken,swapData,buyAmount,tokens,protocolFee and address of offChainHandler
   * @param indexOperations address of indexOperation, this contract contains logic of stake and deposit
   * @param _lpSlippage address of lpSlippage
   */
  function _stake(
    FunctionParameters.ZeroExData calldata inputData,
    IIndexOperations indexOperations,
    uint256[] calldata _lpSlippage
  ) internal virtual {
    uint256 underlyingIndex = 0;
    uint256 balance = IERC20Upgradeable(tokenRegistry.getETH()).balanceOf(address(this));
    TransferHelper.safeTransfer(tokenRegistry.getETH(), address(indexOperations), balance);
    for (uint256 i = 0; i < inputData._tokens.length; i++) {
      IHandler handler = IHandler(
        ITokenRegistry(index.tokenRegistry()).getTokenInformation(inputData._tokens[i]).handler
      );
      (, underlyingIndex) = indexOperations.swapOffChainTokens(
        ExchangeData.IndexOperationData(
          ExchangeData.ZeroExData(
            inputData._buyAmount,
            inputData._protocolFee,
            inputData._buyToken,
            tokenRegistry.getETH(),
            inputData._offChainHandler,
            inputData._buySwapData
          ),
          handler,
          index,
          underlyingIndex,
          inputData._protocolFee[i],
          0,
          _lpSlippage[i],
          inputData._tokens[i]
        )
      );
    }
  }

  /**
   * @notice The function is used to get the address and amount of tokens to redeem
   * @param newWeights array of newWeights
   */
  function getSwapData(uint256[] calldata newWeights) external returns (address[] memory, uint256[] memory) {
    return RebalanceLibrary.getRebalanceSwapData(newWeights, index);
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Weight For Only Base Token Portfolio,called to pull,redeem and sell tokens
   * @param newWeights array of newWeights
   * @param swapData array of calldata
   * @param offChainHandler address of offchainHandler use to swap Tokens
   * @param lpSlippage array of lpSlippage
   */
  function enablePrimaryTokens(
    uint96[] calldata newWeights,
    bytes[] calldata swapData,
    address offChainHandler,
    uint256[] memory lpSlippage
  ) external virtual {
    address[] memory tokens = index.getTokens();
    index.setPaused(true);
    IndexSwapLibrary.checkPrimary(index, tokens);
    address[] memory sellTokens;
    index.updateRecords(tokens, newWeights);
    pullAndRedeemForUpdateWeights(lpSlippage);
    (sellTokens, , , ) = abi.decode(updateWeightStateData, (address[], address[], uint256[], uint256));
    _swap(sellTokens, offChainHandler, swapData, 0);
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Tokens For Only Base Token Portfolio,called to pull,redeem, sell and update tokens
   * @param _newTokens array of newTokens
   * @param _newWeights array of newWeights
   * @param _lpSlippage array of lpSlippage
   * @param swapData array of calldata
   * @param offChainHandler address of offchainHandler
   */
  function enableAndUpdatePrimaryTokens(
    address[] memory _newTokens,
    uint96[] memory _newWeights,
    uint256[] calldata _lpSlippage,
    bytes[] calldata swapData,
    address offChainHandler
  ) external virtual {
    index.setPaused(true);
    IndexSwapLibrary.checkPrimary(index, index.getTokens());
    address[] memory sellTokens;
    enableRebalanceAndUpdateRecord(_newTokens, _newWeights, _lpSlippage);
    (sellTokens, , , ) = abi.decode(updateWeightStateData, (address[], address[], uint256[], uint256));
    uint256 _index = 0;
    _index = _swap(sellTokens, offChainHandler, swapData, _index);
    (sellTokens) = abi.decode(updateTokenStateData, (address[]));
    _index = _swap(sellTokens, offChainHandler, swapData, _index);
  }

  function _swap(
    address[] memory sellTokens,
    address offChainHandler,
    bytes[] calldata swapData,
    uint256 _index
  ) internal returns (uint256) {
    for (uint256 i = 0; i < sellTokens.length; i++) {
      if (sellTokens[i] != address(0) && sellTokens[i] != tokenRegistry.getETH()) {
        uint256 _balance = IERC20Upgradeable(sellTokens[i]).balanceOf(address(this));
        IndexSwapLibrary._transferAndSwapUsingOffChainHandler(
          sellTokens[i],
          IExternalSwapHandler(offChainHandler).getETH(),
          _balance,
          address(this),
          swapData[_index],
          offChainHandler,
          0
        );
        _index++;
      }
    }
    return _index;
  }

  function getUpdateTokenData(
    address[] memory newTokens,
    uint96[] memory newWeights
  )
    external
    returns (
      address[] memory tokenSell,
      address[] memory sellTokens,
      uint256[] memory swapAmounts1,
      uint256[] memory swapAmounts2
    )
  {
    (tokenSell, swapAmounts1) = RebalanceLibrary.getUpdateTokenData(index, newTokens, newWeights);
    (sellTokens, swapAmounts2) = RebalanceLibrary.getUpdateWeightTokenData(index, newTokens, newWeights);
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
