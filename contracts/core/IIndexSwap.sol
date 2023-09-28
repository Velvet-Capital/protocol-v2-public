// SPDX-License-Identifier: MIT

/**
 * @title IndexSwap for the Index
 * @author Velvet.Capital
 * @notice This contract is used by the user to invest and withdraw from the index
 * @dev This contract includes functionalities:
 *      1. Invest in the particular fund
 *      2. Withdraw from the fund
 */

pragma solidity 0.8.16;

import {FunctionParameters} from "../FunctionParameters.sol";

interface IIndexSwap {
  function vault() external view returns (address);

  function feeModule() external view returns (address);

  function exchange() external view returns (address);

  function tokenRegistry() external view returns (address);

  function accessController() external view returns (address);

  function paused() external view returns (bool);

  function TOTAL_WEIGHT() external view returns (uint256);

  function iAssetManagerConfig() external view returns (address);

  /**
   * @dev Emitted when `value` tokens are moved from one account (`from`) to
   * another (`to`).
   *
   * Note that `value` may be zero.
   */
  event Transfer(address indexed from, address indexed to, uint256 value);

  /**
   * @dev Emitted when the allowance of a `spender` for an `owner` is set by
   * a call to {approve}. `value` is the new allowance.
   */
  event Approval(address indexed owner, address indexed spender, uint256 value);

  /**
   * @dev Returns the amount of tokens in existence.
   */
  function totalSupply() external view returns (uint256);

  /**
   * @dev Returns the amount of tokens owned by `account`.
   */
  function balanceOf(address account) external view returns (uint256);

  /**
   * @dev Moves `amount` tokens from the caller's account to `to`.
   *
   * Returns a boolean value indicating whether the operation succeeded.
   *
   * Emits a {Transfer} event.
   */
  function transfer(address to, uint256 amount) external returns (bool);

  /**
   * @dev Returns the remaining number of tokens that `spender` will be
   * allowed to spend on behalf of `owner` through {transferFrom}. This is
   * zero by default.
   *
   * This value changes when {approve} or {transferFrom} are called.
   */
  function allowance(address owner, address spender) external view returns (uint256);

  /**
   * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
   *
   * Returns a boolean value indicating whether the operation succeeded.
   *
   * IMPORTANT: Beware that changing an allowance with this method brings the risk
   * that someone may use both the old and the new allowance by unfortunate
   * transaction ordering. One possible solution to mitigate this race
   * condition is to first reduce the spender's allowance to 0 and set the
   * desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   *
   * Emits an {Approval} event.
   */
  function approve(address spender, uint256 amount) external returns (bool);

  /**
   * @dev Moves `amount` tokens from `from` to `to` using the
   * allowance mechanism. `amount` is then deducted from the caller's
   * allowance.
   *
   * Returns a boolean value indicating whether the operation succeeded.
   *
   * Emits a {Transfer} event.
   */
  function transferFrom(address from, address to, uint256 amount) external returns (bool);

  /**
   * @dev Token record data structure
   * @param lastDenormUpdate timestamp of last denorm change
   * @param denorm denormalized weight
   * @param index index of address in tokens array
   */
  struct Record {
    uint40 lastDenormUpdate;
    uint96 denorm;
    uint8 index;
  }

  /** @dev Emitted when public trades are enabled. */
  event LOG_PUBLIC_SWAP_ENABLED();

  function init(FunctionParameters.IndexSwapInitData calldata initData) external;

  /**
   * @dev Sets up the initial assets for the pool.
   * @param tokens Underlying tokens to initialize the pool with
   * @param denorms Initial denormalized weights for the tokens
   */
  function initToken(address[] calldata tokens, uint96[] calldata denorms) external;

  // For Minting Shares
  function mintShares(address _to, uint256 _amount) external;

  //For Burning Shares
  function burnShares(address _to, uint256 _amount) external;

  /**
     * @notice The function swaps BNB into the portfolio tokens after a user makes an investment
     * @dev The output of the swap is converted into USD to get the actual amount after slippage to calculate 
            the index token amount to mint
     * @dev (tokenBalance, vaultBalance) has to be calculated before swapping for the _mintShareAmount function 
            because during the swap the amount will change but the index token balance is still the same 
            (before minting)
     */
  function investInFund(uint256[] calldata _slippage, address _swapHandler) external payable;

  /**
     * @notice The function swaps the amount of portfolio tokens represented by the amount of index token back to 
               BNB and returns it to the user and burns the amount of index token being withdrawn
     * @param tokenAmount The index token amount the user wants to withdraw from the fund
     */
  function withdrawFund(uint256 tokenAmount, uint256[] calldata _slippage) external;

  /**
    @notice The function will pause the InvestInFund() and Withdrawal() called by the rebalancing contract.
    @param _state The state is bool value which needs to input by the Index Manager.
    */
  function setPaused(bool _state) external;

  function setRedeemed(bool _state) external;

  /**
    @notice The function will set lastRebalanced time called by the rebalancing contract.
    @param _time The time is block.timestamp, the moment when rebalance is done
  */
  function setLastRebalance(uint256 _time) external;

  /**
    @notice The function returns lastRebalanced time
  */
  function getLastRebalance() external view returns (uint256);

  /**
    @notice The function returns lastPaused time
  */
  function getLastPaused() external view returns (uint256);

  /**
   * @notice The function updates the record struct including the denorm information
   * @dev The token list is passed so the function can be called with current or updated token list
   * @param tokens The updated token list of the portfolio
   * @param denorms The new weights for for the portfolio
   */
  function updateRecords(address[] memory tokens, uint96[] memory denorms) external;

  /**
   * @notice This function update records with new tokenlist and weights
   * @param tokens Array of the tokens to be updated
   * @param _denorms Array of the updated denorm values
   */
  function updateTokenListAndRecords(address[] calldata tokens, uint96[] calldata _denorms) external;

  function getRedeemed() external view returns (bool);

  function getTokens() external view returns (address[] memory);

  function getRecord(address _token) external view returns (Record memory);

  function updateTokenList(address[] memory tokens) external;

  function deleteRecord(address t) external;

  function oracle() external view returns (address);

  function lastInvestmentTime(address owner) external view returns (uint256);

  function checkCoolDownPeriod(address _user) external view;

  function mintTokenAndSetCooldown(address _to, uint256 _mintAmount) external returns (uint256);

  function burnWithdraw(address _to, uint256 _mintAmount) external returns (uint256 exitFee);

  function setFlags(bool _pauseState, bool _redeemState) external;

  function reentrancyGuardEntered() external returns (bool);

  function nonReentrantBefore() external;

  function nonReentrantAfter() external;
}
