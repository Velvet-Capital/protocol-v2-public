// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";

/*
  This contract is for LP slippage to protect the users of an imbalanced pool
 */
abstract contract SlippageControl is Ownable {
  uint256 public maxSlippage;

  uint256 public constant HUNDRED_PERCENT = 10_000;

  event AddOrUpdateProtocolSlippage(uint256 time, uint256 _slippage);

  /**
   * @notice This function updates/adds max slippage allowed
   */
  function addOrUpdateProtocolSlippage(uint256 _slippage) public onlyOwner {
    if (_slippage >= HUNDRED_PERCENT) {
      revert ErrorLibrary.IncorrectSlippageRange();
    }
    maxSlippage = _slippage;
    emit AddOrUpdateProtocolSlippage(block.timestamp, _slippage);
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

    /**
     *  amountA * priceA = amountB * priceB ( in ideal scenario )
     *  amountA/amountB - priceB/priceA = 0
     *  When the amount of either token is not fully accepted then the
     *  amountA and amountB wont be equal to 0 and that becomes our lpSlippage
     */

    uint amountDivision = (_amountA * (10 ** 18)) / (_amountB);
    uint priceDivision = (_priceB * (10 ** 18)) / (_priceA);
    uint absoluteValue = 0;
    if (amountDivision > priceDivision) {
      absoluteValue = amountDivision - priceDivision;
    } else {
      absoluteValue = priceDivision - amountDivision;
    }
    if (absoluteValue * (10 ** 2) > (_lpSlippage * (10 ** 18))) {
      revert ErrorLibrary.InvalidAmount();
    }
  }
}
