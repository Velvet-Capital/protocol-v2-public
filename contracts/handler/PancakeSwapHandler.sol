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

import {IUniswapV2Router02} from "../interfaces/IUniswapV2Router02.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/Initializable.sol";

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {IPriceOracle} from "../oracle/IPriceOracle.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {ExternalSlippageControl} from "./ExternalSlippageControl.sol";

contract PancakeSwapHandler is Initializable, Ownable, ExternalSlippageControl {
  IUniswapV2Router02 internal pancakeSwapRouter;
  IPriceOracle internal oracle;

  uint256 public constant DIVISOR_INT = 10_000;

  constructor() {}

  function init(address _router, address _oracle) external initializer {
    pancakeSwapRouter = IUniswapV2Router02(_router);
    oracle = IPriceOracle(_oracle);
  }

  function getETH() public view returns (address) {
    return pancakeSwapRouter.WETH();
  }

  function getSwapAddress() public view returns (address) {
    return address(pancakeSwapRouter);
  }

  function swapTokensToETH(
    uint256 _swapAmount,
    uint256 _slippage,
    address _t,
    address _to,
    bool isEnabled
  ) public returns (uint256 swapResult) {
    TransferHelper.safeApprove(_t, address(pancakeSwapRouter), _swapAmount);
    uint256 internalSlippage = isEnabled ? getSlippage(_swapAmount, _slippage, getPathForToken(_t)) : 1;
    swapResult = pancakeSwapRouter.swapExactTokensForETH(
      _swapAmount,
      internalSlippage,
      getPathForToken(_t),
      _to,
      block.timestamp
    )[1];
  }

  function swapTokenToTokens(
    uint256 _swapAmount,
    uint256 _slippage,
    address _tokenIn,
    address _tokenOut,
    address _to,
    bool isEnabled
  ) public returns (uint256 swapResult) {
    TransferHelper.safeApprove(_tokenIn, address(pancakeSwapRouter), _swapAmount);
    if (isEnabled) {
      swapResult = pancakeSwapRouter.swapExactTokensForTokens(
        _swapAmount,
        getSlippage(_swapAmount, _slippage, getPathForMultiToken(_tokenIn, _tokenOut)),
        getPathForMultiToken(_tokenIn, _tokenOut),
        _to,
        block.timestamp
      )[1];
    } else {
      swapResult = pancakeSwapRouter.swapExactTokensForTokens(
        _swapAmount,
        1,
        getPathForRewardToken(_tokenIn, _tokenOut),
        _to,
        block.timestamp
      )[2];
    }
  }

  function swapETHToTokens(uint256 _slippage, address _t, address _to) public payable returns (uint256 swapResult) {
    swapResult = pancakeSwapRouter.swapExactETHForTokens{value: msg.value}(
      getSlippage(msg.value, _slippage, getPathForETH(_t)),
      getPathForETH(_t),
      _to,
      block.timestamp
    )[1];
  }

  /**
   * @notice The function sets the path (ETH, token) for a token
   * @return Path for (ETH, token)
   */
  function getPathForETH(address crypto) public view returns (address[] memory) {
    address[] memory path = new address[](2);
    path[0] = getETH();
    path[1] = crypto;

    return path;
  }

  /**
   * @notice The function sets the path (token, ETH) for a token
   * @return Path for (token, ETH)
   */
  function getPathForToken(address token) public view returns (address[] memory) {
    address[] memory path = new address[](2);
    path[0] = token;
    path[1] = getETH();

    return path;
  }

  /**
   * @notice The function sets the path (token, token) for a token
   * @return Path for (token, token)
   */
  function getPathForMultiToken(address _tokenIn, address _tokenOut) public pure returns (address[] memory) {
    address[] memory path = new address[](2);
    path[0] = _tokenIn;
    path[1] = _tokenOut;

    return path;
  }

  /**
   * @notice The function sets the path (token, token) for a token
   * @return Path for (token, token)
   */
  function getPathForRewardToken(address _tokenIn, address _tokenOut) public view returns (address[] memory) {
    address[] memory path = new address[](3);
    path[0] = _tokenIn;
    path[1] = getETH();
    path[2] = _tokenOut;

    return path;
  }

  function getSlippage(
    uint256 _amount,
    uint256 _slippage,
    address[] memory path
  ) internal view returns (uint256 minAmount) {
    if (!(_slippage < DIVISOR_INT)) {
      revert ErrorLibrary.SlippageCannotBeGreaterThan100();
    }
    if (_slippage > maxSlippage) {
      revert ErrorLibrary.InvalidSlippage();
    }
    uint256 currentAmount;
    if (path[0] == getETH()) {
      currentAmount = oracle.getPriceForAmount(path[1], _amount, false);
    } else if (path[1] != getETH()) {
      currentAmount = oracle.getPriceForTokenAmount(path[0], path[1], _amount);
    } else {
      currentAmount = oracle.getPriceForAmount(path[0], _amount, true);
    }
    minAmount = (currentAmount * (DIVISOR_INT - _slippage)) / (DIVISOR_INT);
  }
}
