// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/Initializable.sol";
import {ExchangeData} from "../ExternalSwapHandler/Helper/ExchangeData.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {ApproveControl} from "../ApproveControl.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";
import {ExternalSlippageControl} from "../ExternalSlippageControl.sol";

contract BebopHandler is Initializable, ApproveControl, ExternalSlippageControl {
  using SafeERC20Upgradeable for IERC20Upgradeable;
  address internal swapTarget;
  IPriceOracle internal oracle;

  function init(address _swapTarget, address _oracle) external initializer {
    swapTarget = _swapTarget;
    oracle = IPriceOracle(_oracle);
  }

  function swap(
    address sellTokenAddress,
    address buyTokenAddress,
    uint256 sellAmount,
    bytes memory callData,
    address _to
  ) public payable {
    uint256 tokenBalance = IERC20Upgradeable(sellTokenAddress).balanceOf(address(this));
    if (tokenBalance < sellAmount) {
      revert ErrorLibrary.InsufficientFunds(tokenBalance, sellAmount);
    }
    setAllowance(sellTokenAddress, swapTarget, sellAmount);
    uint256 tokensBefore = IERC20Upgradeable(buyTokenAddress).balanceOf(address(this));
    (bool success, ) = swapTarget.call(callData);
    if (!success) {
      revert ErrorLibrary.SwapFailed();
    }
    uint256 tokensSwapped;

    uint buyTokenBalance = IERC20Upgradeable(buyTokenAddress).balanceOf(address(this));
    tokensSwapped = buyTokenBalance - tokensBefore;
    if (tokensSwapped == 0) {
      revert ErrorLibrary.ZeroTokensSwapped();
    }
    uint priceSellToken = oracle.getPriceTokenUSD18Decimals(sellTokenAddress, sellAmount);
    uint priceBuyToken = oracle.getPriceTokenUSD18Decimals(buyTokenAddress, buyTokenBalance);

    validateSwap(priceSellToken, priceBuyToken);
    TransferHelper.safeTransfer(buyTokenAddress, _to, IERC20Upgradeable(buyTokenAddress).balanceOf(address(this)));
  }

  receive() external payable {}
}
