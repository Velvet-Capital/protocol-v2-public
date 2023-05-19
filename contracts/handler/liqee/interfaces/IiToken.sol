// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";

interface IiToken {
    function isiToken() external returns (bool);

    function underlying() external view returns (IERC20Upgradeable);
    
    function balanceOf(address _account) external view returns (uint256);

    function balanceOfUnderlying(address _account) external returns (uint256);

    function mint(address recipient, uint256 mintAmount) external;

    // function mint() external payable;

    function mint(address _recipient) external payable;

    function exchangeRateCurrent() external returns (uint256);

    function supplyRatePerBlock() external view returns (uint256);

    function redeem(address _from, uint256 _redeemiToken) external;

    function redeemUnderlying(
        address _from,
        uint256 _redeemUnderlying
    ) external;
}
