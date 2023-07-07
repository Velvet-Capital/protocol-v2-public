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
  ) internal returns (uint256[] memory tokenXBalance, uint256 vaultValue) {
    uint256[] memory tokenBalanceInUSD = new uint256[](_tokens.length);
    uint256 vaultBalance = 0;

    if (_index.totalSupply() > 0) {
      for (uint256 i = 0; i < _tokens.length; i++) {
        uint256[] memory tokenBalance;
        uint256 tokenBalanceUSD;
        IExchange exchange = IExchange(_index.exchange());
        address[] memory underlying = getUnderlying(_index.tokenRegistry(), _tokens[i]);
        tokenBalance = getUnderlyingBalance(_index, _tokens[i]);

        tokenBalanceUSD = 0;
        for (uint256 j = 0; j < tokenBalance.length; j++) {
          if (tokenBalance[j] > 0) {
            tokenBalanceUSD += IPriceOracle(exchange.oracle()).getPriceTokenUSD18Decimals(
              underlying[j],
              tokenBalance[j]
            );
          }
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
    uint256 vaultBalance
  ) internal view returns (uint256[] memory) {
    uint256[] memory amount = new uint256[](_index.getTokens().length);
    if (_index.totalSupply() > 0) {
      for (uint256 i = 0; i < _index.getTokens().length; i++) {
        require(tokenBalanceInUSD[i].mul(tokenAmount) >= vaultBalance, "incorrect token amount");
        amount[i] = tokenBalanceInUSD[i].mul(tokenAmount).div(vaultBalance);
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
   * @notice This function calls the _pullFromVault() function of Exchange
   */
  function _pullFromVault(IIndexSwap _index, address _token, uint256 _amount, address _to) internal {
    IExchange(_index.exchange())._pullFromVault(_token, _amount, _to);
  }

  /**
   * @notice This function calls the _pullFromVault() function of the IndexSwapLibrary
   */
  function pullFromVault(IIndexSwap _index, address _token, uint256 _amount, address _to) external {
    _pullFromVault(_index, _token, _amount, _to);
  }

  /**
   * @notice This function transfers the tokens to the handler and then redeems it via the same handler
   */
  function transferAndRedeem(
    address token,
    IHandler handler,
    uint256 swapAmount,
    uint256 _lpSlippage,
    address to,
    bool isETH
  ) external {
    TransferHelper.safeTransfer(token, address(handler), swapAmount);
    handler.redeem(FunctionParameters.RedeemData(swapAmount, _lpSlippage, to, token, isETH));
  }

  /**
   * @notice This function returns the BNB price for given amount in USD
   */
  function _getTokenPriceUSDETH(IPriceOracle oracle, uint256 amount) external view returns (uint256 amountInBNB) {
    amountInBNB = oracle.getUsdEthPrice(amount);
  }

  /**
   * @notice This function returns the USD price for given amount in BNB
   */
  function _getTokenPriceETHUSD(IPriceOracle oracle, uint256 amount) external view returns (uint256 amountInBNB) {
    amountInBNB = oracle.getEthUsdPrice(amount);
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
  function withdrawMultiAsset(address _token, uint256 _tokenBalance) external {
    _pullFromVault(IIndexSwap(address(this)), _token, _tokenBalance, msg.sender);
  }

  /**
   * @notice This function puts some checks before an investment operation
   */
  function beforeInvestment(uint256 _slippageLength, uint256 _lpSlippageLength, address _to) internal {
    IAssetManagerConfig _assetManagerConfig = IAssetManagerConfig(IIndexSwap(address(this)).iAssetManagerConfig());
    address[] memory _tokens = IIndexSwap(address(this)).getTokens();
    if (!(_assetManagerConfig.publicPortfolio() || _assetManagerConfig.whitelistedUsers(_to))) {
      revert ErrorLibrary.UserNotAllowedToInvest();
    }
    if (ITokenRegistry(IIndexSwap(address(this)).tokenRegistry()).getProtocolState() == true) {
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
    IIndexSwap _index,
    address _token,
    address _to,
    uint256 _amount,
    uint256 _lpSlippage,
    bool isPrimary,
    IHandler _handler
  ) internal {
    _pullFromVault(_index, _token, _amount, _to);
    if (!isPrimary) {
      TransferHelper.safeTransfer(_token, address(_handler), _amount);
      _handler.redeem(
        FunctionParameters.RedeemData(
          _amount,
          _lpSlippage,
          _to,
          _token,
          IExchange(_index.exchange()).isWETH(_token, address(_handler))
        )
      );
    }
  }

  /**
   * @notice This function checks the underlying balance with the help of the handler
   */
  function checkUnderlyingBalance(
    address _token,
    IHandler _handler,
    address _contract
  ) internal view returns (uint256[] memory) {
    address[] memory underlying = _handler.getUnderlying(_token);
    uint256[] memory balances = new uint256[](underlying.length);
    for (uint256 i = 0; i < underlying.length; i++) {
      balances[i] = IERC20Upgradeable(underlying[i]).balanceOf(_contract);
    }
    return balances;
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
    uint256 len = IIndexSwap(_index).getTokens().length;
    uint256[] memory amount = new uint256[](len);
    uint256[] memory tokenBalanceInUSD = new uint256[](len);
    (tokenBalanceInUSD, vaultBalance) = getTokenAndVaultBalance(IIndexSwap(_index), IIndexSwap(_index).getTokens());
    if (_index.totalSupply() == 0) {
      for (uint256 i = 0; i < len; i++) {
        uint256 _denorm = _index.getRecord(_index.getTokens()[i]).denorm;
        amount[i] = tokenAmount.mul(_denorm).div(10_000);
      }
    } else {
      amount = calculateSwapAmounts(IIndexSwap(_index), tokenAmount, tokenBalanceInUSD, vaultBalance);
    }
    return (amount);
  }

  function calculateWithdrawAmount(IIndexSwap index, uint256 _tokenAmount) external view returns (uint256[] memory) {
    uint256 supply = index.totalSupply();
    address[] memory _tokens = index.getTokens();
    uint256[] memory _tokenAmounts = new uint256[](_tokens.length);
    for (uint i = 0; i < _tokens.length; i++) {
      IHandler handler = IHandler(ITokenRegistry(index.tokenRegistry()).getTokenInformation(_tokens[i]).handler);
      uint256 tokenBalance = handler.getTokenBalance(index.vault(), _tokens[i]);
      _tokenAmounts[i] = tokenBalance.mul(_tokenAmount).div(supply);
    }
    return _tokenAmounts;
  }

  function beforeCheck(IIndexSwap _index, uint256 _tokenAmount) external {
    if (ITokenRegistry(_index.tokenRegistry()).getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (
      !(_tokenAmount <= IAssetManagerConfig(_index.iAssetManagerConfig()).MAX_INVESTMENTAMOUNT() &&
        _tokenAmount >= IAssetManagerConfig(_index.iAssetManagerConfig()).MIN_INVESTMENTAMOUNT())
    ) {
      revert ErrorLibrary.WrongInvestmentAmount({
        minInvestment: IAssetManagerConfig(_index.iAssetManagerConfig()).MIN_INVESTMENTAMOUNT(),
        maxInvestment: IAssetManagerConfig(_index.iAssetManagerConfig()).MAX_INVESTMENTAMOUNT()
      });
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
    if (ITokenRegistry(_index.tokenRegistry()).getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (
      IAssetManagerConfig(_index.iAssetManagerConfig()).isTokenPermitted(_token) == false &&
      _token != ITokenRegistry(_index.tokenRegistry()).getETH()
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
    address owner,
    IIndexSwap index,
    uint256 tokenAmount
  ) external view {
    if (tokenAmount > index.balanceOf(owner)) {
      revert ErrorLibrary.CallerNotHavingGivenTokenAmount();
    }
    if (_slippage != index.getTokens().length || _lpSlippage != index.getTokens().length) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
  }

  /**
   * @notice This function checks if the investment value is correct or not
   */
  function _checkInvestmentValue(uint256 _tokenAmount, IAssetManagerConfig _assetManagerConfig) external view {
    if (
      !(_tokenAmount <= _assetManagerConfig.MAX_INVESTMENTAMOUNT() &&
        _tokenAmount >= _assetManagerConfig.MIN_INVESTMENTAMOUNT())
    ) {
      revert ErrorLibrary.WrongInvestmentAmount({
        minInvestment: _assetManagerConfig.MIN_INVESTMENTAMOUNT(),
        maxInvestment: _assetManagerConfig.MAX_INVESTMENTAMOUNT()
      });
    }
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
    if (
      !(!IAssetManagerConfig(index.iAssetManagerConfig()).whitelistTokens() ||
        IAssetManagerConfig(index.iAssetManagerConfig()).whitelistedToken(token))
    ) {
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
    if (
      !(!IAssetManagerConfig(index.iAssetManagerConfig()).whitelistTokens() ||
        IAssetManagerConfig(index.iAssetManagerConfig()).whitelistedToken(_token))
    ) {
      revert ErrorLibrary.TokenNotWhitelisted();
    }
    if (!(ITokenRegistry(index.tokenRegistry()).isExternalSwapHandler(_offChainHandler))) {
      revert ErrorLibrary.OffHandlerNotValid();
    }
  }

  /**
   * @notice This function gets the underlying balance via the handler
   */
  function getUnderlyingBalance(IIndexSwap _index, address t) internal returns (uint256[] memory) {
    IHandler handler = IHandler(ITokenRegistry(_index.tokenRegistry()).getTokenInformation(t).handler);
    uint256[] memory tokenBalance = handler.getUnderlyingBalance(_index.vault(), t);
    return tokenBalance;
  }

  /**
   * @notice This function gets the underlying token address via the handler
   */
  function getUnderlying(address _tokenRegistry, address t) internal view returns (address[] memory) {
    IHandler handler = IHandler(ITokenRegistry(_tokenRegistry).getTokenInformation(t).handler);
    address[] memory underlying = handler.getUnderlying(t);
    return underlying;
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

  function checkPrimary(IIndexSwap index, address[] calldata tokens) external view {
    for (uint i = 0; i < tokens.length; i++) {
      if (ITokenRegistry(index.tokenRegistry()).getTokenInformation(tokens[i]).primary == false) {
        revert ErrorLibrary.NotPrimaryToken();
      }
    }
  }

  function beforeWithdrawOffChain(bool status, ITokenRegistry tokenRegistry, address handler) external view {
    if (status == false) {
      revert ErrorLibrary.TokensNotRedeemed();
    }
    if (!(tokenRegistry.isExternalSwapHandler(handler))) {
      revert ErrorLibrary.OffHandlerNotValid();
    }
  }

  function chargeFees(IIndexSwap index, IFeeModule feeModule) external returns (uint256 vaultBalance) {
    (, vaultBalance) = getTokenAndVaultBalance(index, index.getTokens());
    uint256 vaultBalanceInBNB = IPriceOracle(index.oracle()).getUsdEthPrice(vaultBalance);
    feeModule.chargeFeesFromIndex(vaultBalanceInBNB);
  }
}
