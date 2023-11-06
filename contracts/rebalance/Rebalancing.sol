// SPDX-License-Identifier: BUSL-1.1

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

import {RebalanceLibrary} from "./RebalanceLibrary.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {FunctionParameters} from "../FunctionParameters.sol";
import {IHandler} from "../handler/IHandler.sol";

contract Rebalancing is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  IIndexSwap internal index;
  AccessController internal accessController;
  ITokenRegistry internal tokenRegistry;
  IAssetManagerConfig internal assetManagerConfig;
  IExchange internal exchange;
  address internal _vault;

  IPriceOracle internal oracle;

  event UpdatedWeights(uint96[] newDenorms);
  event UpdatedTokens(address[] newTokens, uint96[] newDenorms);
  event SetPause(bool indexed state);

  constructor() {
    _disableInitializers();
  }

  /**
   * @notice This function is used to initialise the Rebalance module while deployment
   */
  function init(address _index, address _accessController) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    __ReentrancyGuard_init();
    if (_index == address(0) || _accessController == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    index = IIndexSwap(_index);
    accessController = AccessController(_accessController);
    tokenRegistry = ITokenRegistry(index.tokenRegistry());
    exchange = IExchange(index.exchange());
    oracle = IPriceOracle(index.oracle());
    assetManagerConfig = IAssetManagerConfig(index.iAssetManagerConfig());
    _vault = index.vault();
  }

  modifier onlyAssetManager() {
    if (!(_checkRole("ASSET_MANAGER_ROLE", msg.sender))) {
      revert ErrorLibrary.CallerIsNotAssetManager();
    }
    _;
  }

  /**
    @notice The function will pause the InvestInFund() and Withdrawal().
    @param _state The state is bool value which needs to input by the Index Manager.
    */
  function setPause(bool _state) external virtual nonReentrant {
    address user = msg.sender;
    if (_state) {
      if (!(_checkRole("ASSET_MANAGER_ROLE", user))) {
        revert ErrorLibrary.OnlyAssetManagerCanCallUnpause();
      }
      _setPaused(_state);
    } else {
      if (getRedeemed()) {
        revert ErrorLibrary.TokensNotStaked();
      }
      uint256 _lastPaused = index.getLastPaused();
      if (getTimeStamp() >= (_lastPaused + 15 minutes)) {
        _setPaused(_state);
      } else {
        if (!(_checkRole("ASSET_MANAGER_ROLE", user))) {
          revert ErrorLibrary.FifteenMinutesNotExcedeed();
        }
        _setPaused(_state);
      }
    }
    emit SetPause(_state);
  }

  /**
   * @notice The function sells the excessive token amount of each token considering the new weights
   * @param _oldWeights The current token allocation in the portfolio
   * @param _newWeights The new token allocation the portfolio should be rebalanced to
   * @param _slippage Array of the slippage values passed
   * @param _lpSlippage Array of the lp slippage values passed
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
    address[] memory tokens = getTokens();
    for (uint256 i = 0; i < tokens.length; i++) {
      if (_newWeights[i] < _oldWeights[i]) {
        uint256 tokenBalance = getTokenBalance(tokens[i]);

        uint256 weightDiff = _oldWeights[i] - _newWeights[i];
        uint256 swapAmount = (tokenBalance * weightDiff) / _oldWeights[i];
        _pullAndSwap(tokens[i], swapAmount, address(this), _slippage[i], _lpSlippage[i], _swapHandler);
      } else if (_newWeights[i] > _oldWeights[i]) {
        uint256 diff = _newWeights[i] - _oldWeights[i];
        sumWeightsToSwap = sumWeightsToSwap + diff;
      }
    }
  }

  /**
   * @notice The function swaps the sold BNB into tokens that haven't reached the new weight
   * @param _oldWeights The current token allocation in the portfolio
   * @param _newWeights The new token allocation the portfolio should be rebalanced to
   * @param sumWeightsToSwap Value of Sum Weight passed to the function
   * @param _slippage Array of the slippage values passed
   * @param _lpSlippage Array of the lp slippage values passed
   * @param _swapHandler Address of the associated swap handler
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
    address[] memory tokens = getTokens();
    if (sumWeightsToSwap == 0) {
      revert ErrorLibrary.DivBy0Sumweight();
    }
    for (uint256 i = 0; i < tokens.length; i++) {
      if (_newWeights[i] > _oldWeights[i]) {
        uint256 weightToSwap = _newWeights[i] - _oldWeights[i];
        uint256 swapAmount = (totalBNBAmount * weightToSwap) / sumWeightsToSwap;
        exchange.swapETHToToken{value: swapAmount}(
          FunctionParameters.SwapETHToTokenPublicData(
            tokens[i],
            _vault,
            _swapHandler,
            _vault,
            _slippage[i],
            _lpSlippage[i]
          )
        );
      }
    }
  }

  /**
   * @notice The function rebalances the token weights in the portfolio
   * @param _slippage Array of the slippage values passed
   * @param _lpSlippage Array of the lp slippage values passed
   * @param _swapHandler Address of the associated swap handler
   */
  function rebalance(
    uint256[] calldata _slippage,
    uint256[] calldata _lpSlippage,
    address _swapHandler
  ) internal virtual {
    if (index.totalSupply() <= 0) {
      revert ErrorLibrary.InvalidAmount();
    }
    uint256 vaultBalance;
    address[] memory tokens = getTokens();
    uint256[] memory newWeights = new uint256[](tokens.length);
    uint256[] memory oldWeights = new uint256[](tokens.length);
    uint256[] memory tokenBalanceInUSD = new uint256[](tokens.length);

    (tokenBalanceInUSD, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(IIndexSwap(index), tokens);

    uint256 contractBalanceInUSD = oracle.getEthUsdPrice(address(this).balance);
    vaultBalance = vaultBalance + contractBalanceInUSD;

    for (uint256 i = 0; i < tokens.length; i++) {
      oldWeights[i] = (tokenBalanceInUSD[i] * index.TOTAL_WEIGHT()) / vaultBalance;
      newWeights[i] = uint256(getDenorm(tokens[i]));
    }

    uint256 sumWeightsToSwap = sellTokens(oldWeights, newWeights, _slippage, _lpSlippage, _swapHandler);
    buyTokens(oldWeights, newWeights, sumWeightsToSwap, _slippage, _lpSlippage, _swapHandler);

    index.setLastRebalance(getTimeStamp());
    index.setRedeemed(false);
  }

  /**
   * @notice The function updates the token weights and rebalances the portfolio to the new weights
   * @param denorms The new token weights of the portfolio
   * @param _slippage Array of the slippage values passed
   * @param _lpSlippage Array of the lp slippage values passed
   * @param _swapHandler Address of the associated swap handler
   */
  function updateWeights(
    uint96[] calldata denorms,
    uint256[] calldata _slippage,
    uint256[] calldata _lpSlippage,
    address _swapHandler
  ) external virtual nonReentrant onlyAssetManager {
    address[] memory tokens = getTokens();
    validateUpdate(_swapHandler);
    if (denorms.length != tokens.length) {
      revert ErrorLibrary.LengthsDontMatch();
    }
    if (tokens.length != _slippage.length || tokens.length != _lpSlippage.length) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
    index.updateRecords(tokens, denorms);
    rebalance(_slippage, _lpSlippage, _swapHandler);
    emit UpdatedWeights(denorms);
  }

  /**
   * @notice The function rebalances the portfolio to the updated tokens with the updated weights
   * @param inputData The input calldata passed to the function
   */
  function updateTokens(
    FunctionParameters.UpdateTokens calldata inputData
  ) external virtual nonReentrant onlyAssetManager {
    address[] memory _tokens = getTokens();
    validateUpdate(inputData._swapHandler);
    if (
      _tokens.length != inputData._slippageSell.length ||
      inputData.tokens.length != inputData._slippageBuy.length ||
      _tokens.length != inputData._lpSlippageSell.length ||
      inputData.tokens.length != inputData._lpSlippageBuy.length
    ) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
    for (uint256 i = 0; i < inputData.tokens.length; i++) {
      RebalanceLibrary.updateTokensCheck(address(tokenRegistry), address(assetManagerConfig), inputData.tokens[i]);
    }

    uint256[] memory newDenorms = RebalanceLibrary.evaluateNewDenorms(index, inputData.tokens, inputData.denorms);

    if (index.totalSupply() > 0) {
      // sell - swap to BNB
      for (uint256 i = 0; i < _tokens.length; i++) {
        address _token = _tokens[i];
        if (newDenorms[i] == 0) {
          uint256 tokenBalance = getTokenBalance(_token);
          _pullAndSwap(
            _token,
            tokenBalance,
            address(this),
            inputData._slippageSell[i],
            inputData._lpSlippageSell[i],
            inputData._swapHandler
          );
        }
        index.deleteRecord(_token);
      }
    }

    index.updateTokenListAndRecords(inputData.tokens, inputData.denorms);
    rebalance(inputData._slippageBuy, inputData._lpSlippageBuy, inputData._swapHandler);

    emit UpdatedTokens(inputData.tokens, inputData.denorms);
  }

  /**
   * @notice This function returns the given token balance of the vault
   * @param _token Address of the token whose balance is to be calculated
   * @return Token balance of the index returned
   */
  function getTokenBalance(address _token) public view virtual returns (uint256) {
    return IndexSwapLibrary.getTokenBalance(index, _token);
  }

  /**
   * @notice This function swaps token using the swapHandler
   * @param _token Address of the token which has to be pulled from the vault and swapped
   * @param _amount Amount of the token to be pulled and swapped
   * @param _to Address that would receive the pulled and swapped tokens (Exchange Handler)
   * @param _slippage Array of the slippage values passed
   * @param _lpSlippage Array of the lp slippage values passed
   * @param _swapHandler Address of the associated swap handler
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

  /**
   * @notice This function swaps reward token to index token
   * @param rewardToken address of reward token to swap
   * @param swapHandler address fo swaphandler
   * @param buyToken address of buyToken token
   * @param amount amount of reward token to swap
   * @param slippage amount of slippage
   * @param _lpSlippage amount of lpSlippage
   */
  function swapRewardToken(
    address rewardToken,
    address swapHandler,
    address buyToken,
    uint256 amount,
    uint256 slippage,
    uint256 _lpSlippage
  ) external nonReentrant onlyAssetManager {
    validateUpdate(swapHandler);
    if (!tokenRegistry.isRewardToken(rewardToken)) {
      revert ErrorLibrary.NotRewardToken();
    }
    if (getDenorm(buyToken) == 0) {
      revert ErrorLibrary.TokenNotIndexToken();
    }
    _swapRewardToken(rewardToken, swapHandler, buyToken, amount, slippage, _lpSlippage);
  }

  /**
   * @notice This internal function is helper function of swapRewardToken
   * @param rewardToken address of reward token to swap
   * @param swapHandler address fo swaphandler
   * @param buyToken address of buyToken token
   * @param amount amount of reward token to swap
   * @param slippage amount of slippage
   * @param _lpSlippage amount of lpSlippage
   */
  function _swapRewardToken(
    address rewardToken,
    address swapHandler,
    address buyToken,
    uint256 amount,
    uint256 slippage,
    uint256 _lpSlippage
  ) internal {
    IHandler handler = IHandler(tokenRegistry.getTokenInformation(buyToken).handler);
    uint balanceBefore = handler.getTokenBalance(_vault, buyToken);
    exchange._pullFromVaultRewards(rewardToken, amount, address(exchange));
    exchange._swapTokenToToken(
      FunctionParameters.SwapTokenToTokenData(
        rewardToken,
        buyToken,
        _vault,
        swapHandler,
        _vault,
        amount,
        slippage,
        _lpSlippage,
        true
      )
    );
    uint balanceAfter = handler.getTokenBalance(_vault, buyToken);
    if (balanceAfter - balanceBefore == 0) {
      revert ErrorLibrary.SwapFailed();
    }
  }

  function _setPaused(bool _state) internal {
    index.setPaused(_state);
  }

  /**
   * @notice This function validate states before updating tokens and weights
   * @param _swapHandler Address of the swap handler to be used for validation
   */
  function validateUpdate(address _swapHandler) internal {
    if (tokenRegistry.getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (!(tokenRegistry.isSwapHandlerEnabled(_swapHandler))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    if (getRedeemed()) revert ErrorLibrary.AlreadyOngoingOperation();
  }

  /**
   * @notice This function returns if the tokens have been redeemed or not
   */
  function getRedeemed() internal view returns (bool) {
    return index.getRedeemed();
  }

  /**
   * @notice This internal function check for role
   * @param _role Role to be checked
   * @param user User address who is checked for the role
   * @return Boolean parameter for is the user having the specific role
   */
  function _checkRole(bytes memory _role, address user) internal view returns (bool) {
    return accessController.hasRole(keccak256(_role), user);
  }

  /**
   * @notice The function is used to get tokens from index
   * @return Array of token returned
   */
  function getTokens() internal view returns (address[] memory) {
    return index.getTokens();
  }

  /**
   * @notice The function is used to get denorm of particular token
   * @param _token Address of the token whose denorm is to be retreived
   * @return Denorm value for the token
   */
  function getDenorm(address _token) internal view returns (uint96) {
    return index.getRecord(_token).denorm;
  }

  /**
   * @notice This function returns timeStamp
   */
  function getTimeStamp() internal view returns (uint256) {
    return block.timestamp;
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
