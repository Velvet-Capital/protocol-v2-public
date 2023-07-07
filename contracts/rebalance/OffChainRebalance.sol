// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {UUPSUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";
import {IExchange} from "../core/IExchange.sol";

import {IWETH} from "../interfaces/IWETH.sol";

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {AccessController} from "../access/AccessController.sol";

import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";

import {IHandler} from "../handler/IHandler.sol";

import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

import {RebalanceLibrary} from "./RebalanceLibrary.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {FunctionParameters} from "../FunctionParameters.sol";
import {IRebalanceAggregator} from "./IRebalanceAggregator.sol";

contract OffChainRebalance is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  using SafeMathUpgradeable for uint256;
  using SafeMathUpgradeable for uint96;
  IIndexSwap internal index;

  AccessController internal accessController;
  ITokenRegistry internal tokenRegistry;
  IAssetManagerConfig internal assetManagerConfig;
  IExchange internal exchange;
  IRebalanceAggregator internal aggregator;

  address[] internal modifiedTokens;
  address internal WETH;
  address internal vault;
  address internal _contract;
  address internal zeroAddress;
  address public owner;
  struct RebalanceData {
    uint96[] oldWeight;
    address[] oldTokens;
  }
  RebalanceData internal rebalanceData;
  mapping(address => uint256[]) public redeemedAmounts;
  enum Steps {
    FirstEnable,
    SecondSell,
    None
  }
  Steps internal step;
  event EnableRebalance(uint96[] _newWeights);

  event EnableRebalanceAndUpdateRecord(address[] _newTokens, uint96[] _newWeights);

  event PullAndRedeemForUpdateWeights(uint96[] oldWeights, address[] sellTokens, address[] buyTokens);

  event PullAndRedeemForUpdateTokens(uint96[] _newWeights, address[] _newTokens);

  event EXTERNAL_REBALANCE_COMPLETED(address indexed user);
  event EXTERNAL_SELL(address indexed assetManager);
  event ENABLE_PRIMARY_TOKENS(address indexed assetManager, uint96[] newWeights);
  event ENABLE_AND_UPDATE_PRIMARY_TOKENS(address indexed assetManager, address[] _newTokens, uint96[] newWeights);
  event REVERT_SELL_TOKENS(address indexed user);
  event REVERT_ENABLE_REBALANCING(address indexed user);

  bytes public updateTokenStateData;
  bytes public updateWeightStateData;

  constructor() {
    _disableInitializers();
  }

  function init(
    address _index,
    address _accessController,
    address _exchange,
    address _tokenRegistry,
    address _assetManagerConfig,
    address _vault,
    address _aggregator
  ) external initializer {
    __UUPSUpgradeable_init();
    owner = msg.sender;
    zeroAddress = address(0);
    if (
      _index == zeroAddress ||
      _accessController == zeroAddress ||
      _exchange == zeroAddress ||
      _tokenRegistry == zeroAddress ||
      _assetManagerConfig == zeroAddress ||
      _vault == zeroAddress ||
      _aggregator == zeroAddress
    ) {
      revert ErrorLibrary.InvalidAddress();
    }
    index = IIndexSwap(_index);
    accessController = AccessController(_accessController);
    tokenRegistry = ITokenRegistry(_tokenRegistry);
    exchange = IExchange(_exchange);
    assetManagerConfig = IAssetManagerConfig(_assetManagerConfig);
    aggregator = IRebalanceAggregator(_aggregator);
    WETH = tokenRegistry.getETH();
    vault = _vault;
    _contract = address(this);
  }

  modifier onlyAssetManager() {
    if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotAssetManager();
    }
    _;
  }

  modifier onlyOwner() {
    if (msg.sender != owner) {
      revert ErrorLibrary.CallerNotOwner();
    }
    _;
  }

  function getCurrentWeights() public returns (uint96[] memory) {
    return RebalanceLibrary.getCurrentWeights(index, getTokens());
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Weight,called to pull and redeem tokens
   * @param inputData NewWeights and LpSlippage in struct
   */
  function enableRebalance(FunctionParameters.EnableRebalanceData memory inputData) external virtual onlyAssetManager {
    RebalanceLibrary.validateEnableRebalance(index, tokenRegistry);
    //Keeping track of oldWeights and OldTokens for further use
    address[] memory _tokens = setRebalanceDataAndPause();
    uint96[] memory _newWeight = inputData._newWeights;
    updateRecord(_tokens, _newWeight);
    pullAndRedeemForUpdateWeights(inputData._lpSlippage);
    step = Steps.FirstEnable;
    emit EnableRebalance(_newWeight);
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
    RebalanceLibrary.validateUpdateRecord(_newTokens, assetManagerConfig, tokenRegistry);
    setRebalanceDataAndPause();
    _pullAndRedeemForUpdateTokens(_newWeights, _newTokens, _lpSlippage);
    index.updateTokenList(_newTokens);
    updateRecord(_newTokens, _newWeights);
    pullAndRedeemForUpdateWeights(_lpSlippage);
    step = Steps.FirstEnable;
    emit EnableRebalanceAndUpdateRecord(_newTokens, _newWeights);
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
  ) internal virtual {
    uint256[] memory newDenorms = RebalanceLibrary.evaluateNewDenorms(index, _newTokens, _newWeights);
    address[] memory tokens = getTokens();
    uint256 len = tokens.length;
    address[] memory tokenSell = new address[](len);
    if (index.totalSupply() > 0) {
      for (uint256 i = 0; i < len; i++) {
        address _token = tokens[i];
        if (newDenorms[i] == 0) {
          uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, _token);
          _pullAndRedeem(tokenBalance, _lpSlippage[i], _token);
          tokenSell[i] = _token;
        }
        index.deleteRecord(_token);
      }
    }
    updateTokenStateData = abi.encode(tokenSell);
    emit PullAndRedeemForUpdateTokens(_newWeights, _newTokens);
  }

  /**
   * @notice The function is internal function of update Weights,called to pull and redeem  tokens
   * @param _lpSlippage array of lpSlippage
   */
  function pullAndRedeemForUpdateWeights(uint256[] memory _lpSlippage) internal virtual {
    address[] memory tokens = getTokens();
    uint96[] memory oldWeights = getCurrentWeights();
    uint256 len = tokens.length;
    uint256[] memory buyWeights = new uint256[](len);
    address[] memory sellTokens = new address[](len);
    address[] memory buyTokens = new address[](len);
    uint256 sumWeightsToSwap;
    for (uint256 i = 0; i < len; i++) {
      uint256 oldWeight = oldWeights[i];
      address _token = tokens[i];
      uint256 newWeights = uint256(index.getRecord(_token).denorm);
      if (newWeights < oldWeight) {
        uint256 swapAmount = RebalanceLibrary.getAmountToSwap(index, _token, newWeights, oldWeight);
        _pullAndRedeem(swapAmount, _lpSlippage[i], _token);
        sellTokens[i] = _token;
      } else if (newWeights > oldWeight) {
        uint256 diff = newWeights.sub(oldWeight);
        sumWeightsToSwap = sumWeightsToSwap.add(diff);
        buyTokens[i] = _token;
        buyWeights[i] = diff;
      }
    }
    setRedeemed(true);
    updateWeightStateData = abi.encode(sellTokens, buyTokens, buyWeights, sumWeightsToSwap);
    emit PullAndRedeemForUpdateWeights(oldWeights, sellTokens, buyTokens);
  }

  /**
   * @notice The function is internal function to Pull from Vault
   * @param swapAmount Amount to Pull From Vault
   * @param token Token to Pull From Vault
   * @param _lpSlippage array os lpSlippage
   */
  function _pullAndRedeem(uint256 swapAmount, uint256 _lpSlippage, address token) internal virtual {
    RebalanceLibrary.beforePullAndRedeem(index, assetManagerConfig, token);
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(token);
    IHandler handler = IHandler(tokenInfo.handler);
    uint256[] memory balanceBefore = RebalanceLibrary.checkUnderlyingBalances(token, handler, _contract);
    address[] memory underlying = handler.getUnderlying(token);
    exchange._pullFromVault(token, swapAmount, _contract);
    modifiedTokens.push(token);
    if (!tokenInfo.primary) {
      TransferHelper.safeTransfer(token, address(handler), swapAmount);
      handler.redeem(
        FunctionParameters.RedeemData(
          swapAmount,
          _lpSlippage,
          _contract,
          token,
          exchange.isWETH(token, address(handler))
        )
      );
      for (uint256 j = 0; j < underlying.length; j++) {
        if (underlying[j] == WETH) {
          IWETH(WETH).deposit{value: _contract.balance}();
        }
      }
    }
    for (uint256 i = 0; i < underlying.length; i++) {
      uint balanceAfter = IERC20Upgradeable(underlying[i]).balanceOf(_contract);
      redeemedAmounts[token].push(balanceAfter.sub(balanceBefore[i]));
    }
  }

  /**
   * @notice The function is 3rd transaction of update tokens and update weights, used to stake and deposit tokens
   * @param inputData array of buyToken,swapData,buyAmount,tokens,protocolFee and address of offChainHandler
   * @param _lpSlippage array of lpSlippage
   */
  function externalRebalance(
    FunctionParameters.ZeroExData calldata inputData,
    uint256[] calldata _lpSlippage
  ) external onlyAssetManager {
    if (Steps.SecondSell != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    RebalanceLibrary.beforeExternalRebalance(index, tokenRegistry);
    _externalRebalance(inputData, _lpSlippage);
    emit EXTERNAL_REBALANCE_COMPLETED(msg.sender);
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
    address[] memory _buyTokens;
    uint256[] memory _buyWeight;
    uint256 _sumWeight;
    //Decoding Stored State Data
    (, _buyTokens, _buyWeight, _sumWeight) = abi.decode(
      updateWeightStateData,
      (address[], address[], uint256[], uint256)
    );
    uint256 balance = IERC20Upgradeable(WETH).balanceOf(_contract);
    TransferHelper.safeTransfer(WETH, address(exchange), balance);
    uint256 underlyingIndex;
    uint256 inputIndex;
    //Looping through the decoded data ( buyTokens)
    for (uint i = 0; i < _buyTokens.length; i++) {
      address _token = _buyTokens[i];
      if (_token != zeroAddress) {
        uint256 buyVal = balance.mul(_buyWeight[i]).div(_sumWeight);
        underlyingIndex = _stake(inputData, _lpSlippage, buyVal, underlyingIndex, inputIndex, _token);
        inputIndex++;
      }
    }
    deleteState();
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
  ) external virtual onlyAssetManager {
    if (Steps.FirstEnable != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    RebalanceLibrary.beforeExternalSell(index, tokenRegistry, _offChainHandler);
    for (uint256 i = 0; i < _sellToken.length; i++) {
      address _token = _sellToken[i];
      RebalanceLibrary._transferAndSwapUsingOffChainHandler(
        _token,
        WETH,
        IERC20Upgradeable(_token).balanceOf(_contract),
        _contract,
        _sellSwapData[i],
        _offChainHandler,
        0
      );
    }
    step = Steps.SecondSell;
    emit EXTERNAL_SELL(msg.sender);
  }

  /**
   * @notice The function is internal fucntion of external rebalance, used to stake and deposit tokens to vault
   * @param inputData array of buyToken,swapData,buyAmount,tokens,protocolFee and address of offChainHandler
   * @param _lpSlippage address of lpSlippage
   */
  function _stake(
    FunctionParameters.ZeroExData calldata inputData,
    uint256[] calldata _lpSlippage,
    uint256 buyVal,
    uint256 underlyingindex,
    uint256 inputIndex,
    address _token
  ) internal virtual returns (uint256 underlyingIndex) {
    (, underlyingIndex) = exchange.swapOffChainTokens(
      ExchangeData.IndexOperationData(
        ExchangeData.InputData(inputData._buyAmount, WETH, inputData._offChainHandler, inputData._buySwapData),
        index,
        underlyingindex,
        inputData._protocolFee[inputIndex],
        0,
        _lpSlippage[inputIndex],
        buyVal,
        _token,
        vault
      )
    );
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
  ) external virtual onlyAssetManager {
    address[] memory tokens = getTokens();
    setPaused(true);
    IndexSwapLibrary.checkPrimaryAndHandler(tokenRegistry, tokens, offChainHandler);
    address[] memory sellTokens;
    updateRecord(tokens, newWeights);
    pullAndRedeemForUpdateWeights(lpSlippage);
    (sellTokens, , , ) = abi.decode(updateWeightStateData, (address[], address[], uint256[], uint256));
    _swap(sellTokens, offChainHandler, swapData, 0);

    step = Steps.SecondSell;
    emit ENABLE_PRIMARY_TOKENS(msg.sender, newWeights);
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
  ) external virtual onlyAssetManager {
    setPaused(true);
    IndexSwapLibrary.checkPrimaryAndHandler(tokenRegistry, getTokens(), offChainHandler);
    address[] memory sellTokens;
    enableRebalanceAndUpdateRecord(_newTokens, _newWeights, _lpSlippage);
    (sellTokens, , , ) = abi.decode(updateWeightStateData, (address[], address[], uint256[], uint256));
    uint256 _index = 0;
    _index = _swap(sellTokens, offChainHandler, swapData, _index);
    (sellTokens) = abi.decode(updateTokenStateData, (address[]));
    _index = _swap(sellTokens, offChainHandler, swapData, _index);

    step = Steps.SecondSell;
    emit ENABLE_AND_UPDATE_PRIMARY_TOKENS(msg.sender, _newTokens, _newWeights);
  }

  /**
   * @notice The function is used to swap token using offchainHandler
   * @param sellTokens array of tokens to sell
   * @param offChainHandler address of offchainHandler
   * @param swapData array of calldata
   * @param _index a counter to keep track index of array
   */
  function _swap(
    address[] memory sellTokens,
    address offChainHandler,
    bytes[] calldata swapData,
    uint256 _index
  ) internal returns (uint256) {
    for (uint256 i = 0; i < sellTokens.length; i++) {
      address _token = sellTokens[i];
      if (_token != zeroAddress && _token != WETH) {
        RebalanceLibrary._transferAndSwapUsingOffChainHandler(
          _token,
          WETH,
          IERC20Upgradeable(_token).balanceOf(_contract),
          _contract,
          swapData[_index],
          offChainHandler,
          0
        );
        _index++;
      }
    }
    return _index;
  }

  /**
   * @notice The function reverts back WETH back to vault,updating the tokenList and weights accordingly,if only 2 transaction out of 3 is executed(ExternalSell)
   */
  function revertSellTokens() external onlyAssetManager {
    _revertSell();
  }

  function _revertSell() internal {
    if (Steps.SecondSell != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    RebalanceLibrary.beforeRevertCheck(index);
    TransferHelper.safeTransfer(WETH, vault, IERC20Upgradeable(WETH).balanceOf(_contract));

    address[] memory newTokens = RebalanceLibrary.getNewTokens(rebalanceData.oldTokens, WETH);
    RebalanceLibrary.setRecord(index, newTokens, WETH);
    deleteState();
    emit REVERT_SELL_TOKENS(msg.sender);
  }

  /**
   * @notice The function reverts back the token to the vault again to old state,if only 1 transaction out of 3 is executed(enebaleRebalance)
   * @param _lpSlippage array of lpSlippage
   */
  function revertEnableRebalancing(uint256[] calldata _lpSlippage) external onlyAssetManager {
    _revertEnableRebalancing(_lpSlippage);
  }

  function _revertEnableRebalancing(uint256[] calldata _lpSlippage) internal {
    //checks
    if (Steps.FirstEnable != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    RebalanceLibrary.beforeRevertCheck(index);
    //Check if enable transaction has done
    //Looping over tokens to deposit
    for (uint i = 0; i < modifiedTokens.length; i++) {
      address token = modifiedTokens[i];
      //Redeemedamounts is mapping to keep track of amount of underlying contract has,for particular token -
      // Have used this mapping in PullAndRedeem,to store amounts
      uint256[] memory amounts = redeemedAmounts[token];
      IHandler handler = IHandler(getTokenInfo(token).handler);
      address[] memory underlying = handler.getUnderlying(token);
      //Here it loops throught the length of amount and sends to Aggregator Contract
      for (uint j = 0; j < amounts.length; j++) {
        TransferHelper.safeTransfer(underlying[j], address(aggregator), amounts[j]);
      }
      aggregator._revertRebalance(amounts, _lpSlippage[i], token);
    }
    //Updating the record back, I have used this struct mapping to keep track of oldWeoght and OldTokens
    updateRecord(rebalanceData.oldTokens, rebalanceData.oldWeight);
    //Setting everthing to normal
    deleteState();
    emit REVERT_ENABLE_REBALANCING(msg.sender);
  }

  function revertEnableRebalancingByUser(uint256[] calldata _lpSlippage) external {
    if (isUserEnabled()) {
      _revertEnableRebalancing(_lpSlippage);
    }
  }

  function revertSellByUser() external {
    if (isUserEnabled()) {
      _revertSell();
    }
  }

  /**
   * @notice The function gives the bool value, after checking for lastRebalance and lastPaused, for user to take action
   */
  function isUserEnabled() internal view returns (bool status) {
    uint256 _lastPaused = index.getLastPaused();
    status = (block.timestamp >= (_lastPaused + 15 minutes));
  }

  /**
   * @notice The function is used to delete and update variable state,after completion of task/last step
   */
  function deleteState() internal {
    for (uint i = 0; i < modifiedTokens.length; i++) {
      delete redeemedAmounts[modifiedTokens[i]];
    }
    step = Steps.None;
    updateTokenStateData = abi.encode();
    updateWeightStateData = abi.encode();
    index.setFlags(false, false);
    delete modifiedTokens;
    delete rebalanceData.oldWeight;
    delete rebalanceData.oldTokens;
  }

  /**
   * @notice The function is used set RebalanceData, Pause and return index tokens
   */
  function setRebalanceDataAndPause() internal returns (address[] memory _tokens) {
    setPaused(true);
    _tokens = getTokens();
    rebalanceData.oldWeight = RebalanceLibrary.getOldWeights(index, _tokens);
    rebalanceData.oldTokens = _tokens;
  }

  /**
   * @notice The function is used to update Record
   */
  function updateRecord(address[] memory tokens, uint96[] memory weights) internal {
    index.updateRecords(tokens, weights);
  }

  /**
   * @notice The function is used to setPaused
   */
  function setPaused(bool _state) internal {
    index.setPaused(_state);
  }

  /**
   * @notice The function is used to setRedeemed
   */
  function setRedeemed(bool _state) internal {
    index.setRedeemed(_state);
  }

  /**
   * @notice The function is used to get tokens from index
   */
  function getTokens() internal view returns (address[] memory) {
    return index.getTokens();
  }

  /**
   * @notice This internal returns token information
   */
  function getTokenInfo(address _token) internal view returns (ITokenRegistry.TokenRecord memory) {
    return tokenRegistry.getTokenInformation(_token);
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
