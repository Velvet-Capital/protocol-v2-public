// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

interface IOffChainRebalance {
  function init(IIndexSwap _index, address _accessController) external;

  function unstakeZeroEx(uint256[] memory swapAmounts, address[] memory tokens, address _swapHandler) external;
}
