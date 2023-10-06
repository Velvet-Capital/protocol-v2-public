// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.16;

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

interface IOffChainRebalance {
  function init(
    IIndexSwap _index,
    address _accessController,
    address _exchange,
    address _tokenRegistry,
    address _assetManagerConfig,
    address _vault,
    address _aggregator
  ) external;

  function unstakeZeroEx(uint256[] memory swapAmounts, address[] memory tokens, address _swapHandler) external;
}
