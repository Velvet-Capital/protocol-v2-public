// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {UUPSUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {IExchange} from "../core/IExchange.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
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

contract RebalanceAggregator is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
  using SafeMathUpgradeable for uint256;
  IIndexSwap public index;

  AccessController public accessController;
  IAssetManagerConfig public assetManagerConfig;
  ITokenRegistry public tokenRegistry;
  IExchange public exchange;

  address public WETH;
  address internal vault;
  address internal tokenRedeemed;
  address internal _contract;
  mapping(address => uint256[]) public redeemedAmounts;
  IWETH public wETH;

  event MetaAggregatorSwap(
    uint256 indexed time,
    address[] sellTokenAddress,
    address[] buyTokenAddress,
    uint256[] sellAmount,
    uint256[] protocolFee,
    address indexed portfolioToken,
    address[] newTokens
  );

  event swapPrimaryTokenSwap(
    uint256 indexed time,
    address[] sellTokenAddress,
    address[] buyTokenAddress,
    uint256[] sellAmount,
    uint256[] protocolFee,
    address indexed portfolioToken,
    address[] newTokens
  );

  event RebalanceAggregatorRedeem(uint256 indexed time, uint256 indexed swapAmounts, address indexed token);
  event DirectSwap(uint256 indexed time, address[] sellTokenAddress, address[] buyTokenAddress, uint256[] sellAmount);
  event RedeemReward(uint256 time, address token, uint amount);
  event RevertRedeem();

  constructor() {
    _disableInitializers();
  }

  function init(
    address _index,
    address _accessController,
    address _exchange,
    address _tokenRegistry,
    address _assetManagerConfig,
    address _vault
  ) external initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();
    address zeroAddress = address(0);
    if (
      _index == zeroAddress ||
      _accessController == zeroAddress ||
      _tokenRegistry == zeroAddress ||
      _exchange == zeroAddress ||
      _assetManagerConfig == zeroAddress ||
      _vault == zeroAddress
    ) {
      revert ErrorLibrary.InvalidAddress();
    }
    index = IIndexSwap(_index);
    accessController = AccessController(_accessController);
    tokenRegistry = ITokenRegistry(_tokenRegistry);
    exchange = IExchange(_exchange);
    WETH = tokenRegistry.getETH();
    assetManagerConfig = IAssetManagerConfig(_assetManagerConfig);
    vault = _vault;
    wETH = IWETH(WETH);
    _contract = address(this);
  }

  modifier onlyAssetManager() {
    if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotAssetManager();
    }
    _;
  }

  modifier onlyIndexManager() {
    if (!(accessController.hasRole(keccak256("INDEX_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotIndexManager();
    }
    _;
  }

  /**
   * @notice The function redeems Reward Token from Vault
   * @param _token address of token to redeem
   * @param _amount amount of token to redeem
   */
  function redeemRewardToken(address _token, uint256 _amount) external virtual nonReentrant onlyAssetManager {
    if (getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (!tokenRegistry.isRewardToken(_token)) {
      revert ErrorLibrary.NotRewardToken();
    }
    exchange._pullFromVaultRewards(_token, _amount, _contract);
    setRedeemed(true);
    emit RedeemReward(block.timestamp, _token, _amount);
  }

  /**
   * @notice The function redeems the token and get back the asset from other protocols
   * @param swapAmounts This is amount of tokens to be redeemed
   * @param token This is the address of the redeeming token
   */
  function redeem(
    uint256 swapAmounts,
    uint256 _lpSlippage,
    address token
  ) external virtual nonReentrant onlyAssetManager {
    _validateProtocolAndRedeemState();
    if (index.getRecord(token).denorm == 0) {
      revert ErrorLibrary.TokenNotIndexToken();
    }
    setPaused(true);
    ITokenRegistry.TokenRecord memory tokenInfo = tokenRegistry.getTokenInformation(token);
    IHandler handler = IHandler(tokenInfo.handler);
    uint256[] memory balanceBefore = RebalanceLibrary.checkUnderlyingBalances(token, handler, _contract);
    exchange._pullFromVault(token, swapAmounts, _contract);
    tokenRedeemed = token;
    address[] memory underlying = handler.getUnderlying(token);
    uint256 swapAmount = swapAmounts;
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
          wETH.deposit{value: _contract.balance}();
        }
      }
    }
    for (uint256 i = 0; i < underlying.length; i++) {
      uint256 balanceAfter = RebalanceLibrary.checkUnderlyingBalance(underlying[i], _contract);
      redeemedAmounts[token].push(balanceAfter.sub(balanceBefore[i]));
    }
    setRedeemed(true);
    emit RebalanceAggregatorRedeem(block.timestamp, swapAmounts, token);
  }

  /**
   * @notice The function swaps tokens using the external swap handlers
   * @param _data This is a struct of params required
   */

  function metaAggregatorSwap(ExchangeData.ExSwapData memory _data) external virtual nonReentrant onlyAssetManager {
    validateSwap(_data.portfolioToken);
    if (getRedeemed() == false) {
      revert ErrorLibrary.NotRedeemed();
    }
    if (!tokenRegistry.isExternalSwapHandler(_data.swapHandler)) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    ITokenRegistry.TokenRecord memory tokenInfo = tokenRegistry.getTokenInformation(_data.portfolioToken);
    IHandler handler = IHandler(tokenInfo.handler);
    uint balanceBefore = handler.getTokenBalance(vault, _data.portfolioToken);

    for (uint256 i = 0; i < _data.callData.length; i++) {
      address buyToken = _data.buyTokenAddress[i];
      address sellToken = _data.sellTokenAddress[i];
      if (buyToken != sellToken) {
        _swap(
          ExchangeData.MetaSwapData(
            _data.sellAmount[i],
            _data.protocolFee[i],
            sellToken,
            buyToken,
            _data.swapHandler,
            _data.callData[i]
          ),
          _contract
        );
      }
    }

    _deposit(_data.portfolioToken, _data._lpSlippage);
    uint256 balanceAfter = handler.getTokenBalance(vault, _data.portfolioToken);
    if (balanceAfter.sub(balanceBefore) == 0) {
      revert ErrorLibrary.SwapFailed();
    }
    address[] memory newTokens = RebalanceLibrary.getNewTokens(getTokens(), _data.portfolioToken);
    RebalanceLibrary.setRecord(index, newTokens, _data.portfolioToken);
    delete redeemedAmounts[tokenRedeemed];
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
  function swapPrimaryToken(ExchangeData.ExSwapData memory inputData) external virtual nonReentrant onlyAssetManager {
    validateSwap(inputData.portfolioToken);
    if (getRedeemed() == true) {
      revert ErrorLibrary.AlreadyOngoingOperation();
    }
    address[] memory tokens = index.getTokens();

    ITokenRegistry.TokenRecord memory tokenInfo = tokenRegistry.getTokenInformation(inputData.portfolioToken);
    IHandler handler = IHandler(tokenInfo.handler);
    uint balanceBefore = handler.getTokenBalance(vault, inputData.portfolioToken);

    for (uint256 i = 0; i < inputData.callData.length; i++) {
      address buyToken = inputData.buyTokenAddress[i];
      address sellToken = inputData.sellTokenAddress[i];
      uint256 sellAmount = inputData.sellAmount[i];
      exchange._pullFromVault(sellToken, sellAmount, _contract);
      if (buyToken != sellToken) {
        _swap(
          ExchangeData.MetaSwapData(
            sellAmount,
            inputData.protocolFee[i],
            sellToken,
            buyToken,
            inputData.swapHandler,
            inputData.callData[i]
          ),
          _contract
        );
      }
    }
    _deposit(inputData.portfolioToken, inputData._lpSlippage);
    uint balanceAfter = handler.getTokenBalance(vault, inputData.portfolioToken);
    if (balanceAfter.sub(balanceBefore) == 0) {
      revert ErrorLibrary.SwapFailed();
    }
    address[] memory newTokens = RebalanceLibrary.getNewTokens(tokens, inputData.portfolioToken);
    RebalanceLibrary.setRecord(index, newTokens, inputData.portfolioToken);
    emit swapPrimaryTokenSwap(
      block.timestamp,
      inputData.sellTokenAddress,
      inputData.buyTokenAddress,
      inputData.sellAmount,
      inputData.protocolFee,
      inputData.portfolioToken,
      newTokens
    );
  }

  function _deposit(address portfolioToken, uint lpSlippage) internal {
    ITokenRegistry.TokenRecord memory tokenInfo = tokenRegistry.getTokenInformation(portfolioToken);
    IHandler handler = IHandler(tokenInfo.handler);
    address[] memory underlying = handler.getUnderlying(portfolioToken);
    uint256[] memory swapAmount = new uint256[](underlying.length);

    // add or not reward token
    if (!tokenInfo.primary) {
      for (uint256 i = 0; i < underlying.length; i++) {
        address _token = underlying[i];
        if (_token == WETH) {
          //If two underlying checks, which one is bnb
          wETH.withdraw(IERC20Upgradeable(WETH).balanceOf(_contract));
          swapAmount[i] = _contract.balance;
        } else {
          swapAmount[i] = IERC20Upgradeable(_token).balanceOf(_contract);

          TransferHelper.safeTransfer(_token, address(handler), swapAmount[i]);
        }
      }
      if (exchange.isWETH(portfolioToken, address(handler))) {
        handler.deposit{value: _contract.balance}(portfolioToken, swapAmount, lpSlippage, vault, vault);
      } else {
        handler.deposit(portfolioToken, swapAmount, lpSlippage, vault, vault);
      }
    } else {
      address _token = underlying[0];
      swapAmount[0] = IERC20Upgradeable(_token).balanceOf(_contract);
      TransferHelper.safeTransfer(_token, vault, swapAmount[0]);
    }
  }

  /**
   * @notice The function internal function used to swap token using offchainHandler
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

  /**
   * @notice Executes a direct swap between tokens.
   * @dev Only the asset manager is allowed to call this function.
   * @param sellTokenAddress Array of token addresses to sell.
   * @param buyTokenAddress Array of token addresses to buy.
   * @param sellAmount Array of amounts to sell for each token.
   * @param slippage Array of slippage values for each token.
   */
  function directSwap(
    address[] memory sellTokenAddress,
    address[] memory buyTokenAddress,
    uint256[] memory sellAmount,
    uint256[] memory slippage
  ) external virtual nonReentrant onlyAssetManager {
    _validateProtocolAndRedeemState();

    // Check if the token arrays have the same length
    if (sellTokenAddress.length != buyTokenAddress.length) {
      revert ErrorLibrary.InvalidTokenLength();
    }

    // Check if the sellAmount array has the correct length
    if (sellTokenAddress.length != sellAmount.length) {
      revert ErrorLibrary.InvalidSellAmount();
    }
    for (uint256 i = 0; i < buyTokenAddress.length; i++) {
      // Validate the buy token address and whitelisting
      address sellToken = sellTokenAddress[i];
      address buyToken = buyTokenAddress[i];
      validateToken(buyToken);

      // Get the handlers for the sell and buy tokens
      ITokenRegistry.TokenRecord memory sellTokenInfo = tokenRegistry.getTokenInformation(sellToken);
      ITokenRegistry.TokenRecord memory buyTokenInfo = tokenRegistry.getTokenInformation(buyToken);
      IHandler sellTokenHandler = IHandler(sellTokenInfo.handler);
      IHandler buyTokenHandler = IHandler(buyTokenInfo.handler);

      // Check token lengths and underlying token equality
      validateTokenLengthAndEquality(sellTokenHandler, buyTokenHandler, sellToken, buyToken);

      // Perform the swap
      executeSwap(
        sellToken,
        buyToken,
        sellAmount[i],
        slippage[i],
        sellTokenHandler,
        buyTokenHandler,
        sellTokenInfo.primary,
        buyTokenInfo.primary
      );
    }

    // Emit an event to indicate the successful direct swap
    emit DirectSwap(block.timestamp, sellTokenAddress, buyTokenAddress, sellAmount);
  }

  /**
   * @notice This is a helper function used to validate the buy token address and whitelisting
   */
  function validateToken(address tokenAddress) internal {
    if (!tokenRegistry.isEnabled(tokenAddress)) {
      revert ErrorLibrary.BuyTokenAddressNotValid();
    }

    if ((assetManagerConfig.whitelistTokens() && !assetManagerConfig.whitelistedToken(tokenAddress))) {
      revert ErrorLibrary.TokenNotWhitelisted();
    }
  }

  /**
   * @notice This is a helper function used to validate token lengths and underlying token equality
   */
  function validateTokenLengthAndEquality(
    IHandler sellTokenHandler,
    IHandler buyTokenHandler,
    address sellTokenAddress,
    address buyTokenAddress
  ) internal view {
    if (
      sellTokenHandler.getUnderlying(sellTokenAddress).length > 1 ||
      buyTokenHandler.getUnderlying(buyTokenAddress).length > 1
    ) {
      revert ErrorLibrary.InvalidTokenLength();
    }

    if (sellTokenHandler.getUnderlying(sellTokenAddress)[0] != buyTokenHandler.getUnderlying(buyTokenAddress)[0]) {
      revert ErrorLibrary.InvalidToken();
    }
  }

  /**
   * @notice This is a helper function used to execute the swap
   */
  function executeSwap(
    address sellTokenAddress,
    address buyTokenAddress,
    uint256 sellAmount,
    uint256 slippage,
    IHandler sellTokenHandler,
    IHandler buyTokenHandler,
    bool sellTokenPrimary,
    bool buyTokenPrimary
  ) internal {
    uint256 balanceBefore = buyTokenHandler.getTokenBalance(vault, buyTokenAddress);

    // Pull the sell token from the vault
    exchange._pullFromVault(sellTokenAddress, sellAmount, _contract);

    // Redeem the sell token if it's not the primary token
    if (!sellTokenPrimary) {
      redeemSellToken(sellTokenAddress, sellAmount, slippage, sellTokenHandler);
    }

    // Determine the deposit amount for the buy token
    uint256[] memory depositAmount = new uint256[](1);
    depositAmount[0] = determineDepositAmount(sellTokenAddress, sellTokenHandler, buyTokenPrimary);

    // Deposit the buy token
    depositBuyToken(buyTokenAddress, depositAmount, slippage, buyTokenHandler);

    // Check if the swap was successful by comparing the balance after with the balance before
    uint256 balanceAfter = buyTokenHandler.getTokenBalance(vault, buyTokenAddress);
    if (balanceAfter <= balanceBefore) {
      revert ErrorLibrary.SwapFailed();
    }

    // Update the record with the new tokens
    address[] memory newTokens = RebalanceLibrary.getNewTokens(getTokens(), buyTokenAddress);
    RebalanceLibrary.setRecord(index, newTokens, buyTokenAddress);
  }

  /**
   * @notice The function reverts back the token to the vault again to old state,if tokens are redeemed after 1st function is executed(redeem)
   * @param _lpSlippage slippage for lpTokens
   */
  function revertRedeem(uint256 _lpSlippage) external nonReentrant onlyAssetManager {
    if (getRedeemed() == false) {
      revert ErrorLibrary.NotRedeemed();
    }
    uint256[] memory amounts = redeemedAmounts[tokenRedeemed];
    _revertRedeem(amounts, _lpSlippage, tokenRedeemed);
    delete redeemedAmounts[tokenRedeemed];
    setRedeemed(false);
    setPaused(false);
    emit RevertRedeem();
  }

  function _revert(uint256 _lpSlippage) internal {
    if (getRedeemed() == false) {
      revert ErrorLibrary.NotRedeemed();
    }
    uint256[] memory amounts = redeemedAmounts[tokenRedeemed];
    _revertRedeem(amounts, _lpSlippage, tokenRedeemed);
    delete redeemedAmounts[tokenRedeemed];
    setRedeemed(false);
    setPaused(false);
    emit RevertRedeem();
  }

  /**
   * @notice The function allows user to revert redeem ,after 15 minutes of pause or lastRebalance is greater then pause
   */
  function revertSellByUser(uint256 _lpSlippage) external nonReentrant {
    uint256 _lastPaused = index.getLastPaused();
    if (block.timestamp >= (_lastPaused + 15 minutes)) {
      _revert(_lpSlippage);
    }
  }

  /**
   * @notice The function reverts back the token to the vault again to old state,used by offchainRebalance contract
   * @param _lpSlippage slippage for lpTokens
   * @param token address of token to revert
   */
  function _revertRebalance(
    uint256[] memory amounts,
    uint256 _lpSlippage,
    address token
  ) external nonReentrant onlyIndexManager {
    _revertRedeem(amounts, _lpSlippage, token);
  }

  /**
   * @notice This internal function reverts back the token to the vault again to old state,if tokens are redeemed after 1st function is executed(redeem)
   * @param _lpSlippage slippage for lpTokens
   */
  function _revertRedeem(uint256[] memory amounts, uint256 _lpSlippage, address token) internal {
    ITokenRegistry.TokenRecord memory tokenInfo = tokenRegistry.getTokenInformation(token);
    if (!tokenInfo.primary) {
      IHandler handler = IHandler(tokenInfo.handler);
      address[] memory underlying = handler.getUnderlying(token);
      //check for WETH
      if (exchange.isWETH(token, address(handler))) {
        //This Library fucntion to determine which of the underlying token is ETH(Mainly for LP) and withdraws the wbnb
        //And give index of non-WETH so that we can transfer that token and give amount of wbnb withdrawn
        (uint256 ethBalance, uint256 _index) = RebalanceLibrary.getEthBalance(WETH, underlying, amounts);
        if (amounts.length > 1) {
          TransferHelper.safeTransfer(underlying[_index], address(handler), amounts[_index]);
        }
        handler.deposit{value: ethBalance}(token, amounts, _lpSlippage, vault, vault);
      } else {
        for (uint i = 0; i < amounts.length; i++) {
          TransferHelper.safeTransfer(underlying[i], address(handler), amounts[i]);
        }
        handler.deposit(token, amounts, _lpSlippage, vault, vault);
      }
    } else {
      TransferHelper.safeTransfer(token, vault, amounts[0]);
    }
  }

  /**
   * @notice This function returns the expected of tokens and address of tokens to sell
   * @param newTokens array of newTokens
   * @param newWeights array of newWeights
   */
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

  /**
   * @notice This is a helper function used to redeem the sell token
   */
  function redeemSellToken(
    address sellTokenAddress,
    uint256 sellAmount,
    uint256 slippage,
    IHandler sellTokenHandler
  ) internal {
    // IERC20Upgradeable sellToken = IERC20Upgradeable(sellTokenAddress);
    TransferHelper.safeTransfer(sellTokenAddress, address(sellTokenHandler), sellAmount);
    sellTokenHandler.redeem(
      FunctionParameters.RedeemData(
        sellAmount,
        slippage,
        _contract,
        sellTokenAddress,
        exchange.isWETH(sellTokenAddress, address(sellTokenHandler))
      )
    );
  }

  /**
   * @notice This is a helper function used to determine the deposit amount for the buy token
   */
  function determineDepositAmount(
    address sellTokenAddress,
    IHandler sellTokenHandler,
    bool isPrimary
  ) internal returns (uint256) {
    address _token = sellTokenHandler.getUnderlying(sellTokenAddress)[0];
    uint256 _balance = IERC20Upgradeable(_token).balanceOf(_contract);
    if (_token == WETH && !isPrimary) {
      // If the sell token's underlying token is WETH and it's not the primary token, withdraw WETH balance
      wETH.withdraw(_balance);
      return _contract.balance;
    } else {
      // Otherwise, use the balance of the underlying token as the deposit amount
      return _balance;
    }
  }

  /**
   * @notice This is a helper function to deposit the buy token
   */
  function depositBuyToken(
    address buyTokenAddress,
    uint256[] memory depositAmount,
    uint256 slippage,
    IHandler buyTokenHandler
  ) internal {
    if (!tokenRegistry.getTokenInformation(buyTokenAddress).primary) {
      // If the buy token is not the primary token
      if (exchange.isWETH(buyTokenAddress, address(buyTokenHandler))) {
        // If the buy token's underlying token is WETH, deposit the entire balance of the contract
        buyTokenHandler.deposit{value: _contract.balance}(buyTokenAddress, depositAmount, slippage, vault, vault);
      } else {
        // Otherwise, transfer the deposit amount of the sell token's underlying token to the buy token handler
        TransferHelper.safeTransfer(
          buyTokenHandler.getUnderlying(buyTokenAddress)[0],
          address(buyTokenHandler),
          depositAmount[0]
        );
        buyTokenHandler.deposit(buyTokenAddress, depositAmount, slippage, vault, vault);
      }
    } else {
      // If the buy token is the primary token and its underlying token is WETH, deposit the entire balance of the contract as WETH
      address _token = buyTokenHandler.getUnderlying(buyTokenAddress)[0];
      if (_token == WETH) {
        wETH.deposit{value: _contract.balance}();
      }
      // Transfer the sell token's underlying token balance to the vault
      TransferHelper.safeTransfer(_token, vault, IERC20Upgradeable(_token).balanceOf(_contract));
    }
  }

  /**
   * @notice This function is used to check the protocol state as well as to validate the buy token address and whitelisting
   */
  function validateSwap(address _token) internal {
    if (getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    validateToken(_token);
  }

  /**
   * @notice This function is used to validate that the protocol is not pause and an already ongoing operation is not in place
   */
  function _validateProtocolAndRedeemState() internal {
    if (getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    // Check if there is an ongoing operation
    if (getRedeemed() == true) {
      revert ErrorLibrary.AlreadyOngoingOperation();
    }
  }

  /**
   * @notice This function returns if the tokens have been redeemed or not
   */
  function getRedeemed() internal view returns (bool) {
    return index.getRedeemed();
  }

  /**
   * @notice This function is used to pause/unpause the protocol state
   */
  function setPaused(bool _state) internal {
    index.setPaused(_state);
  }

  /**
   * @notice This function is used to set the state of the redeem operation
   */
  function setRedeemed(bool _state) internal {
    index.setRedeemed(_state);
  }

  /**
   * @notice This function returns the tokens of the fund
   */
  function getTokens() internal view returns (address[] memory) {
    return index.getTokens();
  }

  /**
   * @notice This function returns the paused/unpaused state of the protocol
   */
  function getProtocolState() internal returns (bool) {
    return tokenRegistry.getProtocolState();
  }

  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
