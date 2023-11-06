// SPDX-License-Identifier: BUSL-1.1

/**
 * @title IndexSwapLibrary for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for all the calculations and also get token balance in vault
 * @dev This contract includes functionalities:
 *      1. Get tokens balance in the vault
 *      2. Calculate the swap amount needed while performing different operation
 */

pragma solidity 0.8.16;

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/interfaces/IERC20Upgradeable.sol";

import {IPriceOracle} from "../oracle/IPriceOracle.sol";
import {IIndexSwap} from "./IIndexSwap.sol";
import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";
import {ITokenRegistry} from "../registry/ITokenRegistry.sol";

import {ISwapHandler} from "../handler/ISwapHandler.sol";
import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";
import {IFeeModule} from "../fee/IFeeModule.sol";

import {IExchange} from "./IExchange.sol";
import {IHandler, FunctionParameters} from "../handler/IHandler.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";

import {IWETH} from "../interfaces/IWETH.sol";

library IndexSwapLibrary {
  /**
     * @notice The function calculates the balance of each token in the vault and converts them to USD and 
               the sum of those values which represents the total vault value in USD
     * @return tokenXBalance A list of the value of each token in the portfolio in USD
     * @return vaultValue The total vault value in USD
     */
  function getTokenAndVaultBalance(
    IIndexSwap _index,
    address[] memory _tokens
  ) internal returns (uint256[] memory, uint256) {
    uint256[] memory tokenBalanceInUSD = new uint256[](_tokens.length);
    uint256 vaultBalance;
    ITokenRegistry registry = ITokenRegistry(_index.tokenRegistry());
    address vault = _index.vault();
    if (_index.totalSupply() > 0) {
      for (uint256 i = 0; i < _tokens.length; i++) {
        address _token = _tokens[i];
        IHandler handler = IHandler(registry.getTokenInformation(_token).handler);
        tokenBalanceInUSD[i] = handler.getTokenBalanceUSD(vault, _token);
        vaultBalance = vaultBalance + tokenBalanceInUSD[i];
      }
      return (tokenBalanceInUSD, vaultBalance);
    } else {
      return (new uint256[](0), 0);
    }
  }

  /**
   * @notice The function calculates the amount in BNB to swap from BNB to each token
   * @dev The amount for each token has to be calculated to ensure the ratio (weight in the portfolio) stays constant
   * @param tokenAmount The amount a user invests into the portfolio
   * @param tokenBalanceInUSD The balanace of each token in the portfolio converted to USD
   * @param vaultBalance The total vault value of all tokens converted to USD
   * @return A list of amounts that are being swapped into the portfolio tokens
   */
  function calculateSwapAmounts(
    IIndexSwap _index,
    uint256 tokenAmount,
    uint256[] memory tokenBalanceInUSD,
    uint256 vaultBalance,
    address[] memory _tokens
  ) internal view returns (uint256[] memory) {
    uint256[] memory amount = new uint256[](_tokens.length);
    if (_index.totalSupply() > 0) {
      for (uint256 i = 0; i < _tokens.length; i++) {
        uint256 balance = tokenBalanceInUSD[i];
        if (balance * tokenAmount < vaultBalance) revert ErrorLibrary.IncorrectInvestmentTokenAmount();
        amount[i] = (balance * tokenAmount) / vaultBalance;
      }
    }
    return amount;
  }

  /**
   * @notice This function transfers the token to swap handler and makes the token to token swap happen
   */
  function transferAndSwapTokenToToken(
    address tokenIn,
    ISwapHandler swapHandler,
    uint256 swapValue,
    uint256 slippage,
    address tokenOut,
    address to,
    bool isEnabled
  ) external returns (uint256 swapResult) {
    TransferHelper.safeTransfer(address(tokenIn), address(swapHandler), swapValue);
    swapResult = swapHandler.swapTokenToTokens(swapValue, slippage, tokenIn, tokenOut, to, isEnabled);
  }

  /**
   * @notice This function transfers the token to swap handler and makes the token to ETH (native BNB) swap happen
   */
  function transferAndSwapTokenToETH(
    address tokenIn,
    ISwapHandler swapHandler,
    uint256 swapValue,
    uint256 slippage,
    address to,
    bool isEnabled
  ) external returns (uint256 swapResult) {
    TransferHelper.safeTransfer(address(tokenIn), address(swapHandler), swapValue);
    swapResult = swapHandler.swapTokensToETH(swapValue, slippage, tokenIn, to, isEnabled);
  }

  /**
   * @notice This function calls the _pullFromVault() function of the IndexSwapLibrary
   */
  function pullFromVault(IExchange _exchange, address _token, uint256 _amount, address _to) external {
    _exchange._pullFromVault(_token, _amount, _to);
  }

  /**
   * @notice This function returns the token balance of the particular contract address
   * @param _token Token whose balance has to be found
   * @param _contract Address of the contract whose token balance is to be retrieved
   * @param _WETH Weth (native) token address
   * @return currentBalance Returns the current token balance of the passed contract address
   */
  function checkBalance(
    address _token,
    address _contract,
    address _WETH
  ) external view returns (uint256 currentBalance) {
    if (_token != _WETH) {
      currentBalance = IERC20Upgradeable(_token).balanceOf(_contract);
      // TransferHelper.safeApprove(_token, address(this), currentBalance);
    } else {
      currentBalance = _contract.balance;
    }
  }

  /**
     * @notice The function calculates the amount of index tokens the user can buy/mint with the invested amount.
     * @param _amount The invested amount after swapping ETH into portfolio tokens converted to USD to avoid 
                      slippage errors
     * @param sumPrice The total value in the vault converted to USD
     * @return Returns the amount of index tokens to be minted.
     */
  function _mintShareAmount(
    uint256 _amount,
    uint256 sumPrice,
    uint256 _indexTokenSupply
  ) external pure returns (uint256) {
    return (_amount * _indexTokenSupply) / sumPrice;
  }

  /**
   * @notice This function helps in multi-asset withdrawal from a portfolio
   */
  function withdrawMultiAssetORWithdrawToken(
    address _tokenRegistry,
    address _exchange,
    address _token,
    uint256 _tokenBalance
  ) external {
    if (_token == ITokenRegistry(_tokenRegistry).getETH()) {
      IExchange(_exchange)._pullFromVault(_token, _tokenBalance, address(this));
      IWETH(ITokenRegistry(_tokenRegistry).getETH()).withdraw(_tokenBalance);
      (bool success, ) = payable(msg.sender).call{value: _tokenBalance}("");
      if (!success) revert ErrorLibrary.ETHTransferFailed();
    } else {
      IExchange(_exchange)._pullFromVault(_token, _tokenBalance, msg.sender);
    }
  }

  /**
   * @notice This function puts some checks before an investment operation
   */
  function beforeInvestment(
    IIndexSwap _index,
    uint256 _slippageLength,
    uint256 _lpSlippageLength,
    address _to
  ) external {
    IAssetManagerConfig _assetManagerConfig = IAssetManagerConfig(_index.iAssetManagerConfig());
    address[] memory _tokens = _index.getTokens();
    if (!(_assetManagerConfig.publicPortfolio() || _assetManagerConfig.whitelistedUsers(_to))) {
      revert ErrorLibrary.UserNotAllowedToInvest();
    }
    if (ITokenRegistry(_index.tokenRegistry()).getProtocolState()) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (_slippageLength != _tokens.length || _lpSlippageLength != _tokens.length) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
    if (_tokens.length == 0) {
      revert ErrorLibrary.NotInitialized();
    }
  }

  /**
   * @notice This function pulls from the vault, sends the tokens to the handler and then redeems it via the handler
   */
  function _pullAndRedeem(
    IExchange _exchange,
    address _token,
    address _to,
    uint256 _amount,
    uint256 _lpSlippage,
    bool isPrimary,
    IHandler _handler
  ) internal {
    if (!isPrimary) {
      _exchange._pullFromVault(_token, _amount, address(_handler));
      _handler.redeem(
        FunctionParameters.RedeemData(_amount, _lpSlippage, _to, _token, _exchange.isWETH(_token, address(_handler)))
      );
    } else {
      _exchange._pullFromVault(_token, _amount, _to);
    }
  }

  /**
   * @notice This function returns the rate of the Index token based on the Vault  and token balance
   */
  function getIndexTokenRate(IIndexSwap _index) external returns (uint256) {
    (, uint256 totalVaultBalance) = getTokenAndVaultBalance(_index, _index.getTokens());
    uint256 _totalSupply = _index.totalSupply();
    if (_totalSupply > 0 && totalVaultBalance > 0) {
      return (totalVaultBalance * (10 ** 18)) / _totalSupply;
    }
    return 10 ** 18;
  }

  /**
   * @notice This function calculates the swap amount for off-chain operations
   */
  function calculateSwapAmountsOffChain(IIndexSwap _index, uint256 tokenAmount) external returns (uint256[] memory) {
    uint256 vaultBalance;
    address[] memory _tokens = _index.getTokens();
    uint256 len = _tokens.length;
    uint256[] memory amount = new uint256[](len);
    uint256[] memory tokenBalanceInUSD = new uint256[](len);
    (tokenBalanceInUSD, vaultBalance) = getTokenAndVaultBalance(_index, _tokens);
    if (_index.totalSupply() == 0) {
      for (uint256 i = 0; i < len; i++) {
        uint256 _denorm = _index.getRecord(_tokens[i]).denorm;
        amount[i] = (tokenAmount * _denorm) / 10_000;
      }
    } else {
      for (uint256 i = 0; i < len; i++) {
        uint256 balance = tokenBalanceInUSD[i];
        if (balance * tokenAmount < vaultBalance) revert ErrorLibrary.IncorrectInvestmentTokenAmount();
        amount[i] = (balance * tokenAmount) / vaultBalance;
      }
    }
    return (amount);
  }

  /**
   * @notice This function applies checks from the asset manager config and token registry side before redeeming
   */
  function beforeRedeemCheck(IIndexSwap _index, uint256 _tokenAmount, address _token, bool _status) external {
    if (_status) {
      revert ErrorLibrary.TokenAlreadyRedeemed();
    }
    if (_tokenAmount > _index.balanceOf(msg.sender)) {
      revert ErrorLibrary.CallerNotHavingGivenTokenAmount();
    }
    address registry = _index.tokenRegistry();
    if (ITokenRegistry(registry).getProtocolState()) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (
      !IAssetManagerConfig(_index.iAssetManagerConfig()).isTokenPermitted(_token) &&
      _token != ITokenRegistry(registry).getETH()
    ) {
      revert ErrorLibrary.InvalidToken();
    }
  }

  /**
   * @notice This function applies checks before withdrawal
   */
  function beforeWithdrawCheck(
    uint256 _slippage,
    uint256 _lpSlippage,
    address token,
    address owner,
    IIndexSwap index,
    uint256 tokenAmount
  ) external {
    ITokenRegistry registry = ITokenRegistry(index.tokenRegistry());
    address[] memory _tokens = index.getTokens();
    if (registry.getProtocolState()) {
      revert ErrorLibrary.ProtocolIsPaused();
    }

    if (!IAssetManagerConfig(index.iAssetManagerConfig()).isTokenPermitted(token) && token != registry.getETH()) {
      revert ErrorLibrary.InvalidToken();
    }

    if (tokenAmount > index.balanceOf(owner)) {
      revert ErrorLibrary.CallerNotHavingGivenTokenAmount();
    }
    if (_slippage != _tokens.length || _lpSlippage != _tokens.length) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
  }

  /**
   * @notice This function checks if the investment value is correct or not
   */
  function _checkInvestmentValue(uint256 _tokenAmount, IAssetManagerConfig _assetManagerConfig) external view {
    uint256 max = _assetManagerConfig.MAX_INVESTMENTAMOUNT();
    uint256 min = _assetManagerConfig.MIN_INVESTMENTAMOUNT();
    if (!(_tokenAmount <= max && _tokenAmount >= min)) {
      revert ErrorLibrary.WrongInvestmentAmount({minInvestment: max, maxInvestment: min});
    }
  }

  /**
   * @notice This function adds sanity check to the fee value as well as the _to address
   */
  function mintAndBurnCheck(
    uint256 _fee,
    address _to,
    address _tokenRegistry,
    address _assetManagerConfig
  ) external returns (bool) {
    return (_fee > 0 &&
      !(_to == IAssetManagerConfig(_assetManagerConfig).assetManagerTreasury() ||
        _to == ITokenRegistry(_tokenRegistry).velvetTreasury()));
  }

  /**
   * @notice This function checks if the token is permitted or not and if the token balance is optimum or not
   */
  function _checkPermissionAndBalance(
    address _token,
    uint256 _tokenAmount,
    IAssetManagerConfig _config,
    address _to
  ) external {
    if (!_config.isTokenPermitted(_token)) {
      revert ErrorLibrary.InvalidToken();
    }
    if (IERC20Upgradeable(_token).balanceOf(_to) < _tokenAmount) {
      revert ErrorLibrary.LowBalance();
    }
  }

  /**
   * @notice This function takes care of the checks required before init of the index
   */
  function _beforeInitCheck(IIndexSwap index, address token, uint96 denorm) external {
    IAssetManagerConfig config = IAssetManagerConfig(index.iAssetManagerConfig());
    if ((config.whitelistTokens() && !config.whitelistedToken(token))) {
      revert ErrorLibrary.TokenNotWhitelisted();
    }
    if (denorm <= 0) {
      revert ErrorLibrary.InvalidDenorms();
    }
    if (token == address(0)) {
      revert ErrorLibrary.InvalidTokenAddress();
    }
    if (!(ITokenRegistry(index.tokenRegistry()).isEnabled(token))) {
      revert ErrorLibrary.TokenNotApproved();
    }
  }

  /**
   * @notice The function converts the given token amount into USD
   * @param t The base token being converted to USD
   * @param amount The amount to convert to USD
   * @return amountInUSD The converted USD amount
   */
  function _getTokenAmountInUSD(
    address _oracle,
    address t,
    uint256 amount
  ) external view returns (uint256 amountInUSD) {
    amountInUSD = IPriceOracle(_oracle).getPriceTokenUSD18Decimals(t, amount);
  }

  /**
   * @notice The function calculates the balance of a specific token in the vault
   * @return tokenBalance of the specific token
   */
  function getTokenBalance(IIndexSwap _index, address t) external view returns (uint256 tokenBalance) {
    IHandler handler = IHandler(ITokenRegistry(_index.tokenRegistry()).getTokenInformation(t).handler);
    tokenBalance = handler.getTokenBalance(_index.vault(), t);
  }

  /**
   * @notice This function checks if the token is primary and also if the external swap handler is valid
   */
  function checkPrimaryAndHandler(ITokenRegistry registry, address[] calldata tokens, address handler) external view {
    if (!(registry.isExternalSwapHandler(handler))) {
      revert ErrorLibrary.OffHandlerNotValid();
    }
    for (uint i = 0; i < tokens.length; i++) {
      if (!registry.getTokenInformation(tokens[i]).primary) {
        revert ErrorLibrary.NotPrimaryToken();
      }
    }
  }

  /**
   * @notice This function makes the necessary checks before an off-chain withdrawal
   */
  function beforeWithdrawOffChain(bool status, ITokenRegistry tokenRegistry, address handler) external {
    if (tokenRegistry.getProtocolState()) {
      revert ErrorLibrary.ProtocolIsPaused();
    }

    if (!status) {
      revert ErrorLibrary.TokensNotRedeemed();
    }
    if (!(tokenRegistry.isExternalSwapHandler(handler))) {
      revert ErrorLibrary.OffHandlerNotValid();
    }
  }

  /**
   * @notice This function charges the fees from the index via the Fee Module
   */
  function chargeFees(IIndexSwap index, IFeeModule feeModule) external returns (uint256 vaultBalance) {
    (, vaultBalance) = getTokenAndVaultBalance(index, index.getTokens());
    feeModule.chargeFeesFromIndex(vaultBalance);
  }

  /**
   * @notice This function gets the underlying balances of the input token
   */
  function getUnderlyingBalances(
    address _token,
    IHandler _handler,
    address _contract
  ) external view returns (uint256[] memory) {
    address[] memory underlying = _handler.getUnderlying(_token);
    uint256[] memory balances = new uint256[](underlying.length);
    for (uint256 i = 0; i < underlying.length; i++) {
      balances[i] = IERC20Upgradeable(underlying[i]).balanceOf(_contract);
    }
    return balances;
  }

  /// @notice Calculate lockup cooldown applied to the investor after pool deposit
  /// @param _currentUserBalance Investor's current pool tokens balance
  /// @param _mintedLiquidity Liquidity to be minted to investor after pool deposit
  /// @param _currentCooldownTime New cooldown lockup time
  /// @param _oldCooldownTime Last cooldown lockup time applied to investor
  /// @param _lastDepositTimestamp Timestamp when last pool deposit happened
  /// @return cooldown New lockup cooldown to be applied to investor address
  function calculateCooldownPeriod(
    uint256 _currentUserBalance,
    uint256 _mintedLiquidity,
    uint256 _currentCooldownTime,
    uint256 _oldCooldownTime,
    uint256 _lastDepositTimestamp
  ) external view returns (uint256 cooldown) {
    // Get timestamp when current cooldown ends
    uint256 prevCooldownEnd = _lastDepositTimestamp + _oldCooldownTime;
    // Current exit remaining cooldown
    uint256 prevCooldownRemaining = prevCooldownEnd < block.timestamp ? 0 : prevCooldownEnd - block.timestamp;
    // If it's first deposit with zero liquidity, no cooldown should be applied
    if (_currentUserBalance == 0 && _mintedLiquidity == 0) {
      cooldown = 0;
      // If it's first deposit, new cooldown should be applied
    } else if (_currentUserBalance == 0) {
      cooldown = _currentCooldownTime;
      // If zero liquidity or new cooldown reduces remaining cooldown, apply remaining
    } else if (_mintedLiquidity == 0 || _currentCooldownTime < prevCooldownRemaining) {
      cooldown = prevCooldownRemaining;
      // For the rest cases calculate cooldown based on current balance and liquidity minted
    } else {
      // If the user already owns liquidity, the additional lockup should be in proportion to their existing liquidity.
      // Aggregate additional and remaining cooldowns
      uint256 balanceBeforeMint = _currentUserBalance - _mintedLiquidity;
      uint256 averageCooldown = (_mintedLiquidity * _currentCooldownTime + balanceBeforeMint * prevCooldownRemaining) /
        _currentUserBalance;
      // Resulting value is capped at new cooldown time (shouldn't be bigger) and falls back to one second in case of zero
      cooldown = averageCooldown > _currentCooldownTime ? _currentCooldownTime : averageCooldown != 0
        ? averageCooldown
        : 1;
    }
  }
}