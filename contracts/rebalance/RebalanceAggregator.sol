// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
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
  IIndexSwap internal index;

  AccessController internal accessController;
  IAssetManagerConfig internal assetManagerConfig;
  ITokenRegistry internal tokenRegistry;
  IExchange internal exchange;

  address internal WETH;
  address internal vault;
  address internal tokenRedeemed;
  address internal _contract;
  mapping(address => uint256[]) public redeemedAmounts;
  IWETH public wETH;

  event MetaAggregatorSwap(
    address[] sellTokenAddress,
    address[] buyTokenAddress,
    uint256[] sellAmount,
    address indexed portfolioToken,
    address[] newTokens
  );

  event swapPrimaryTokenSwap(
    address[] sellTokenAddress,
    address[] buyTokenAddress,
    uint256[] sellAmount,
    address indexed portfolioToken,
    address[] newTokens
  );

  event RebalanceAggregatorRedeem(uint256 indexed swapAmounts, address indexed token);
  event DirectSwap(address[] sellTokenAddress, address[] buyTokenAddress, uint256[] sellAmount);
  event RedeemReward(address token, uint amount);
  event RevertRedeem(uint indexed time);

  constructor() {
    _disableInitializers();
  }

  /**
   * @notice This function is used to initialise the Rebalance Aggregator module while deployment
   */
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
    __ReentrancyGuard_init();
    if (
      _index == address(0) ||
      _accessController == address(0) ||
      _tokenRegistry == address(0) ||
      _exchange == address(0) ||
      _assetManagerConfig == address(0) ||
      _vault == address(0)
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
    if (!(_checkRole("ASSET_MANAGER_ROLE", msg.sender))) {
      revert ErrorLibrary.CallerNotAssetManager();
    }
    _;
  }

  modifier onlyIndexManager() {
    if (!(_checkRole("INDEX_MANAGER_ROLE", msg.sender))) {
      revert ErrorLibrary.CallerNotIndexManager();
    }
    _;
  }

  /**
   * @notice The function swaps reward token from vault to index token
   * @param inputData This is a struct of params required
   */
  function swapRewardToken(ExchangeData.ExSwapData memory inputData) external virtual nonReentrant onlyAssetManager {
    if (getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    address sellToken = inputData.sellTokenAddress[0];
    if (!tokenRegistry.isRewardToken(sellToken)) {
      revert ErrorLibrary.NotRewardToken();
    }
    if (getRedeemed() == true) {
      revert ErrorLibrary.AlreadyOngoingOperation();
    }
    if (getDenorm(inputData.portfolioToken) == 0) {
      revert ErrorLibrary.TokenNotIndexToken();
    }
    _swapAndDeposit(inputData);
    emit RedeemReward(sellToken, inputData.sellAmount[0]);
  }

  /**
   * @notice The function redeems the token and get back the asset from other protocols
   * @param swapAmounts This is amount of tokens to be redeemed
   * @param _lpSlippage Array of lp slippage values passed
   * @param token This is the address of the redeeming token
   */
  function redeem(
    uint256 swapAmounts,
    uint256 _lpSlippage,
    address token
  ) external virtual nonReentrant onlyAssetManager {
    _validateProtocolAndRedeemState();
    if (getDenorm(token) == 0) {
      revert ErrorLibrary.TokenNotIndexToken();
    }
    setPaused(true);
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(token);
    IHandler handler = IHandler(tokenInfo.handler);
    uint256[] memory balanceBefore = RebalanceLibrary.getUnderlyingBalances(token, handler, _contract);
    _pullFromVault(token, swapAmounts, _contract);
    tokenRedeemed = token;
    address[] memory underlying = getUnderlying(handler, token);
    uint256 swapAmount = swapAmounts;
    if (!tokenInfo.primary) {
      TransferHelper.safeTransfer(token, address(handler), swapAmount);
      handler.redeem(
        FunctionParameters.RedeemData(swapAmount, _lpSlippage, _contract, token, isWETH(token, address(handler)))
      );
      for (uint256 j = 0; j < underlying.length; j++) {
        if (underlying[j] == WETH) {
          wETH.deposit{value: _contract.balance}();
        }
      }
    }
    for (uint256 i = 0; i < underlying.length; i++) {
      uint256 balanceAfter = getBalance(underlying[i], _contract);
      redeemedAmounts[token].push(balanceAfter - balanceBefore[i]);
    }
    setRedeemed(true);
    emit RebalanceAggregatorRedeem(swapAmounts, token);
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
    if (!isExternalSwapHandler(_data.swapHandler)) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(_data.portfolioToken);
    IHandler handler = IHandler(tokenInfo.handler);
    uint balanceBefore = handler.getTokenBalance(vault, _data.portfolioToken);

    ITokenRegistry.TokenRecord memory tokenInfo2 = getTokenInfo(tokenRedeemed);
    IHandler handlerRedeem = IHandler(tokenInfo2.handler);

    address[] memory buyTokenUnderlying = handler.getUnderlying(_data.portfolioToken);
    address[] memory sellTokenUnderlying = handlerRedeem.getUnderlying(tokenRedeemed);

    RebalanceLibrary.verifyAddress(
      sellTokenUnderlying,
      buyTokenUnderlying,
      _data.sellTokenAddress,
      _data.buyTokenAddress
    );

    if (sellTokenUnderlying.length == 1 && buyTokenUnderlying.length == 2) {
      checkValuesForMetaAggregatorSwap(_data.sellAmount, sellTokenUnderlying[0]);
    }

    for (uint256 i = 0; i < _data.callData.length; i++) {
      address buyToken = _data.buyTokenAddress[i];
      address sellToken = _data.sellTokenAddress[i];
      if (buyToken != sellToken) {
        _swap(
          ExchangeData.MetaSwapData(_data.sellAmount[i], sellToken, buyToken, _data.swapHandler, _data.callData[i]),
          _contract
        );
      }
    }
    _deposit(_data.portfolioToken, _data._lpSlippage);

    for (uint i = 0; i < sellTokenUnderlying.length; i++) {
      if (IERC20Upgradeable(sellTokenUnderlying[i]).balanceOf(address(this)) != 0) {
        revert ErrorLibrary.InvalidSellAmount();
      }
    }
    uint256 balanceAfter = handler.getTokenBalance(vault, _data.portfolioToken);
    if (balanceAfter - balanceBefore == 0) {
      revert ErrorLibrary.SwapFailed();
    }
    address[] memory newTokens = RebalanceLibrary.getNewTokens(getTokens(), _data.portfolioToken);
    RebalanceLibrary.setRecord(index, newTokens, _data.portfolioToken);
    delete redeemedAmounts[tokenRedeemed];
    emit MetaAggregatorSwap(
      _data.sellTokenAddress,
      _data.buyTokenAddress,
      _data.sellAmount,
      _data.portfolioToken,
      newTokens
    );
  }

  /**
   * @notice The function is used for only base token prtfolio, used to redeem and swap base token
   * @param inputData address of sellToken,buyToken,swpaHandler, amount of sellAmout and callData in struct
   */
  function swapPrimaryToken(ExchangeData.ExSwapData memory inputData) external virtual nonReentrant onlyAssetManager {
    validateSwap(inputData.portfolioToken);
    if (getRedeemed() == true) {
      revert ErrorLibrary.AlreadyOngoingOperation();
    }
    if (getTokenInfo(inputData.sellTokenAddress[0]).primary == false) {
      revert ErrorLibrary.NotPrimaryToken();
    }

    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(inputData.portfolioToken);
    IHandler handlerBuyToken = IHandler(tokenInfo.handler);

    ITokenRegistry.TokenRecord memory tokenInfo2 = getTokenInfo(inputData.sellTokenAddress[0]);
    IHandler handlerSellToken = IHandler(tokenInfo2.handler);

    address[] memory buyTokenUnderlying = handlerBuyToken.getUnderlying(inputData.portfolioToken);
    address[] memory sellTokenUnderlying = handlerSellToken.getUnderlying(inputData.sellTokenAddress[0]);

    if (sellTokenUnderlying.length == 1 && buyTokenUnderlying.length == 2) {
      checkValuesForSwapPrimary(inputData.sellAmount, sellTokenUnderlying[0]);
    }

    address[] memory tokens = index.getTokens();
    _swapAndDeposit(inputData);
    address[] memory newTokens = RebalanceLibrary.getNewTokens(tokens, inputData.portfolioToken);
    RebalanceLibrary.setRecord(index, newTokens, inputData.portfolioToken);
    emit swapPrimaryTokenSwap(
      inputData.sellTokenAddress,
      inputData.buyTokenAddress,
      inputData.sellAmount,
      inputData.portfolioToken,
      newTokens
    );
  }

  function _swapAndDeposit(ExchangeData.ExSwapData memory inputData) internal {
    if (!isExternalSwapHandler(inputData.swapHandler)) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(inputData.portfolioToken);
    IHandler handler = IHandler(tokenInfo.handler);
    uint balanceBefore = getTokenBalance(handler, vault, inputData.portfolioToken);
    for (uint256 i = 0; i < inputData.callData.length; i++) {
      address buyToken = inputData.buyTokenAddress[i];
      address sellToken = inputData.sellTokenAddress[i];
      uint256 sellAmount = inputData.sellAmount[i];
      _pullFromVault(sellToken, sellAmount, _contract);
      if (buyToken != sellToken) {
        _swap(
          ExchangeData.MetaSwapData(sellAmount, sellToken, buyToken, inputData.swapHandler, inputData.callData[i]),
          _contract
        );
      }
    }
    _deposit(inputData.portfolioToken, inputData._lpSlippage);
    uint balanceAfter = getTokenBalance(handler, vault, inputData.portfolioToken);
    if (balanceAfter - balanceBefore == 0) {
      revert ErrorLibrary.SwapFailed();
    }
  }

  function _deposit(address portfolioToken, uint lpSlippage) internal {
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(portfolioToken);
    IHandler handler = IHandler(tokenInfo.handler);
    address[] memory underlying = getUnderlying(handler, portfolioToken);
    uint256[] memory swapAmount = new uint256[](underlying.length);

    // add or not reward token
    if (!tokenInfo.primary) {
      for (uint256 i = 0; i < underlying.length; i++) {
        address _token = underlying[i];
        if (_token == WETH) {
          //If two underlying checks, which one is bnb
          wETH.withdraw(getBalance(WETH, _contract));
          swapAmount[i] = _contract.balance;
        } else {
          swapAmount[i] = getBalance(_token, _contract);

          TransferHelper.safeTransfer(_token, address(handler), swapAmount[i]);
        }
      }
      if (isWETH(portfolioToken, address(handler))) {
        handler.deposit{value: _contract.balance}(portfolioToken, swapAmount, lpSlippage, vault, vault);
      } else {
        handler.deposit(portfolioToken, swapAmount, lpSlippage, vault, vault);
      }
    } else {
      address _token = underlying[0];
      swapAmount[0] = getBalance(_token, _contract);
      TransferHelper.safeTransfer(_token, vault, swapAmount[0]);
    }
  }

  /**
   * @notice The function internal function used to swap token using offchainHandler
   * @param inputData address of sellToken,buyToken,swpaHandler, amount of sellAmout and callData in struct
   * @param _to address to whom token should be send
   */
  function _swap(ExchangeData.MetaSwapData memory inputData, address _to) internal {
    TransferHelper.safeTransfer(inputData.sellTokenAddress, inputData.swapHandler, inputData.sellAmount);
    IExternalSwapHandler(inputData.swapHandler).swap(
      inputData.sellTokenAddress,
      inputData.buyTokenAddress,
      inputData.sellAmount,
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
      ITokenRegistry.TokenRecord memory sellTokenInfo = getTokenInfo(sellToken);
      ITokenRegistry.TokenRecord memory buyTokenInfo = getTokenInfo(buyToken);
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
    emit DirectSwap(sellTokenAddress, buyTokenAddress, sellAmount);
  }

  /**
   * @notice This is a helper function used to validate the buy token address and whitelisting
   * @param tokenAddress Address of the token to be validated
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
   * @param sellTokenHandler IHandler interface of the sell token
   * @param buyTokenHandler IHandler interface of the buy token
   * @param sellTokenAddress Address of the sell token
   * @param buyTokenAddress Address of the buy token
   */
  function validateTokenLengthAndEquality(
    IHandler sellTokenHandler,
    IHandler buyTokenHandler,
    address sellTokenAddress,
    address buyTokenAddress
  ) internal view {
    if (
      getUnderlying(sellTokenHandler, sellTokenAddress).length > 1 ||
      getUnderlying(buyTokenHandler, buyTokenAddress).length > 1
    ) {
      revert ErrorLibrary.InvalidTokenLength();
    }

    if (getUnderlying(sellTokenHandler, sellTokenAddress)[0] != getUnderlying(buyTokenHandler, buyTokenAddress)[0]) {
      revert ErrorLibrary.InvalidToken();
    }
  }

  /**
   * @notice This is a helper function used to execute the swap
   * @param sellTokenAddress Address of the sell token
   * @param buyTokenAddress Address of the buy token
   * @param sellAmount The amount of tokens to be sold
   * @param sellTokenHandler IHandler interface of the sell token
   * @param buyTokenHandler IHandler interface of the buy token
   * @param sellTokenPrimary Boolean parameter for is the sell token primary
   * @param buyTokenPrimary Boolean parameter for is the buy token primary
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
    uint256 balanceBefore = getTokenBalance(buyTokenHandler, vault, buyTokenAddress);

    // Pull the sell token from the vault
    _pullFromVault(sellTokenAddress, sellAmount, _contract);

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
    uint256 balanceAfter = getTokenBalance(buyTokenHandler, vault, buyTokenAddress);
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
    _revert(_lpSlippage);
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
    emit RevertRedeem(block.timestamp);
  }

  /**
   * @notice The function allows user to revert redeem ,after 15 minutes of pause or lastRebalance is greater then pause
   * @param _lpSlippage slippage for lpTokens
   */
  function revertSellByUser(uint256 _lpSlippage) external nonReentrant {
    uint256 _lastPaused = index.getLastPaused();
    if (getTimeStamp() < (_lastPaused + 15 minutes) || !index.paused()) {
      revert ErrorLibrary.FifteenMinutesNotExcedeed();
    }
    _revert(_lpSlippage);
  }

  /**
   * @notice The function reverts back the token to the vault again to old state,used by offchainRebalance contract
   * @param amounts Array of amounts passed to the function
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
   * @param amounts Array of amounts passed to the function
   * @param _lpSlippage slippage for lpTokens
   * @param token Token address in picture
   */
  function _revertRedeem(uint256[] memory amounts, uint256 _lpSlippage, address token) internal {
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(token);
    if (!tokenInfo.primary) {
      IHandler handler = IHandler(tokenInfo.handler);
      address[] memory underlying = getUnderlying(handler, token);
      //check for WETH
      if (isWETH(token, address(handler))) {
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
   * @param sellTokenAddress Address of the sell token
   * @param sellAmount Amount of the token to be redeemed
   * @param slippage Value of slippage passed
   * @param sellTokenHandler IHandler interface of the token in picture
   */
  function redeemSellToken(
    address sellTokenAddress,
    uint256 sellAmount,
    uint256 slippage,
    IHandler sellTokenHandler
  ) internal {
    TransferHelper.safeTransfer(sellTokenAddress, address(sellTokenHandler), sellAmount);
    sellTokenHandler.redeem(
      FunctionParameters.RedeemData(
        sellAmount,
        slippage,
        _contract,
        sellTokenAddress,
        isWETH(sellTokenAddress, address(sellTokenHandler))
      )
    );
  }

  /**
   * @notice This is a helper function used to determine the deposit amount for the buy token
   * @param sellTokenAddress Address of the sell token
   * @param sellTokenHandler IHandler interface of the token that is to be sold
   * @param isPrimary Boolean parameter for is the token primary or not
   * @return Final deposit amount
   */
  function determineDepositAmount(
    address sellTokenAddress,
    IHandler sellTokenHandler,
    bool isPrimary
  ) internal returns (uint256) {
    address _token = getUnderlying(sellTokenHandler, sellTokenAddress)[0];
    uint256 _balance = getBalance(_token, _contract);
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
   * @param buyTokenAddress Address of the buy token
   * @param depositAmount Amount to be deposited (passed as an array)
   * @param slippage Value of the slippage passed
   * @param buyTokenHandler IHandler instance of the token that is to be bought
   */
  function depositBuyToken(
    address buyTokenAddress,
    uint256[] memory depositAmount,
    uint256 slippage,
    IHandler buyTokenHandler
  ) internal {
    if (!getTokenInfo(buyTokenAddress).primary) {
      // If the buy token is not the primary token
      if (isWETH(buyTokenAddress, address(buyTokenHandler))) {
        // If the buy token's underlying token is WETH, deposit the entire balance of the contract
        buyTokenHandler.deposit{value: _contract.balance}(buyTokenAddress, depositAmount, slippage, vault, vault);
      } else {
        // Otherwise, transfer the deposit amount of the sell token's underlying token to the buy token handler
        TransferHelper.safeTransfer(
          getUnderlying(buyTokenHandler, buyTokenAddress)[0],
          address(buyTokenHandler),
          depositAmount[0]
        );
        buyTokenHandler.deposit(buyTokenAddress, depositAmount, slippage, vault, vault);
      }
    } else {
      // If the buy token is the primary token and its underlying token is WETH, deposit the entire balance of the contract as WETH
      address _token = getUnderlying(buyTokenHandler, buyTokenAddress)[0];
      if (_token == WETH) {
        wETH.deposit{value: _contract.balance}();
      }
      // Transfer the sell token's underlying token balance to the vault
      TransferHelper.safeTransfer(_token, vault, getBalance(_token, _contract));
    }
  }

  /**
   * @notice This function is used to check the protocol state as well as to validate the buy token address and whitelisting
   * @param _token Address of the token in picture
   */
  function validateSwap(address _token) internal {
    if (getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    validateToken(_token);
  }

  /**
   * @notice The function is used to check user's input values for swap in metaAggregatorSwap function
   * @param sellAmount This is input sell token amounts form user
   * @param sellToken The address of sell token
   */
  function checkValuesForMetaAggregatorSwap(uint[] memory sellAmount, address sellToken) internal view {
    uint balance = getBalance(sellToken, address(this));
    balanceCheck(balance, sellAmount);
  }

  /**
   * @notice The function is used to check user's input values for swap in swapPrimary function
   * @param sellAmount This is input sell token amounts form user
   * @param sellToken The address of sell token
   */
  function checkValuesForSwapPrimary(uint[] memory sellAmount, address sellToken) internal view {
    uint balance = sellAmount[0] + sellAmount[1];
    if (balance > getBalance(sellToken, vault)) {
      revert ErrorLibrary.InvalidSellAmount();
    }
    balanceCheck(balance, sellAmount);
  }

  /**
   * @notice The function is used to check values for swap in swapPrimary function
   * @param sellAmount This is input sell token amounts form user
   * @param balance The balance calculated from before
   */
  function balanceCheck(uint balance, uint[] memory sellAmount) internal pure {
    uint bal1 = balance / 2;
    uint bal2 = balance - bal1;
    if (bal1 != sellAmount[0] || bal2 != sellAmount[1]) {
      revert ErrorLibrary.InvalidSellAmount();
    }
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
   * @return Return the redeemed state of the index
   */
  function getRedeemed() internal view returns (bool) {
    return index.getRedeemed();
  }

  /**
   * @notice This function is used to pause/unpause the protocol state
   * @param _state Boolean parameter to set the paused/unpaused state
   */
  function setPaused(bool _state) internal {
    index.setPaused(_state);
  }

  /**
   * @notice This function is used to set the state of the redeem operation
   * @param _state Boolean parameter to set the redeemed state
   */
  function setRedeemed(bool _state) internal {
    index.setRedeemed(_state);
  }

  /**
   * @notice This function returns the tokens of the fund
   * @return Array of portfolio token addresses
   */
  function getTokens() internal view returns (address[] memory) {
    return index.getTokens();
  }

  /**
   * @notice This function returns the paused/unpaused state of the protocol
   * @return State of the protocol is returned as a boolean parameter
   */
  function getProtocolState() internal returns (bool) {
    return tokenRegistry.getProtocolState();
  }

  /**
   * @notice This function returns denorm for particular token
   * @param token Address of token whose denorm is to be obtained
   * @return Value of the denorm
   */
  function getDenorm(address token) internal view returns (uint256) {
    return index.getRecord(token).denorm;
  }

  /**
   * @notice This function returns whether externalSwapHandler is enabled or not
   * @param handler Address of the handler which has to be checked
   * @return Boolean parameter about the state of the handler
   */
  function isExternalSwapHandler(address handler) internal view returns (bool) {
    return tokenRegistry.isExternalSwapHandler(handler);
  }

  /**
   * @notice This internal returns token information
   * @param _token Address of the token to get the token information
   * @return TokenRecord instance of token's information
   */
  function getTokenInfo(address _token) internal view returns (ITokenRegistry.TokenRecord memory) {
    return tokenRegistry.getTokenInformation(_token);
  }

  /**
   * @notice This internal returns whether the token has any eth underlying or not
   * @param token Address of the token whose derivative is to be checked
   * @param handler Address of the handler of the specific token
   */
  function isWETH(address token, address handler) internal view returns (bool) {
    return exchange.isWETH(token, handler);
  }

  /**
   * @notice This internal function returns balance of token
   * @param _token Address of the token
   * @param _of Address of the user whose balance is to be checked
   * @return Token balance of the specified address
   */
  function getBalance(address _token, address _of) internal view returns (uint256) {
    return IERC20Upgradeable(_token).balanceOf(_of);
  }

  /**
   * @notice This internal function check for role
   * @param user Address of the user to be checked for the role
   * @param _role Role to be checked for
   * @return Boolean parameter for if the user has the specific role
   */
  function _checkRole(bytes memory _role, address user) internal view returns (bool) {
    return accessController.hasRole(keccak256(_role), user);
  }

  /**
   * @notice This function returns underlying tokens for given _token
   */
  function getUnderlying(IHandler handler, address _token) internal view returns (address[] memory) {
    return handler.getUnderlying(_token);
  }

  /**
   * @notice This function returns token balance of given address
   */
  function getTokenBalance(IHandler handler, address _of, address _token) internal view returns (uint256) {
    return handler.getTokenBalance(_of, _token);
  }

  /**
   * @notice This function pulls from vault
   */
  function _pullFromVault(address token, uint256 swapAmounts, address _to) internal {
    exchange._pullFromVault(token, swapAmounts, _to);
  }

  /**
   * @notice This function returns timeStamp
   */
  function getTimeStamp() internal view returns (uint256) {
    return block.timestamp;
  }

  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
