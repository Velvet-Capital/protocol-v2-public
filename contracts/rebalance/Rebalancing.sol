// SPDX-License-Identifier: MIT

/**
 * @title Rebalancing for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used by asset manager to update weights, update tokens and call pause function.
 * @dev This contract includes functionalities:
 *      1. Pause the IndexSwap contract
 *      2. Update the token list
 *      3. Update the token weight
 */

pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";
import {IExchange} from "../core/IExchange.sol";

import {IWETH} from "../interfaces/IWETH.sol";

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {AccessController} from "../access/AccessController.sol";

import {IPriceOracle} from "../oracle/IPriceOracle.sol";

import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";

import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

import {RebalanceLibrary} from "./RebalanceLibrary.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {FunctionParameters} from "../FunctionParameters.sol";

contract Rebalancing is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  IIndexSwap public index;
  AccessController public accessController;
  ITokenRegistry public tokenRegistry;
  IAssetManagerConfig public assetManagerConfig;
  IExchange public exchange;

  using SafeMathUpgradeable for uint256;

  IPriceOracle public oracle;

  uint256 internal lastRebalanced;

  uint256 public lastPaused;

  event UpdatedWeights(uint256 time, uint96[] indexed newDenorms);
  event UpdatedTokens(uint256 time, address[] indexed newTokens, uint96[] indexed newDenorms);
  event SetPause(uint256 indexed time, bool indexed state);

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
      revert ErrorLibrary.CallerIsNotAssetManager();
    }
    _;
  }

  /**
    @notice The function will pause the InvestInFund() and Withdrawal().
    @param _state The state is bool value which needs to input by the Index Manager.
    */
  function setPause(bool _state) public virtual {
    if (_state) {
      if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
        revert ErrorLibrary.OnlyAssetManagerCanCallUnpause();
      }
      index.setPaused(_state);
      lastPaused = block.timestamp;
    } else {
      if (index.getRedeemed() != false) {
        revert ErrorLibrary.TokensNotStaked();
      }
      if (lastRebalanced > lastPaused || block.timestamp >= (lastPaused + 10 minutes)) {
        index.setPaused(_state);
      } else {
        if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
          revert ErrorLibrary.TenMinutesPassOrRebalancingHasToBeCalled();
        }
        index.setPaused(_state);
      }
    }
    emit SetPause(block.timestamp, _state);
  }

  /**
   * @notice The function sells the excessive token amount of each token considering the new weights
   * @param _oldWeights The current token allocation in the portfolio
   * @param _newWeights The new token allocation the portfolio should be rebalanced to
   * @return sumWeightsToSwap Returns the weight of tokens that have to be swapped to rebalance the portfolio (buy)
   */
  function sellTokens(
    uint256[] memory _oldWeights,
    uint256[] memory _newWeights,
    uint256[] calldata _slippage,
    uint256[] calldata _lpSlippage,
    address _swapHandler
  ) internal virtual returns (uint256 sumWeightsToSwap) {
    // sell - swap to BNB
    address[] memory tokens = index.getTokens();
    for (uint256 i = 0; i < tokens.length; i++) {
      if (_newWeights[i] < _oldWeights[i]) {
        uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, tokens[i]);

        uint256 weightDiff = _oldWeights[i].sub(_newWeights[i]);
        uint256 swapAmount = tokenBalance.mul(weightDiff).div(_oldWeights[i]);
        _pullAndSwap(tokens[i], swapAmount, address(this), _slippage[i], _lpSlippage[i], _swapHandler);
      } else if (_newWeights[i] > _oldWeights[i]) {
        uint256 diff = _newWeights[i].sub(_oldWeights[i]);
        sumWeightsToSwap = sumWeightsToSwap.add(diff);
      }
    }
  }

  /**
   * @notice The function swaps the sold BNB into tokens that haven't reached the new weight
   * @param _oldWeights The current token allocation in the portfolio
   * @param _newWeights The new token allocation the portfolio should be rebalanced to
   */
  function buyTokens(
    uint256[] memory _oldWeights,
    uint256[] memory _newWeights,
    uint256 sumWeightsToSwap,
    uint256[] calldata _slippage,
    uint256[] calldata _lpSlippage,
    address _swapHandler
  ) internal virtual {
    uint256 totalBNBAmount = address(this).balance;
    address[] memory tokens = index.getTokens();
    for (uint256 i = 0; i < tokens.length; i++) {
      if (_newWeights[i] > _oldWeights[i]) {
        uint256 weightToSwap = _newWeights[i].sub(_oldWeights[i]);
        if (weightToSwap == 0) {
          revert ErrorLibrary.WeightNotGreaterThan0();
        }
        if (sumWeightsToSwap == 0) {
          revert ErrorLibrary.DivBy0Sumweight();
        }
        uint256 swapAmount = totalBNBAmount.mul(weightToSwap).div(sumWeightsToSwap);
        exchange._swapETHToToken{value: swapAmount}(
          FunctionParameters.SwapETHToTokenData(tokens[i], index.vault(), _swapHandler, _slippage[i], _lpSlippage[i])
        );
      }
    }
  }

  /**
   * @notice The function rebalances the token weights in the portfolio
   */
  function rebalance(
    uint256[] calldata _slippage,
    uint256[] calldata _lpSlippage,
    address _swapHandler
  ) internal virtual onlyAssetManager nonReentrant {
    if (index.totalSupply() <= 0) {
      revert ErrorLibrary.InvalidAmount();
    }
    uint256 vaultBalance = 0;
    address[] memory tokens = index.getTokens();
    uint256[] memory newWeights = new uint256[](tokens.length);
    uint256[] memory oldWeights = new uint256[](tokens.length);
    uint256[] memory tokenBalanceInBNB = new uint256[](tokens.length);

    (tokenBalanceInBNB, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(IIndexSwap(index), tokens);

    uint256 contractBalanceInUSD = IndexSwapLibrary._getTokenPriceETHUSD(oracle, address(this).balance);
    vaultBalance = vaultBalance.add(contractBalanceInUSD);

    for (uint256 i = 0; i < tokens.length; i++) {
      oldWeights[i] = tokenBalanceInBNB[i].mul(index.TOTAL_WEIGHT()).div(vaultBalance);
      newWeights[i] = uint256(index.getRecord(tokens[i]).denorm);
    }

    uint256 sumWeightsToSwap = sellTokens(oldWeights, newWeights, _slippage, _lpSlippage, _swapHandler);
    buyTokens(oldWeights, newWeights, sumWeightsToSwap, _slippage, _lpSlippage, _swapHandler);

    lastRebalanced = block.timestamp;
    index.setRedeemed(false);
  }

  /**
   * @notice The function updates the token weights and rebalances the portfolio to the new weights
   * @param denorms The new token weights of the portfolio
   */
  function updateWeights(
    uint96[] calldata denorms,
    uint256[] calldata _slippage,
    uint256[] calldata _lpSlippage,
    address _swapHandler
  ) public virtual onlyAssetManager {
    address[] memory tokens = index.getTokens();
    if (denorms.length != tokens.length) {
      revert ErrorLibrary.LengthsDontMatch();
    }
    if (tokens.length != _slippage.length || tokens.length != _lpSlippage.length) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
    if (tokenRegistry.getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (!(tokenRegistry.isSwapHandlerEnabled(_swapHandler))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    index.updateRecords(tokens, denorms);
    rebalance(_slippage, _lpSlippage, _swapHandler);
    emit UpdatedWeights(block.timestamp, denorms);
  }

  /**
   * @notice The function rebalances the portfolio to the updated tokens with the updated weights
   * @param inputData The

   */
  function updateTokens(FunctionParameters.UpdateTokens calldata inputData) public virtual onlyAssetManager {
    uint256 totalWeight = 0;
    address[] memory tokens = index.getTokens();
    RebalanceLibrary.updateTokensCheckBefore(
      address(index),
      address(tokenRegistry),
      inputData._swapHandler,
      inputData.tokens,
      inputData._slippageSell,
      inputData._slippageBuy,
      inputData._lpSlippageSell,
      inputData._lpSlippageBuy
    );
    for (uint256 i = 0; i < inputData.tokens.length; i++) {
      RebalanceLibrary.updateTokensCheck(address(tokenRegistry), address(assetManagerConfig), inputData.tokens[i]);

      totalWeight = totalWeight.add(inputData.denorms[i]);
    }
    if (totalWeight != index.TOTAL_WEIGHT()) {
      revert ErrorLibrary.InvalidWeights({totalWeight: index.TOTAL_WEIGHT()});
    }

    uint256[] memory newDenorms = RebalanceLibrary.evaluateNewDenorms(index, inputData.tokens, inputData.denorms);

    if (index.totalSupply() > 0) {
      // sell - swap to BNB
      for (uint256 i = 0; i < tokens.length; i++) {
        if (newDenorms[i] == 0) {
          uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, tokens[i]);

          _pullAndSwap(
            tokens[i],
            tokenBalance,
            address(this),
            inputData._slippageSell[i],
            inputData._lpSlippageSell[i],
            inputData._swapHandler
          );
        }
        index.deleteRecord(tokens[i]);
      }
    }

    _updateTokenListAndRecords(inputData.tokens, inputData.denorms);

    index.updateRecords(inputData.tokens, inputData.denorms);

    rebalance(inputData._slippageBuy, inputData._lpSlippageBuy, inputData._swapHandler);

    emit UpdatedTokens(block.timestamp, inputData.tokens, inputData.denorms);
  }

  /**
   * @notice This function returns the given token balance of the vault
   */
  function getTokenBalance(address _token) public view virtual returns (uint256) {
    return IndexSwapLibrary.getTokenBalance(index, _token);
  }

  /**
   * @notice This function update records with new tokenlist and weights
   */
  function _updateTokenListAndRecords(
    address[] memory _tokens,
    uint96[] memory _denorms
  ) public virtual onlyAssetManager {
    index.updateTokenList(_tokens);
    index.updateRecords(_tokens, _denorms);
  }

  /**
   * @notice This function swaps token using the swapHandler
   */
  function _pullAndSwap(
    address _token,
    uint256 _amount,
    address _to,
    uint256 _slippage,
    uint256 _lpSlippage,
    address _swapHandler
  ) internal virtual {
    exchange._pullFromVault(_token, _amount, address(exchange));
    exchange._swapTokenToETH(
      FunctionParameters.SwapTokenToETHData(_token, _to, _swapHandler, _amount, _slippage, _lpSlippage)
    );
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
