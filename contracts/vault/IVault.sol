// SPDX-License-Identifier: LGPL-3.0-only

/**
 * @title MyModule for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for creating a bridge between the contract and the gnosis safe vault
 * @dev This contract includes functionalities:
 *      1. Add a new owner of the vault
 *      2. Transfer BNB and other tokens to and fro from vault
 */
pragma solidity 0.8.16;

interface IVault {

    function executeWallet(
        address handlerAddresses,
        bytes calldata encodedCalls
    ) external returns (bool isSuccess);

    function executeDeposit(
        address _lpToken,
        uint256 _amount,
        address handlerAddresses,
        bytes calldata encodedCalls
    ) external returns (bool isSuccess);
    function executeWalletDelegate(bytes calldata encodedCalls)external returns (bool isSuccess);
}
