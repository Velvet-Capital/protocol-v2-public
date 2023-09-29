// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/utils/SafeERC20Upgradeable.sol";

abstract contract ApproveControl {
  using SafeERC20Upgradeable for IERC20Upgradeable;

  function setAllowance(address _token, address _spender, uint256 _sellAmount) internal {
    uint256 _currentAllowance = IERC20Upgradeable(_token).allowance(address(this), _spender);
    if (_currentAllowance != _sellAmount) {
      IERC20Upgradeable(_token).safeDecreaseAllowance(_spender, _currentAllowance);
      IERC20Upgradeable(_token).safeIncreaseAllowance(_spender, _sellAmount);
    }
  }
}