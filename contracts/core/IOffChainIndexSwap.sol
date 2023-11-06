// SPDX-License-Identifier: BUSL-1.1

/**
 * @title IndexManager for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for transferring funds form vault to contract and vice versa 
           and swap tokens to and fro from BNB
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to vault
 *      2. Withdraw tokens from vault
 *      3. Swap BNB for tokens
 *      4. Swap tokens for BNB
 */

pragma solidity 0.8.16;

import {IIndexSwap} from "../core/IIndexSwap.sol";

import {FunctionParameters} from "../FunctionParameters.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

interface IOffChainIndexSwap {
  function init(address indexSwap) external;

  function redeemTokens(uint256 tokenAmount, address _token, address _swapHandler) external;

  function withdrawOffChain(ExchangeData.ZeroExWithdraw memory inputData) external;

  function getTokenAmounts(address _user, address _token) external returns (uint256[] memory);
}