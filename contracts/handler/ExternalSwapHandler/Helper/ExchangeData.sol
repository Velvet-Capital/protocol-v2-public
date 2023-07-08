// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IHandler} from "./../../IHandler.sol";
import {IIndexSwap} from "./../../../core/IIndexSwap.sol";

contract ExchangeData {
  struct ExData {
    uint256 sellAmount;
    uint256 protocolFee;
    address sellTokenAddress;
    address buyTokenAddress;
    address swapHandler;
    address portfolioToken;
    bytes callData;
  }

  struct ExSwapData {
    uint256[] sellAmount;
    uint256[] protocolFee;
    uint256 _lpSlippage;
    address[] sellTokenAddress;
    address[] buyTokenAddress;
    address swapHandler;
    address portfolioToken;
    bytes[] callData;
  }

  struct SwapData {
    address sellTokenAddress;
    address buyTokenAddress;
    address _to;
    uint256 sellAmount;
    uint256 protocolFee;
    bytes callData;
  }

  struct ZeroExData {
    uint256[] buyAmount;
    uint256[] protocolFee;
    address[] _buyToken;
    address sellTokenAddress;
    address _offChainHandler;
    bytes[] _buySwapData;
  }

  struct ZeroExWithdraw {
    uint256[] sellAmount;
    uint256[] protocolFee;
    address[] sellTokenAddress;
    address offChainHandler;
    bytes[] buySwapData;
  }

  struct RedeemData {
    uint256 tokenAmount;
    uint256[] _lpSlippage;
    address token;
  }

  struct InputData {
    uint256[] buyAmount;
    address sellTokenAddress;
    address _offChainHandler;
    bytes[] _buySwapData;
  }

  struct IndexOperationData {
    ExchangeData.InputData inputData;
    IIndexSwap index;
    uint256 indexValue;
    uint256 protocolFee;
    uint256 balance;
    uint256 _lpSlippage;
    uint256 _buyAmount;
    address _token;
    address _toUser;
  }

  struct PrimaryWithdraw {
    uint256[] sellAmount;
    uint256[] protocolFee;
    uint256 tokenAmount;
    address buyToken;
    address offChainHandler;
    bytes[] buySwapData;
  }

  struct withdrawData {
    uint256 sellAmount;
    uint256 protocolFee;
    uint256 userAmount;
    address sellTokenAddress;
    address offChainHandler;
    address buyToken;
    bytes swapData;
  }

  struct MetaSwapData {
    uint256 sellAmount;
    uint256 protocolFee;
    address sellTokenAddress;
    address buyTokenAddress;
    address swapHandler;
    bytes callData;
  }
}
