// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;
import {IIndexSwap} from "../core/IIndexSwap.sol";
import {IExchange} from "../core/IExchange.sol";
import {IndexSwapLibrary, IAssetManagerConfig, ITokenRegistry, ErrorLibrary} from "../core/IndexSwapLibrary.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";

library RebalanceLibrary {
  using SafeMathUpgradeable for uint256;

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
    amount = tokenBalance.mul(_amountA).div(_amountB);
  }

  function getAmountToSwap(
    IIndexSwap index,
    address _token,
    uint256 newWeight,
    uint256 oldWeight
  ) external view returns (uint256 amount) {
    uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, _token);

    uint256 weightDiff = oldWeight.sub(newWeight);
    uint256 swapAmount = tokenBalance.mul(weightDiff).div(oldWeight);
    return swapAmount;
  }

  /**
   * @notice The function updates record for the metaAggregatorSwap
   * @param index Index address whose tokens weight needs to be found
   */

  function getCurrentWeights(IIndexSwap index, address[] calldata tokens) external returns (uint256[] memory) {
    uint256[] memory oldWeights = new uint256[](tokens.length);
    uint256 vaultBalance = 0;

    uint256[] memory tokenBalanceInUSD = new uint256[](tokens.length);

    (tokenBalanceInUSD, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, tokens);

    for (uint256 i = 0; i < tokens.length; i++) {
      oldWeights[i] = (vaultBalance == 0)
        ? vaultBalance
        : tokenBalanceInUSD[i].mul(index.TOTAL_WEIGHT()).div(vaultBalance);
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
    uint256 vaultBalance = 0;

    uint256[] memory tokenBalanceInBNB = new uint256[](tokens.length);

    (tokenBalanceInBNB, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, tokens);
    for (uint256 i = 0; i < tokens.length; i++) {
      uint256 oldWeight = (vaultBalance == 0)
        ? vaultBalance
        : tokenBalanceInBNB[i].mul(index.TOTAL_WEIGHT()).div(vaultBalance);
      if (newWeights[i] < oldWeight) {
        uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, tokens[i]);
        uint256 weightDiff = oldWeight.sub(newWeights[i]);
        swapAmounts[i] = tokenBalance.mul(weightDiff).div(oldWeight);
        sellTokens[i] = tokens[i];
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
    uint256 vaultBalance = 0;
    uint256[] memory tokenBalanceInUSD = new uint256[](newTokens.length);
    (tokenBalanceInUSD, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, newTokens);
    for (uint256 i = 0; i < newTokens.length; i++) {
      uint256 oldWeight = (vaultBalance == 0)
        ? vaultBalance
        : tokenBalanceInUSD[i].mul(index.TOTAL_WEIGHT()).div(vaultBalance);
      if (newWeights[i] < oldWeight) {
        uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, newTokens[i]);
        uint256 weightDiff = oldWeight.sub(newWeights[i]);
        sellAmount[i] = tokenBalance.mul(weightDiff).div(oldWeight);
        sellTokens[i] = newTokens[i];
      }
    }
    return (sellTokens, sellAmount);
  }

  function getNewTokens(address[] calldata tokens, address portfolioToken) external pure returns (address[] memory) {
    address[] memory newTokens = new address[]((tokens.length).add(1));
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
    uint256 vaultBalance = 0;
    uint256 bTokenIndex;
    uint256 count = 0;

    if (index.totalSupply() > 0) {
      (tokenBalanceInUSD, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(IIndexSwap(index), _tokens);

      uint256 sum = 0;

      for (uint256 i = 0; i < _tokens.length; i++) {
        oldWeights[i] = uint96(tokenBalanceInUSD[i].mul(index.TOTAL_WEIGHT()).div(vaultBalance));
        sum += oldWeights[i];
        if (oldWeights[i] != 0) {
          count++;
        }
        if (_tokens[i] == portfolioToken) {
          bTokenIndex = i;
        }
      }

      if (sum != index.TOTAL_WEIGHT()) {
        uint256 diff = index.TOTAL_WEIGHT() - sum;
        oldWeights[bTokenIndex] = oldWeights[bTokenIndex] + uint96(diff);
      }

      uint256 j = 0;

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

      index.updateTokenList(tempTokens);

      index.updateRecords(tempTokens, tempWeights);

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

  function updateTokensCheckBefore(
    address index,
    address tokenRegistry,
    address _swapHandler,
    address[] memory tokens,
    uint256[] calldata _slippageSell,
    uint256[] calldata _slippageBuy,
    uint256[] calldata _lpSlippageSell,
    uint256[] calldata _lpSlippageBuy
  ) external {
    if (
      !(IIndexSwap(index).getTokens().length == _slippageSell.length && tokens.length == _slippageBuy.length) &&
      IIndexSwap(index).getTokens().length == _lpSlippageSell.length &&
      tokens.length == _lpSlippageBuy.length
    ) {
      revert ErrorLibrary.InvalidSlippageLength();
    }

    if (ITokenRegistry(tokenRegistry).getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (!(ITokenRegistry(tokenRegistry).isSwapHandlerEnabled(_swapHandler))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
  }

  function checkPrimary(IIndexSwap index, address[] calldata tokens) external view {
    for (uint i = 0; i < tokens.length; i++) {
      if (ITokenRegistry(index.tokenRegistry()).getTokenInformation(tokens[i]).primary == false) {
        revert ErrorLibrary.NotPrimaryToken();
      }
    }
  }

  function beforeExternalRebalance(IIndexSwap index, ITokenRegistry tokenRegistry) external {
    if (!(index.paused())) {
      revert ErrorLibrary.ContractNotPaused();
    }
    if (index.getRedeemed() != true) {
      revert ErrorLibrary.TokensStaked();
    }
    if (tokenRegistry.getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
  }

  function beforeExternalSell(IIndexSwap index, ITokenRegistry tokenRegistry, address handler) external view {
    if (!(tokenRegistry.isExternalSwapHandler(handler))) {
      revert ErrorLibrary.OffHandlerNotValid();
    }
    if (index.getRedeemed() != true) {
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
}
