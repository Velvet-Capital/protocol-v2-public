// SPDX-License-Identifier: MIT

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
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";

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
  using SafeMathUpgradeable for uint256;

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
    uint256 vaultBalance = 0;
    ITokenRegistry registry = ITokenRegistry(_index.tokenRegistry());
    address vault = _index.vault();
    if (_index.totalSupply() > 0) {
      for (uint256 i = 0; i < _tokens.length; i++) {
        uint256[] memory tokenBalance;
        uint256 tokenBalanceUSD;
        address _token = _tokens[i];
        IHandler handler = IHandler(registry.getTokenInformation(_token).handler);
        address[] memory underlying = handler.getUnderlying(_token);
        if (underlying.length > 1) {
          tokenBalanceUSD = handler.getFairLpPrice(vault, _token);
        } else {
          tokenBalance = handler.getUnderlyingBalance(vault, _token);
          tokenBalanceUSD += IPriceOracle(_index.oracle()).getPriceTokenUSD18Decimals(underlying[0], tokenBalance[0]);
        }
        tokenBalanceInUSD[i] = tokenBalanceUSD;
        vaultBalance = vaultBalance.add(tokenBalanceUSD);
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
        require(balance.mul(tokenAmount) >= vaultBalance, "incorrect token amount");
        amount[i] = balance.mul(tokenAmount).div(vaultBalance);
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
    address to
  ) external returns (uint256 swapResult) {
    TransferHelper.safeTransfer(address(tokenIn), address(swapHandler), swapValue);
    swapResult = swapHandler.swapTokenToTokens(swapValue, slippage, tokenIn, tokenOut, to);
  }

  /**
   * @notice This function transfers the token to swap handler and makes the token to ETH (native BNB) swap happen
   */
  function transferAndSwapTokenToETH(
    address tokenIn,
    ISwapHandler swapHandler,
    uint256 swapValue,
    uint256 slippage,
    address to
  ) external returns (uint256 swapResult) {
    TransferHelper.safeTransfer(address(tokenIn), address(swapHandler), swapValue);
    swapResult = swapHandler.swapTokensToETH(swapValue, slippage, tokenIn, to);
  }

  /**
   * @notice This function calls the _pullFromVault() function of the IndexSwapLibrary
   */
  function pullFromVault(IExchange _exchange, address _token, uint256 _amount, address _to) external {
    _exchange._pullFromVault(_token, _amount, _to);
  }

  /**
     * @notice The function calculates the amount of index tokens the user can buy/mint with the invested amount.
     * @param _amount The invested amount after swapping ETH into portfolio tokens converted to BNB to avoid 
                      slippage errors
     * @param sumPrice The total value in the vault converted to BNB
     * @return Returns the amount of index tokens to be minted.
     */
  function _mintShareAmount(
    uint256 _amount,
    uint256 sumPrice,
    uint256 _indexTokenSupply
  ) external pure returns (uint256) {
    return _amount.mul(_indexTokenSupply).div(sumPrice);
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
      require(success, "Transfer ETH failed");
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
    if (ITokenRegistry(_index.tokenRegistry()).getProtocolState() == true) {
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
   * @notice This function transfers the tokens to the offChain handler and makes the external swap possible
   */
  function _transferAndSwapUsingOffChainHandler(
    address _sellToken,
    address _buyToken,
    uint256 transferAmount,
    address _to,
    bytes memory _swapData,
    address _offChainHandler,
    uint256 _protocolFee
  ) internal {
    TransferHelper.safeTransfer(_sellToken, _offChainHandler, transferAmount);
    IExternalSwapHandler(_offChainHandler).swap(_sellToken, _buyToken, transferAmount, _protocolFee, _swapData, _to);
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
    _exchange._pullFromVault(_token, _amount, _to);
    if (!isPrimary) {
      TransferHelper.safeTransfer(_token, address(_handler), _amount);
      _handler.redeem(
        FunctionParameters.RedeemData(_amount, _lpSlippage, _to, _token, _exchange.isWETH(_token, address(_handler)))
      );
    }
  }

  /**
   * @notice This function returns the rate of the Index token based on the Vault  and token balance
   */
  function getIndexTokenRateBNB(IIndexSwap _index) external returns (uint256) {
    (, uint256 totalVaultBalance) = getTokenAndVaultBalance(_index, _index.getTokens());
    uint256 vaultBalanceInBNB = IPriceOracle(_index.oracle()).getUsdEthPrice(totalVaultBalance);
    uint256 _totalSupply = _index.totalSupply();
    if (_totalSupply > 0 && totalVaultBalance > 0) {
      return (vaultBalanceInBNB.mul(10 ** 18)).div(_totalSupply);
    }
    return 10 ** 18;
  }

  /**
   * @notice This function returns the rate of the Index token based on the Vault  and token balance
   */
  function getIndexTokenRate(IIndexSwap _index) external returns (uint256) {
    (, uint256 totalVaultBalance) = getTokenAndVaultBalance(_index, _index.getTokens());
    uint256 _totalSupply = _index.totalSupply();
    if (_totalSupply > 0 && totalVaultBalance > 0) {
      return (totalVaultBalance.mul(10 ** 18)).div(_totalSupply);
    }
    return 0;
  }

  /**
   * @notice This function calculates the swap amount for off-chain operations
   */
  function calculateSwapAmountsOffChain(IIndexSwap _index, uint256 tokenAmount) external returns (uint256[] memory) {
    uint256 vaultBalance = 0;
    address[] memory _tokens = _index.getTokens();
    uint256 len = _tokens.length;
    uint256[] memory amount = new uint256[](len);
    uint256[] memory tokenBalanceInUSD = new uint256[](len);
    (tokenBalanceInUSD, vaultBalance) = getTokenAndVaultBalance(_index, _tokens);
    if (_index.totalSupply() == 0) {
      for (uint256 i = 0; i < len; i++) {
        uint256 _denorm = _index.getRecord(_tokens[i]).denorm;
        amount[i] = tokenAmount.mul(_denorm).div(10_000);
      }
    } else {
      for (uint256 i = 0; i < len; i++) {
        uint256 balance = tokenBalanceInUSD[i];
        require(balance.mul(tokenAmount) >= vaultBalance, "incorrect token amount");
        amount[i] = balance.mul(tokenAmount).div(vaultBalance);
      }
    }
    return (amount);
  }

  /**
   * @notice This function makes the inital checks before executing an off-chain investment
   */
  function beforeCheck(IIndexSwap _index, uint256[] calldata _lpSlippage, address _to) external {
    if (ITokenRegistry(_index.tokenRegistry()).getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    IAssetManagerConfig _assetManagerConfig = IAssetManagerConfig(_index.iAssetManagerConfig());
    if (!(_assetManagerConfig.publicPortfolio() || _assetManagerConfig.whitelistedUsers(_to))) {
      revert ErrorLibrary.UserNotAllowedToInvest();
    }
    if (_lpSlippage.length == 0) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
    if (_index.getTokens().length == 0) {
      revert ErrorLibrary.NotInitialized();
    }
  }

  /**
   * @notice This function applies checks from the asset manager config and token registry side before redeeming
   */
  function beforeRedeemCheck(IIndexSwap _index, uint256 _tokenAmount, address _token, bool _status) external {
    if (_status == true) {
      revert ErrorLibrary.TokenAlreadyRedeemed();
    }
    if (_tokenAmount > _index.balanceOf(msg.sender)) {
      revert ErrorLibrary.CallerNotHavingGivenTokenAmount();
    }
    address registry = _index.tokenRegistry();
    if (ITokenRegistry(registry).getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (
      IAssetManagerConfig(_index.iAssetManagerConfig()).isTokenPermitted(_token) == false &&
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
    if (registry.getProtocolState() == true) {
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
    if (_config.isTokenPermitted(_token) == false) {
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
   * @notice This function checks if the whitelisted tokens and handler information is correct for the inti index or not
   */
  function _whitelistAndHandlerCheck(address _token, address _offChainHandler, IIndexSwap index) external {
    IAssetManagerConfig config = IAssetManagerConfig(index.iAssetManagerConfig());
    if ((config.whitelistTokens() && !config.whitelistedToken(_token))) {
      revert ErrorLibrary.TokenNotWhitelisted();
    }
    ITokenRegistry registry = ITokenRegistry(index.tokenRegistry());
    if (!(registry.isExternalSwapHandler(_offChainHandler))) {
      revert ErrorLibrary.OffHandlerNotValid();
    }
    if (!(registry.isEnabled(_token))) {
      revert ErrorLibrary.TokenNotEnabled();
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
      if (registry.getTokenInformation(tokens[i]).primary == false) {
        revert ErrorLibrary.NotPrimaryToken();
      }
    }
  }

  /**
   * @notice This function makes the necessary checks before an off-chain withdrawal
   */
  function beforeWithdrawOffChain(bool status, ITokenRegistry tokenRegistry, address handler) external {
    if (tokenRegistry.getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }

    if (status == false) {
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
    uint256 vaultBalanceInBNB = IPriceOracle(index.oracle()).getUsdEthPrice(vaultBalance);
    feeModule.chargeFeesFromIndex(vaultBalanceInBNB);
  }

  /**
   * @notice Checks for the cooldown period to be correct as per the block timestamp
   */
  function checkCoolDownPeriod(uint256 time, ITokenRegistry registry) external view {
    if (block.timestamp.sub(time) < registry.COOLDOWN_PERIOD()) {
      revert ErrorLibrary.CoolDownPeriodNotPassed();
    }
  }

  /**
   * @notice Checks for transfer restrictions
   */
  function _beforeTokenTransfer(address from, address to, IAssetManagerConfig config) external {
    if (from == address(0) || to == address(0)) {
      return;
    }
    if (!(config.transferableToPublic() || (config.transferable() && config.whitelistedUsers(to)))) {
      revert ErrorLibrary.Transferprohibited();
    }
  }

  /**
   * @notice Returns the token balance in BNB
   * @param _token Address of the token whose balance is required
   * @param _tokenAmount Amount of the token
   * @param _oracle Oracle Address
   * @return tokenBalanceInBNB Final token balance in BNB
   */
  function getTokenBalanceInBNB(
    address _token,
    uint256 _tokenAmount,
    IPriceOracle _oracle
  ) external view returns (uint256 tokenBalanceInBNB) {
    // _oracle.getPriceTokenUSD18Decimals(_token, _tokenAmount);
    uint256 tokenBalanceInUSD = _oracle.getPriceTokenUSD18Decimals(_token, _tokenAmount);
    tokenBalanceInBNB = _oracle.getUsdEthPrice(tokenBalanceInUSD);
  }

  /**
   * @notice This function gets the underlying balances of the input token
   */
  function checkUnderlyingBalances(
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
}
