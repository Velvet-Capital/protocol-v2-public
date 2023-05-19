// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import { Ownable } from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";

abstract contract SlippageControl is Ownable {
  using SafeMath for uint256;

  uint256 public maxSlippage;

  uint256 public constant HUNDRED_PERCENT = 10_000;

  function addOrUpdateProtocolSlippage(uint256 _slippage) public onlyOwner {
    require(_slippage < HUNDRED_PERCENT, "incorrect slippage range");
    maxSlippage = _slippage;
  }

  function getSlippage(uint256 _amount, uint256 _lpSlippage)
    internal
    view
    returns (uint256 minAmount)
  {
    require(maxSlippage >= _lpSlippage, "Invalid LP Slippage!");
    minAmount = _amount.mul(HUNDRED_PERCENT.sub(_lpSlippage)).div(
      HUNDRED_PERCENT
    );
  }
}
