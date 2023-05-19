// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";

import {IExchange} from "../core/IExchange.sol";

import {IWETH} from "../interfaces/IWETH.sol";

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {AccessController} from "../access/AccessController.sol";

import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";

import {IHandler} from "../handler/IHandler.sol";
import {ISwapHandler} from "../handler/ISwapHandler.sol";

import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

import {RebalanceLibrary} from "./RebalanceLibrary.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {FunctionParameters} from "../FunctionParameters.sol";

contract RebalanceAggregator is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  using SafeMathUpgradeable for uint256;
  IIndexSwap public index;

  AccessController public accessController;
  IAssetManagerConfig public assetManagerConfig;
  ITokenRegistry public tokenRegistry;
  IExchange public exchange;

  uint256 public lastPaused;
  address public WETH;
  address internal vault;

  event MetaAggregatorSwap(
    uint256 time,
    address[] indexed sellTokenAddress,
    address[] buyTokenAddress,
    uint256[] sellAmount,
    uint256[] protocolFee,
    address indexed portfolioToken,
    address[] newTokens
  );

  event swapPrimaryTokenSwap(
    uint256 time,
    address indexed sellTokenAddress,
    address buyTokenAddress,
    uint256 sellAmount,
    uint256 protocolFee,
    address indexed portfolioToken,
    address[] newTokens
  );

  event RebalanceAggregatorRedeem(uint256 time, uint256 swapAmounts, address indexed token);

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
    WETH = tokenRegistry.getETH();
    assetManagerConfig = IAssetManagerConfig(index.iAssetManagerConfig());
    vault = index.vault();
  }

  modifier onlyAssetManager() {
    if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotAssetManager();
    }
    _;
  }

  /**
   * @notice The function redeems Reward Token from Vault
   * @param _token address of token to redeem
   * @param _amount amount of token to redeem
   */
  function redeemRewardToken(address _token, uint256 _amount) public virtual onlyAssetManager {
    if (!tokenRegistry.isRewardToken(_token)) {
      revert ErrorLibrary.NotRewardToken();
    }
    exchange._pullFromVaultRewards(_token, _amount, address(this));
    index.setRedeemed(true);
  }

  /**
   * @notice The function redeems the token and get back the asset from other protocols
   * @param swapAmounts This is amount of tokens to be redeemed
   * @param token This is the address of the redeeming token
   */
  function redeem(uint256 swapAmounts, uint256 _lpSlippage, address token) public virtual onlyAssetManager {
    if (index.getRedeemed() == true) {
      revert ErrorLibrary.AlreadyRedeemed();
    }
    if (tokenRegistry.getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (index.getRecord(token).denorm == 0) {
      revert ErrorLibrary.TokenNotIndexToken();
    }
    index.setPaused(true);
    exchange._pullFromVault(token, swapAmounts, address(this));
    uint256 swapAmount = swapAmounts;
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
        if (underlying[j] == WETH) {
          IWETH(underlying[j]).deposit{value: address(this).balance}();
        }
      }
    }
    index.setRedeemed(true);
    emit RebalanceAggregatorRedeem(block.timestamp, swapAmounts, token);
  }

  /**
   * @notice The function swaps tokens using the external swap handlers
   * @param _data This is a struct of params required
   */

  function metaAggregatorSwap(ExchangeData.ExSwapData memory _data) external virtual onlyAssetManager {
    if (!(ITokenRegistry(index.tokenRegistry()).isEnabled(_data.portfolioToken))) {
      revert ErrorLibrary.BuyTokenAddressNotValid();
    }
    if (!(!assetManagerConfig.whitelistTokens() || assetManagerConfig.whitelistedToken(_data.portfolioToken))) {
      revert ErrorLibrary.TokenNotWhitelisted();
    }
    if (index.getRedeemed() == false) {
      revert ErrorLibrary.NotRedeemed();
    }
    uint balanceBefore = IERC20Upgradeable(_data.portfolioToken).balanceOf(vault);
    for (uint256 i = 0; i < _data.callData.length; i++) {
      if (_data.buyTokenAddress[i] != _data.sellTokenAddress[i]) {
        _swap(
          ExchangeData.MetaSwapData(
            _data.sellAmount[i],
            _data.protocolFee[i],
            _data.sellTokenAddress[i],
            _data.buyTokenAddress[i],
            _data.swapHandler,
            _data.callData[i]
          ),
          address(this)
        );
      }
    }

    IHandler handler = IHandler(tokenRegistry.getTokenInformation(_data.portfolioToken).handler);
    address[] memory underlying = handler.getUnderlying(_data.portfolioToken);
    uint256[] memory swapAmount = new uint256[](underlying.length);

    // add or not reward token
    if (!tokenRegistry.getTokenInformation(_data.portfolioToken).primary) {
      for (uint256 i = 0; i < underlying.length; i++) {
        if (underlying[i] == WETH) {
          //If two underlying checks, which one is bnb
          IWETH(WETH).withdraw(IERC20Upgradeable(WETH).balanceOf(address(this)));
          swapAmount[i] = address(this).balance;
        } else {
          swapAmount[i] = IERC20Upgradeable(underlying[i]).balanceOf(address(this));

          TransferHelper.safeTransfer(underlying[i], address(handler), swapAmount[i]);
        }
      }
      if (exchange.isWETH(_data.portfolioToken, address(handler))) {
        handler.deposit{value: address(this).balance}(
          _data.portfolioToken,
          swapAmount,
          _data._lpSlippage,
          vault
        );
      } else {
        handler.deposit(_data.portfolioToken, swapAmount, _data._lpSlippage, vault);
      }
    } else {
      swapAmount[0] = IERC20Upgradeable(underlying[0]).balanceOf(address(this));
      TransferHelper.safeTransfer(underlying[0], vault, swapAmount[0]);
    }
    uint256 balanceAfter = IERC20Upgradeable(_data.portfolioToken).balanceOf(vault);
    if (balanceAfter.sub(balanceBefore) < 0) {
      revert ErrorLibrary.SwapFailed();
    }
    address[] memory newTokens = RebalanceLibrary.getNewTokens(index.getTokens(), _data.portfolioToken);
    RebalanceLibrary.setRecord(index, newTokens, _data.portfolioToken);
    emit MetaAggregatorSwap(
      block.timestamp,
      _data.sellTokenAddress,
      _data.buyTokenAddress,
      _data.sellAmount,
      _data.protocolFee,
      _data.portfolioToken,
      newTokens
    );
  }

  /**
   * @notice The function is used for only base token prtfolio, used to redeem and swap base token
   * @param inputData address of sellToken,buyToken,swpaHandler, amount of sellAmout,protocolFee and callData in struct
   */
  function swapPrimaryToken(ExchangeData.MetaSwapData memory inputData) external {
    address[] memory tokens = index.getTokens();
    RebalanceLibrary.checkPrimary(index, tokens);
    if (!(ITokenRegistry(index.tokenRegistry()).isEnabled(inputData.buyTokenAddress))) {
      revert ErrorLibrary.BuyTokenAddressNotValid();
    }
    if (!(!assetManagerConfig.whitelistTokens() || assetManagerConfig.whitelistedToken(inputData.buyTokenAddress))) {
      revert ErrorLibrary.TokenNotWhitelisted();
    }
    uint balanceBefore = IERC20Upgradeable(inputData.buyTokenAddress).balanceOf(vault);
    exchange._pullFromVault(inputData.sellTokenAddress, inputData.sellAmount, address(this));
    if (inputData.buyTokenAddress != inputData.sellTokenAddress) {
      _swap(inputData, vault);
    } else {
      revert ErrorLibrary.BuyAndSellTokenAreSame();
    }
    uint balanceAfter = IERC20Upgradeable(inputData.buyTokenAddress).balanceOf(vault);
    if (balanceAfter.sub(balanceBefore) < 0) {
      revert ErrorLibrary.SwapFailed();
    }
    address[] memory newTokens = RebalanceLibrary.getNewTokens(tokens, inputData.buyTokenAddress);
    RebalanceLibrary.setRecord(index, newTokens, inputData.buyTokenAddress);
    emit swapPrimaryTokenSwap(
      block.timestamp,
      inputData.sellTokenAddress,
      inputData.buyTokenAddress,
      inputData.sellAmount,
      inputData.protocolFee,
      inputData.buyTokenAddress,
      newTokens
    );
  }

  /**
   * @notice The function internal fucntion used to swap token using offchainHandler
   * @param inputData address of sellToken,buyToken,swpaHandler, amount of sellAmout,protocolFee and callData in struct
   * @param _to address to whom token should be send
   */
  function _swap(ExchangeData.MetaSwapData memory inputData, address _to) internal {
    TransferHelper.safeTransfer(inputData.sellTokenAddress, inputData.swapHandler, inputData.sellAmount);
    IExternalSwapHandler(inputData.swapHandler).swap(
      inputData.sellTokenAddress,
      inputData.buyTokenAddress,
      inputData.sellAmount,
      inputData.protocolFee,
      inputData.callData,
      _to
    );
  }

  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
