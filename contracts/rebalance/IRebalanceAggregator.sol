// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import { IIndexSwap } from "../core/IIndexSwap.sol";
import { ExchangeData } from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

interface IRebalanceAggregator {
  function init(
    address _index,
    address _accessController
  ) external;
}
