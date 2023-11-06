// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface ISwapAdapter {
  function getAmountsOut(uint256 _swapAmount, address[] memory _path) external view returns (uint quote);

  function swapExactETHForTokens(
    uint256 _swapAmount,
    uint _slippage,
    address[] memory _path,
    address _to,
    uint _deadline
  ) external payable returns (uint swapResult);

  function swapExactTokensForETH(
    uint256 _swapAmount,
    uint _slippage,
    address[] memory _path,
    address _to,
    uint _deadline
  ) external returns (uint swapResult);

  function swapExactTokensForTokens(
    uint256 _swapAmount,
    uint _slippage,
    address[] memory _path,
    address _to,
    uint _deadline
  ) external returns (uint swapResult);

  function wETH() external view returns (address weth);
}
