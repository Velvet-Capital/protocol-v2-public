// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";

abstract contract ExternalSlippageControl is Ownable {
  using SafeMath for uint256;

  uint256 public constant HUNDRED_PERCENT = 10_000;
  uint256 public constant MAX_SLIPPAGE = 1_000;

  uint256 public maxSlippage = MAX_SLIPPAGE;

  event AddOrUpdateProtocolSlippage(uint256 time, uint256 _slippage);

  /**
   * @notice This function updates/adds max slippage allowed
   */
  function addOrUpdateProtocolSlippage(uint256 _slippage) public onlyOwner {
    require(_slippage < HUNDRED_PERCENT && _slippage <= MAX_SLIPPAGE, "incorrect slippage range");
    maxSlippage = _slippage;
    emit AddOrUpdateProtocolSlippage(block.timestamp, _slippage);
  }

  /**
   * @notice This function calculates slippage from the called protocol
   */
  function getSlippage(uint256 _amount) internal view returns (uint256 minAmount) {
    minAmount = _amount.mul(HUNDRED_PERCENT.sub(maxSlippage)).div(HUNDRED_PERCENT);
  }

  /**
   * @notice This function validates the sell amount and buy amount and checks for validity
   */

  function validateSwap(uint priceSellToken, uint priceBuyToken) internal view {
    if (maxSlippage != 0) {
      if (priceBuyToken < getSlippage(priceSellToken)) {
        revert ErrorLibrary.InvalidAmount();
      }
    }
  }
}
