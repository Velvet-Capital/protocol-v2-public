// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/Initializable.sol";
import {ExchangeData} from "../ExternalSwapHandler/Helper/ExchangeData.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";

contract OneInchHandler is Initializable {
  using SafeERC20Upgradeable for IERC20Upgradeable;

  address public WETH;
  address public swapTarget;

  function init(address _WETH, address _swapTarget) external initializer {
    swapTarget = _swapTarget;
    WETH = _WETH;
  }

  // function updateSwapTarget(address){}

  function swap(
    address sellTokenAddress,
    address buyTokenAddress,
    uint256 sellAmount,
    uint256 protocolFee,
    bytes memory callData,
    address _to
  ) public payable {
    uint256 tokenBalance = IERC20Upgradeable(sellTokenAddress).balanceOf(address(this));

    if (tokenBalance < sellAmount) {
      revert ErrorLibrary.InsufficientFunds(tokenBalance, sellAmount);
    }
    uint256 ethBalance = address(this).balance;
    if (ethBalance < protocolFee) {
      revert ErrorLibrary.InsufficientFeeFunds(ethBalance, protocolFee);
    }

    setAllowance(sellTokenAddress, swapTarget, sellAmount);

    uint256 tokensBefore = IERC20Upgradeable(buyTokenAddress).balanceOf(address(this));
    (bool success, ) = swapTarget.call{value: protocolFee}(callData);
    uint256 tokensSwapped = 0;

    if (success) {
      tokensSwapped = IERC20Upgradeable(buyTokenAddress).balanceOf(address(this)) - tokensBefore;
      if (tokensSwapped == 0) {
        revert ErrorLibrary.ZeroTokensSwapped();
      }
      TransferHelper.safeTransfer(buyTokenAddress, _to, IERC20Upgradeable(buyTokenAddress).balanceOf(address(this)));
    }
  }

  function setAllowance(address _token, address _spender, uint256 _sellAmount) public {
    uint256 _currentAllowance = IERC20Upgradeable(_token).allowance(address(this), _spender);
    if (_currentAllowance != _sellAmount) {
      IERC20Upgradeable(_token).safeDecreaseAllowance(_spender, _currentAllowance);
      IERC20Upgradeable(_token).safeIncreaseAllowance(_spender, _sellAmount);
    }
  }

  function getETH() public view returns (address wbnb) {
    wbnb = address(WETH);
  }

  receive() external payable {}
}
