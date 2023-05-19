// SPDX-License-Identifier: MIT

/**
 * @title IRebalancing for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used by asset manager to update weights, update tokens and call pause function. It also
 *         includes the feeModule logic.
 * @dev This contract includes functionalities:
 *      1. Pause the IndexSwap contract
 *      2. Update the token list
 *      3. Update the token weight
 *      4. Update the treasury address
 */

pragma solidity 0.8.16;

import { IIndexSwap } from "../core/IIndexSwap.sol";

interface IRebalancing {
  event FeeCharged(uint256 charged, address token, uint256 amount);
  event UpdatedWeights(uint256 updated, uint96[] newDenorms);
  event UpdatedTokens(
    uint256 updated,
    address[] newTokens,
    uint96[] newDenorms
  );

  function init(
    IIndexSwap _index,
    address _accessController
  ) external;

  /**
    @notice The function will pause the InvestInFund() and Withdrawal().
    @param _state The state is bool value which needs to input by the Index Manager.
    */
  function setPause(bool _state) external;

  /**
   * @notice The function updates the token weights and rebalances the portfolio to the new weights
   * @param denorms The new token weights of the portfolio
   */
  function updateWeights(uint96[] calldata denorms, uint256 _slippage) external;

  /**
   * @notice The function rebalances the portfolio to the updated tokens with the updated weights
   * @param tokens The updated token list of the portfolio
   * @param denorms The new weights for for the portfolio
   */
  function updateTokens(
    address[] memory tokens,
    uint96[] memory denorms,
    uint256[] calldata _slippageSell,
    uint256[] calldata _slippageBuy
  ) external;

  function updateTreasury(address _newAddress) external;

  function getCurrentWeights() external returns (uint256[] memory);
}
