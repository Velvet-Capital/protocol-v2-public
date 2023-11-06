// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;
import {ErrorLibrary} from "../library/ErrorLibrary.sol";

contract MockSlippageControl {
  uint256 public maxSlippage;

  uint256 public constant HUNDRED_PERCENT = 10_000;

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
  function _validateLPSlippage(uint _amountA, uint _amountB, uint _priceA, uint _priceB, uint _lpSlippage) public view returns(bool){
    /**
     *  amountA * priceA = amountB * priceB ( in ideal scenario )
     *  amountA/amountB - priceB/priceA = 0
     *  When the amount of either token is not fully accepted then the
     *  amountA and amountB wont be equal to 0 and that becomes our lpSlippage
     */

    uint amountDivision = (_amountA * (10 ** 18)) / (_amountB); // 18 decimals
    uint priceDivision = (_priceB * (10 ** 18)) / (_priceA); // 18 decimals
    uint absoluteValue = 0;
    if (amountDivision > priceDivision) {
      absoluteValue = amountDivision - priceDivision; // 18 decimals
    } else {
      absoluteValue = priceDivision - amountDivision; // 18 decimals
    }
    // Calculate the percentage difference
    uint256 percentageDifference = (absoluteValue * (10 ** 18)) / priceDivision;

    // Convert lpSlippage to the same scale as percentageDifference
    uint256 slippageLimit = _lpSlippage * ((10 ** 18) / 10 ** 4);

    return percentageDifference < slippageLimit;
  }
}
