// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

interface IExternalSwapHandler {
  function swap(
    address sellTokenAddress,
    address buyTokenAddress,
    uint sellAmount,
    uint protocolFee,
    bytes memory callData,
    address _to
  ) external payable;

  function setAllowance(address _token, address _spender, uint _sellAmount) external;
}
