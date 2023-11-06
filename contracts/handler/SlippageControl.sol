// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";

/*
  This contract is for LP slippage to protect the users of an imbalanced pool
 */
abstract contract SlippageControl is Ownable {
  uint256 public maxSlippage;

  uint256 public constant HUNDRED_PERCENT = 10_000;

  event AddOrUpdateProtocolSlippage(uint256 _slippage);

  /**
   * @notice This function updates/adds max slippage allowed
   */
  function addOrUpdateProtocolSlippage(uint256 _slippage) public onlyOwner {
    if (_slippage >= HUNDRED_PERCENT) {
      revert ErrorLibrary.IncorrectSlippageRange();
    }
    maxSlippage = _slippage;
    emit AddOrUpdateProtocolSlippage(_slippage);
  }

  /**
   * @notice This function calculates slippage from the called protocol
   */
  function getSlippage(uint256 _amount, uint256 _lpSlippage) internal view returns (uint256 minAmount) {
    if (maxSlippage < _lpSlippage) {
      revert ErrorLibrary.InvalidLPSlippage();
    }
    minAmount = (_amount * (HUNDRED_PERCENT - _lpSlippage)) / (HUNDRED_PERCENT);
  }

  /**
   * @notice This function validates liquidity slippage from the called protocol
   * @param _amountA The amount of tokenA used by the protocol
   * @param _amountB The amount of tokenB used by the protocol
   * @param _priceA The price of tokenA
   * @param _priceB The price of tokenB
   * @param _lpSlippage The max slippage between tokenA and tokenB accepted
   */
  function _validateLPSlippage(
    uint _amountA,
    uint _amountB,
    uint _priceA,
    uint _priceB,
    uint _lpSlippage
  ) internal view {
    if (maxSlippage < _lpSlippage) {
      revert ErrorLibrary.InvalidLPSlippage();
    }
    uint decimal = 10 ** 18;
    /**
     *  amountA * priceA = amountB * priceB ( in ideal scenario )
     *  amountA/amountB - priceB/priceA = 0
     *  When the amount of either token is not fully accepted then the
     *  amountA and amountB wont be equal to 0 and that becomes our lpSlippage
     */

    uint amountDivision = (_amountA * decimal) / (_amountB); // 18 decimals 
    uint priceDivision = (_priceB * decimal) / (_priceA); // 18 decimals
    uint absoluteValue = 0;
    if (amountDivision > priceDivision) {
      absoluteValue = amountDivision - priceDivision; // 18 decimals
    } else {
      absoluteValue = priceDivision - amountDivision; // 18 decimals
    }
    uint256 percentageDifference = (absoluteValue * decimal) / priceDivision;
    if (percentageDifference * HUNDRED_PERCENT > (_lpSlippage * decimal)) {
      revert ErrorLibrary.InvalidAmount();
    }
  }
}