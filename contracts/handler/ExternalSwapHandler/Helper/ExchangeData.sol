// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {IHandler} from "./../../IHandler.sol";
import {IIndexSwap} from "./../../../core/IIndexSwap.sol";

contract ExchangeData {
  /**
   * @notice Struct having data for the swap and deposit using the Meta Aggregator
   * @param sellAmount Amount of token being swapped
   * @param _lpSlippage LP Slippage value allowed for the swap
   * @param sellTokenAddress Address of the token being swapped from
   * @param buyTokenAddress Address of the token being swapped to
   * @param swapHandler Address of the swaphandler being used for the swap
   * @param portfolioToken Portfolio token for the deposit
   * @param callData Encoded data associated with the swap
   */
  struct ExSwapData {
    uint256[] sellAmount;
    uint256 _lpSlippage;
    address[] sellTokenAddress;
    address[] buyTokenAddress;
    address swapHandler;
    address portfolioToken;
    bytes[] callData;
  }

  /**
   * @notice Struct having data for the offchain investment values
   * @param buyAmount Amount to be invested
   * @param _buyToken Address of the token to be invested in
   * @param sellTokenAddress Address of the token in which the investment is being made
   * @param offChainHandler Address of the offchain handler being used
   * @param _buySwapData Encoded data for the investment
   */
  struct ZeroExData {
    uint256[] buyAmount;
    address[] _buyToken;
    address sellTokenAddress;
    address _offChainHandler;
    bytes[] _buySwapData;
  }

  /**
   * @notice Struct having data for the offchain withdrawal values
   * @param sellAmount Amount of token to be withd
   * @param sellTokenAddress Address of the token being swapped from
   * @param offChainHandler Address of the offchain handler being used
   * @param buySwapData Encoded data for the withdrawal
   */
  struct ZeroExWithdraw {
    uint256[] sellAmount;
    address[] sellTokenAddress;
    address offChainHandler;
    bytes[] buySwapData;
  }

  /**
   * @notice Struct having data for pulling tokens and redeeming during withdrawal
   * @param tokenAmount Amount of token to be pulled and redeemed
   * @param _lpSlippage LP Slippage amount allowed for the operation
   * @param token Address of the token being pulled and redeemed
   */
  struct RedeemData {
    uint256 tokenAmount;
    uint256[] _lpSlippage;
    address token;
  }

  /**
   * @notice Struct having data for `IndexOperationsData` struct and also other functions like `SwapAndCalculate`
   * @param buyAmount Amount of the token to be purchased
   * @param sellTokenAddress Address of the token being swapped from
   * @param _offChainHanlder Address of the offchain handler being used
   * @param _buySwapData Encoded data for the swap
   */
  struct InputData {
    uint256[] buyAmount;
    address sellTokenAddress;
    address _offChainHandler;
    bytes[] _buySwapData;
  }

  /**
   * @notice Struct having data for the `swapOffChainTokens` function from the Exchange handler
   * @param inputData Struct having different input params
   * @param index IndexSwap instance of the current fund
   * @param indexValue Value of the IndexSwap whose inforamtion has to be obtained
   * @param balance Token balance passed during the offchain swap
   * @param _lpSlippage Amount of LP Slippage allowed for the swap
   * @param _buyAmount Amount of token being swapped to
   * @param _token Portoflio token to be invested in
   * @param _toUser Address used to return the dust amount accumulated while investment/withdrawal
   */
  struct IndexOperationData {
    ExchangeData.InputData inputData;
    IIndexSwap index;
    uint256 indexValue;
    uint256 _lpSlippage;
    uint256 _buyAmount;
    address _token;
    address _toUser;
  }

  /**
   * @notice Struct having data for the offchain withdrawal
   * @param sellAmount Amount of token being withdrawn
   * @param userAmount Amount of sell token that the user is holding
   * @param sellTokenAddress Address of the token being swapped from
   * @param offChainHandler Address of the offchain handler being used
   * @param buyToken Address of the token being swapped to
   * @param swapData Enocoded swap data for the withdraw
   */
  struct withdrawData {
    uint256 sellAmount;
    uint256 userAmount;
    address sellTokenAddress;
    address offChainHandler;
    address buyToken;
    bytes swapData;
  }

  /**
   * @notice Struct having data for the swap of tokens using the offchain handler
   * @param sellAmount Amount of token being swapped
   * @param sellTokenAddress Address of the token being swapped from
   * @param buyTokenAddress Address of the token being swapped to
   * @param swapHandler Address of the offchain swaphandler being used
   * @param callData Encoded calldata for the swap
   */
  struct MetaSwapData {
    uint256 sellAmount;
    address sellTokenAddress;
    address buyTokenAddress;
    address swapHandler;
    bytes callData;
  }
}
