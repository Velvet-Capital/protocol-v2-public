// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";

abstract contract SlippageControl is Ownable {
  using SafeMath for uint256;

  uint256 public maxSlippage;

  uint256 public constant HUNDRED_PERCENT = 10_000;

  event AddOrUpdateProtocolSlippage(uint256 time, uint256 _slippage);

  /**
   * @notice This function updates/adds max slippage allowed
   */
  function addOrUpdateProtocolSlippage(uint256 _slippage) public onlyOwner {
    require(_slippage < HUNDRED_PERCENT, "incorrect slippage range");
    maxSlippage = _slippage;
    emit AddOrUpdateProtocolSlippage(block.timestamp, _slippage);
  }

  /**
   * @notice This function calculates slippage from the called protocol
   */
  function getSlippage(uint256 _amount, uint256 _lpSlippage) internal view returns (uint256 minAmount) {
    require(maxSlippage >= _lpSlippage, "Invalid LP Slippage!");
    minAmount = _amount.mul(HUNDRED_PERCENT.sub(_lpSlippage)).div(HUNDRED_PERCENT);
  }

  /**
   * @notice This function validates liquidity slippage from the called protocol
   */
  function _validateLPSlippage(
    uint _amountA,
    uint _amountB,
    uint _priceA,
    uint _priceB,
    uint _lpSlippage
  ) internal view {
    require(maxSlippage >= _lpSlippage, "Invalid LP Slippage!");
    uint amountDivision = _amountA.mul(10 ** 18).div(_amountB);
    uint priceDivision = _priceB.mul(10 ** 18).div(_priceA);
    uint absoluteValue = 0;
    if (amountDivision > priceDivision) {
      absoluteValue = amountDivision.sub(priceDivision);
    } else {
      absoluteValue = priceDivision.sub(amountDivision);
    }
    if (absoluteValue.mul(10 ** 2) > (_lpSlippage.mul(10 ** 18))) {
      revert ErrorLibrary.InvalidAmount();
    }
  }
}
