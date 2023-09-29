// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {ISwapHandler} from "../handler/ISwapHandler.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";

abstract contract DustHandler {
  address public constant WETH = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

  // after investment if we can't deposit everything we might have underlying tokens left, no need to deposit/redeem - only swap
  function _returnDust(address _token, address _to) internal {
    if (_token == WETH) {
      (bool success, ) = payable(_to).call{value: address(this).balance}("");
      if (!success) revert ErrorLibrary.TransferFailed();
    } else {
      uint balance = IERC20Upgradeable(_token).balanceOf(address(this));
      TransferHelper.safeTransfer(_token, _to, balance);
    }
  }
}