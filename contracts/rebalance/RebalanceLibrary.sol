// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.16;
import {IIndexSwap} from "../core/IIndexSwap.sol";
import {IExchange} from "../core/IExchange.sol";
import {IndexSwapLibrary, IAssetManagerConfig, ITokenRegistry, ErrorLibrary} from "../core/IndexSwapLibrary.sol";
import {IHandler, FunctionParameters} from "../handler/IHandler.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/interfaces/IERC20Upgradeable.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";

library RebalanceLibrary {
  /**
   * @notice The function evaluates new denorms after updating the token list
   * @param tokens The new portfolio tokens
   * @param denorms The new token weights for the updated token list
   * @return A list of updated denorms for the new token list
   */
  function evaluateNewDenorms(
    IIndexSwap index,
    address[] memory tokens,
    uint96[] memory denorms
  ) public view returns (uint256[] memory) {
    address[] memory token = index.getTokens();
    uint256[] memory newDenorms = new uint256[](token.length);
    for (uint256 i = 0; i < token.length; i++) {
      for (uint256 j = 0; j < tokens.length; j++) {
        if (token[i] == tokens[j]) {
          newDenorms[i] = denorms[j];
          break;
        }
      }
    }
    return newDenorms;
  }

  function getSwapAmount(
    IIndexSwap index,
    address _token,
    uint256 _amountA,
    uint256 _amountB
  ) external view returns (uint256 amount) {
    uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, _token);
    amount = (tokenBalance * _amountA) / _amountB;
  }

  function getAmountToSwap(
    IIndexSwap index,
    address _token,
    uint256 newWeight,
    uint256 oldWeight
  ) external view returns (uint256 amount) {
    uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, _token);

    uint256 weightDiff = oldWeight - newWeight;
    uint256 swapAmount = (tokenBalance * weightDiff) / oldWeight;
    return swapAmount;
  }

  /**
   * @notice The function updates record for the metaAggregatorSwap
   * @param index Index address whose tokens weight needs to be found
   * @param tokens Array of token addresses passed to the function
   * @return Array of the current weights returned
   */

  function getCurrentWeights(
    IIndexSwap index,
    address[] calldata tokens,
    uint256 _vaultBalance
  ) external returns (uint96[] memory) {
    uint96[] memory oldWeights = new uint96[](tokens.length);

    uint256[] memory tokenBalanceInUSD = new uint256[](tokens.length);

    (tokenBalanceInUSD, ) = IndexSwapLibrary.getTokenAndVaultBalance(index, tokens);

    for (uint256 i = 0; i < tokens.length; i++) {
      oldWeights[i] = uint96(
        (_vaultBalance == 0) ? _vaultBalance : (tokenBalanceInUSD[i] * index.TOTAL_WEIGHT()) / _vaultBalance
      );
    }
    return oldWeights;
  }

  function getRebalanceSwapData(
    uint256[] calldata newWeights,
    IIndexSwap index
  ) external returns (address[] memory, uint256[] memory) {
    address[] memory tokens = index.getTokens();
    address[] memory sellTokens = new address[](tokens.length);
    uint256[] memory swapAmounts = new uint256[](tokens.length);
    uint256 vaultBalance;

    uint256[] memory tokenBalanceInUSD = new uint256[](tokens.length);

    (tokenBalanceInUSD, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, tokens);
    for (uint256 i = 0; i < tokens.length; i++) {
      address _token = tokens[i];
      uint256 oldWeight = (vaultBalance == 0)
        ? vaultBalance
        : (tokenBalanceInUSD[i] * index.TOTAL_WEIGHT()) / vaultBalance;
      uint256 _newWeight = newWeights[i];
      if (_newWeight < oldWeight) {
        uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, _token);
        uint256 weightDiff = oldWeight - _newWeight;
        swapAmounts[i] = (tokenBalance * weightDiff) / oldWeight;
        sellTokens[i] = _token;
      }
    }
    return (sellTokens, swapAmounts);
  }

  function getUpdateTokenData(
    IIndexSwap index,
    address[] calldata newTokens,
    uint96[] calldata newWeights
  ) external view returns (address[] memory, uint256[] memory) {
    address[] memory tokens = index.getTokens();
    uint256[] memory newDenorms = evaluateNewDenorms(index, newTokens, newWeights);
    uint256[] memory swapAmounts = new uint256[](tokens.length);
    address[] memory tokenSell = new address[](tokens.length);
    for (uint256 i = 0; i < tokens.length; i++) {
      if (newDenorms[i] == 0) {
        swapAmounts[i] = IndexSwapLibrary.getTokenBalance(index, tokens[i]);
        tokenSell[i] = tokens[i];
      }
    }
    return (tokenSell, swapAmounts);
  }

  function getUpdateWeightTokenData(
    IIndexSwap index,
    address[] calldata newTokens,
    uint96[] calldata newWeights
  ) external returns (address[] memory, uint256[] memory) {
    address[] memory sellTokens = new address[](newTokens.length);
    uint256[] memory sellAmount = new uint256[](newTokens.length);
    uint256 vaultBalance;
    uint256[] memory tokenBalanceInUSD = new uint256[](newTokens.length);
    (, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, index.getTokens());
    (tokenBalanceInUSD, ) = IndexSwapLibrary.getTokenAndVaultBalance(index, newTokens);  
    for (uint256 i = 0; i < newTokens.length; i++) {
      uint256 oldWeight = (vaultBalance == 0)
        ? vaultBalance
        : (tokenBalanceInUSD[i] * index.TOTAL_WEIGHT()) / vaultBalance;
      if (newWeights[i] < oldWeight) {
        uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, newTokens[i]);
        uint256 weightDiff = oldWeight - newWeights[i];
        sellAmount[i] = (tokenBalance * weightDiff) / oldWeight;
        sellTokens[i] = newTokens[i];
      }
    }
    return (sellTokens, sellAmount);
  }

  function getNewTokens(address[] calldata tokens, address portfolioToken) external pure returns (address[] memory) {
    address[] memory newTokens = new address[](tokens.length + 1);
    for (uint i = 0; i < tokens.length; i++) {
      if (tokens[i] == portfolioToken) {
        return tokens;
      }
      newTokens[i] = tokens[i];
    }
    newTokens[tokens.length] = portfolioToken;
    return newTokens;
  }

  /**
   * @notice The function updates record for the metaAggregatorSwap
   * @param index Index address whose record needs to be updated
   * @param _tokens Array of all tokens of the index
   * @param portfolioToken The portfolio token which needs to be updated
   */
  function setRecord(IIndexSwap index, address[] memory _tokens, address portfolioToken) external {
    uint96[] memory oldWeights = new uint96[](_tokens.length);

    uint256[] memory tokenBalanceInUSD = new uint256[](_tokens.length);
    uint256 vaultBalance;
    uint256 bTokenIndex;
    uint256 count;

    if (index.totalSupply() > 0) {
      (tokenBalanceInUSD, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(IIndexSwap(index), _tokens);

      uint256 sum;

      for (uint256 i = 0; i < _tokens.length; i++) {
        oldWeights[i] = uint96((tokenBalanceInUSD[i] * index.TOTAL_WEIGHT()) / vaultBalance);
        sum += oldWeights[i];
        if (oldWeights[i] != 0) {
          count++;
        }
        if (_tokens[i] == portfolioToken) {
          bTokenIndex = i;
          if (oldWeights[i] == 0) {
            count++;
          }
        }
      }

      if (sum != index.TOTAL_WEIGHT()) {
        uint256 diff = index.TOTAL_WEIGHT() - sum;
        oldWeights[bTokenIndex] = oldWeights[bTokenIndex] + uint96(diff);
      }

      if (oldWeights[bTokenIndex] == 0) {
        revert ErrorLibrary.BalanceTooSmall();
      }
      uint256 j;

      address[] memory tempTokens = new address[](count);
      uint96[] memory tempWeights = new uint96[](count);

      for (uint256 i = 0; i < _tokens.length; i++) {
        if (oldWeights[i] != 0) {
          tempTokens[j] = _tokens[i];
          tempWeights[j] = oldWeights[i];
          j++;
        } else {
          index.deleteRecord(_tokens[i]);
        }
      }

      index.updateTokenListAndRecords(tempTokens, tempWeights);

      index.setRedeemed(false);
      index.setPaused(false);
    }
  }

  function updateTokensCheck(address tokenRegistry, address assetManagerConfig, address _token) external {
    if (!(ITokenRegistry(tokenRegistry).isEnabled(_token))) {
      revert ErrorLibrary.TokenNotApproved();
    }

    if (
      !(!IAssetManagerConfig(assetManagerConfig).whitelistTokens() ||
        IAssetManagerConfig(assetManagerConfig).whitelistedToken(_token))
    ) {
      revert ErrorLibrary.TokenNotWhitelisted();
    }
  }

  /**
   * @notice This function gets the underlying balances of the input token
   * @param _token Address of the token whose underlying balance is to be calculated
   * @param _handler Address of the handler of the token passed
   * @param _contract Address of the contract whose underlying balance is to be calculated
   * @return Array of underlying balances for the passed tokens
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

  function checkPrimary(IIndexSwap index, address[] calldata tokens) external view {
    for (uint i = 0; i < tokens.length; i++) {
      if (!ITokenRegistry(index.tokenRegistry()).getTokenInformation(tokens[i]).primary) {
        revert ErrorLibrary.NotPrimaryToken();
      }
    }
  }

  function beforeExternalRebalance(IIndexSwap index, ITokenRegistry tokenRegistry,address offchainHandler) external {
    if (!(index.paused())) {
      revert ErrorLibrary.ContractNotPaused();
    }
    if (!index.getRedeemed()) {
      revert ErrorLibrary.TokensStaked();
    }
    if (tokenRegistry.getProtocolState()) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (!tokenRegistry.isExternalSwapHandler(offchainHandler)) {
      revert ErrorLibrary.OffHandlerNotEnabled();
    }
  }

  function beforeExternalSell(IIndexSwap index, ITokenRegistry tokenRegistry, address handler) external view {
    if (!(tokenRegistry.isExternalSwapHandler(handler))) {
      revert ErrorLibrary.OffHandlerNotValid();
    }
    if (!index.getRedeemed()) {
      revert ErrorLibrary.TokensStaked();
    }
  }

  function beforePullAndRedeem(IIndexSwap index, IAssetManagerConfig config, address token) external {
    if (!(index.paused())) {
      revert ErrorLibrary.ContractNotPaused();
    }
    if (!(!config.whitelistTokens() || config.whitelistedToken(token))) {
      revert ErrorLibrary.TokenNotWhitelisted();
    }
  }

  function getOldWeights(IIndexSwap index, address[] calldata tokens) external view returns (uint96[] memory) {
    uint96[] memory oldWeight = new uint96[](tokens.length);
    for (uint i = 0; i < tokens.length; i++) {
      oldWeight[i] = index.getRecord(tokens[i]).denorm;
    }
    return oldWeight;
  }

  function beforeRevertCheck(IIndexSwap index) external view {
    if (!(index.paused())) {
      revert ErrorLibrary.ContractNotPaused();
    }
    if (!index.getRedeemed()) {
      revert ErrorLibrary.TokensStaked();
    }
  }

  function getEthBalance(
    address _eth,
    address[] memory _underlying,
    uint256[] calldata _amount
  ) external returns (uint256, uint256) {
    if (_underlying[0] == _eth) {
      IWETH(_eth).withdraw(_amount[0]);
      return (_amount[0], 1);
    }
    IWETH(_eth).withdraw(_amount[1]);
    return (_amount[1], 0);
  }

  function validateEnableRebalance(IIndexSwap _index, ITokenRegistry _registry, bool isRedeemed) external {
    if (_registry.getProtocolState()) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (_index.paused()) {
      revert ErrorLibrary.ContractPaused();
    }
    if (isRedeemed) {
      revert ErrorLibrary.AlreadyOngoingOperation();
    }
  }

  function validateUpdateRecord(
    address[] memory _newTokens,
    IAssetManagerConfig config,
    ITokenRegistry registry
  ) external {
    for (uint256 i = 0; i < _newTokens.length; i++) {
      if ((config.whitelistTokens() && !config.whitelistedToken(_newTokens[i]))) {
        revert ErrorLibrary.TokenNotWhitelisted();
      }
      if (!registry.isEnabled(_newTokens[i])) {
        revert ErrorLibrary.InvalidToken();
      }
    }
  }

  /**
   * @notice This function is used to validate that user input token address is same as underlying token address
   */
  function verifyAddress(
    address[] memory _redeemedTokensUnderlying,
    address[] memory _portfolioTokenUnderlying,
    address[] memory _sellTokens,
    address[] memory _buyTokens
  ) external pure {
    uint256 _maxLength = _redeemedTokensUnderlying.length > _portfolioTokenUnderlying.length
      ? _redeemedTokensUnderlying.length
      : _portfolioTokenUnderlying.length;

    if (_sellTokens.length != _buyTokens.length || _sellTokens.length != _maxLength) {
      revert ErrorLibrary.InvalidTokenLength();
    }
    _checkUnderlyingCounter(_redeemedTokensUnderlying, _sellTokens, _maxLength);
    _checkUnderlyingCounter(_portfolioTokenUnderlying, _buyTokens, _maxLength);
  }

  /**
   * @notice This function checks for the number of underlying tokens present
   */
  function _checkUnderlyingCounter(
    address[] memory _tokensUnderlying,
    address[] memory _userInputToken,
    uint256 _maxLength
  ) internal pure {
    uint tokenCounter;
    for (uint i = 0; i < _tokensUnderlying.length; i++) {
      for (uint j = 0; j < _maxLength; j++) {
        if (_tokensUnderlying[i] == _userInputToken[j]) {
          tokenCounter++;
        }
      }
    }
    if (tokenCounter != _maxLength) {
      revert ErrorLibrary.InvalidInputTokenList();
    }
  }
}
