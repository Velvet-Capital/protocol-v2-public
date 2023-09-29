// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";

/*
  This contract is for DEX slippage to protect the users of high slippage due to market conditions
 */
abstract contract ExternalSlippageControl is Ownable {
  uint256 public constant HUNDRED_PERCENT = 10_000;
  uint256 public constant MAX_SLIPPAGE = 1_000;

  uint256 public maxSlippage = MAX_SLIPPAGE;

  event AddOrUpdateProtocolSlippage(uint256 _slippage);

  /**
   * @notice This function updates/adds max slippage allowed
   */
  function addOrUpdateProtocolSlippage(uint256 _slippage) public onlyOwner {
    if (!(_slippage < HUNDRED_PERCENT && _slippage <= MAX_SLIPPAGE)) revert ErrorLibrary.IncorrectSlippageRange();
    maxSlippage = _slippage;
    emit AddOrUpdateProtocolSlippage(_slippage);
  }

  /**
   * @notice This function calculates slippage from the called protocol
   */
  function getSlippage(uint256 _amount) private view returns (uint256 minAmount) {
    minAmount = (_amount * (HUNDRED_PERCENT - maxSlippage)) / (HUNDRED_PERCENT);
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