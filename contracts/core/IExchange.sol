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
import {IHandler} from "../handler/IHandler.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

interface IExchange {
  function init(address _accessController, address _safe, address _oracle, address _tokenRegistry) external;

  /**
   * @return Checks if token is WETH
   */
  function isWETH(address _token, address _protocol) external view returns (bool);

  function _pullFromVault(address t, uint256 amount, address to) external;

  function _pullFromVaultRewards(address token, uint256 amount, address to) external;

  /**
   * @notice The function swaps ETH to a specific token
   * @param inputData includes the input parmas
   */
  function swapETHToToken(FunctionParameters.SwapETHToTokenPublicData calldata inputData) external payable;

  /**
   * @notice The function swaps a specific token to ETH
   * @dev Requires the tokens to be send to this contract address before swapping
   * @param inputData includes the input parmas
   * @return swapResult The outcome amount in ETH afer swapping
   */
  function _swapTokenToETH(
    FunctionParameters.SwapTokenToETHData calldata inputData
  ) external returns (uint256[] calldata);

  /**
   * @notice The function swaps a specific token to ETH
   * @dev Requires the tokens to be send to this contract address before swapping
   * @param inputData includes the input parmas
   * @return swapResult The outcome amount in ETH afer swapping
   */
  function _swapTokenToToken(FunctionParameters.SwapTokenToTokenData memory inputData) external returns (uint256);

  function _swapTokenToTokens(
    FunctionParameters.SwapTokenToTokensData memory inputData,uint256 balanceBefore
  ) external payable returns (uint256 investedAmountAfterSlippage);

  function _swapTokenToTokensOffChain(
    ExchangeData.InputData memory inputData,
    IIndexSwap index,
    uint256[] calldata _lpSlippage,
    address[] memory _tokens,
    uint256[] calldata _buyAmount,
    uint256 balanceBefore,
    address _toUser
  ) external returns (uint256 investedAmountAfterSlippage);

  function swapOffChainTokens(
    ExchangeData.IndexOperationData memory inputdata
  ) external returns (uint256 balanceInUSD, uint256 underlyingIndex);

  function claimTokens(IIndexSwap _index, address[] calldata _tokens) external;

  function oracle() external view returns (address);
}