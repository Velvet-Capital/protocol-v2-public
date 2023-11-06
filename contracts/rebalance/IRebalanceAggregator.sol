// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

interface IRebalanceAggregator {
  function init(
    address _index,
    address _accessController,
    address _exchange,
    address _tokenRegistry,
    address _assetManagerConfig,
    address _vault
  ) external;

  function _revertRebalance(uint256[] memory amounts, uint256 _lpSlippage, address token) external;
}
