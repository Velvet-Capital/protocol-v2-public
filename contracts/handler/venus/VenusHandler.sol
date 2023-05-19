// SPDX-License-Identifier: MIT

// Venus Official Docs: https://docs.venus.io/docs/getstarted#guides
// Venus GitHub: https://github.com/VenusProtocol

/**
 * @title Handler for the Venus protocol
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem assets
 *      to/from the Venus protocol.
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to the Venus protocol
 *      2. Redeem tokens from the Venus protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import { TransferHelper } from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import { ComptrollerInterface } from "./interfaces/ComptrollerInterface.sol";
import { VBep20Storage } from "./interfaces/VBep20Storage.sol";
import { VBep20Interface } from "./interfaces/VBep20Interface.sol";

import { IHandler } from "../IHandler.sol";
import { ErrorLibrary } from "./../../library/ErrorLibrary.sol";
import { FunctionParameters } from "contracts/FunctionParameters.sol";

contract VenusHandler is IHandler {
  address public constant COMPTROLLER =
    0xfD36E2c2a6789Db23113685031d7F16329158384;

  event Deposit(
    uint256 time,
    address indexed user,
    address indexed token,
    uint256[] amounts,
    address indexed to
  );
  event Redeem(
    uint256 time,
    address indexed user,
    address indexed token,
    uint256 amount,
    address indexed to,
    bool isWETH
  );

   /**
   * @notice This function deposits assets to the Venus protocol
   * @param _vAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the vTokens in return
   */
  function deposit(
    address _vAsset,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to
  ) public payable override {
    if (_vAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(
      getUnderlying(_vAsset)[0]
    );
    VBep20Interface vToken = VBep20Interface(_vAsset);

    if (msg.value == 0) {
      TransferHelper.safeApprove(address(underlyingToken), address(vToken), 0);
      TransferHelper.safeApprove(
        address(underlyingToken),
        address(vToken),
        _amount[0]
      );
      vToken.mint(_amount[0]);
    } else {
      require(msg.value >= _amount[0], "zero address passed");
      vToken.mint{ value: _amount[0] }();
    }

    if (_to != address(this)) {
      uint256 vBalance = vToken.balanceOf(address(this));
      TransferHelper.safeTransfer(_vAsset, _to, vBalance);
    }
    emit Deposit(block.timestamp, msg.sender, _vAsset, _amount, _to);
  }

  /**
   * @notice This function redeems assets from the Venus protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData)
    public
    override
  {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    VBep20Interface vToken = VBep20Interface(inputData._yieldAsset);
    if (inputData._amount > vToken.balanceOf(address(this))) {
      revert ErrorLibrary.InsufficientBalance();
    }
    if (vToken.redeem(inputData._amount) != 0) {
      revert ErrorLibrary.RedeemingFailed();
    }

    if (inputData._to != address(this)) {
      IERC20Upgradeable underlyingToken = IERC20Upgradeable(
        getUnderlying(inputData._yieldAsset)[0]
      );
      if (inputData.isWETH) {
        (bool success, ) = payable(inputData._to).call{
          value: address(this).balance
        }("");
        require(success, "Transfer failed.");
      } else {
        IERC20Upgradeable token = IERC20Upgradeable(underlyingToken);
        uint256 tokenAmount = token.balanceOf(address(this));
        TransferHelper.safeTransfer(
          address(underlyingToken),
          inputData._to,
          tokenAmount
        );
      }
    }
    emit Redeem(
      block.timestamp,
      msg.sender,
      inputData._yieldAsset,
      inputData._amount,
      inputData._to,
      inputData.isWETH
    );
  }

  /**
   * @notice This function checks if a given address is of a Venus native token or not
   */
  function isVToken(address _vToken) internal view returns (bool isvToken) {
    ComptrollerInterface comptroller = ComptrollerInterface(COMPTROLLER);
    (isvToken, ) = comptroller.markets(_vToken);
  }

   /**
   * @notice This function returns address of the underlying asset
   * @param _vToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _vToken)
    public
    view
    override
    returns (address[] memory)
  {
    if (_vToken == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](1);
    if (_vToken == 0xA07c5b74C9B40447a954e1466938b865b6BBea36) {
      underlying[0] = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
      return underlying;
    }
    if (!isVToken(_vToken)) {
      revert ErrorLibrary.NotVToken();
    }
    VBep20Storage vToken = VBep20Storage(_vToken);
    underlying[0] = vToken.underlying();
    return underlying;
  }

  /**
   * @notice This function returns the protocol token balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address t)
    public
    view
    override
    returns (uint256 tokenBalance)
  {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    VBep20Interface token = VBep20Interface(t);
    tokenBalance = token.balanceOf(_tokenHolder);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address t)
    public
    override
    returns (uint256[] memory)
  {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint256[] memory tokenBalance = new uint256[](1);
    VBep20Interface token = VBep20Interface(t);
    tokenBalance[0] = token.balanceOfUnderlying(_tokenHolder);
    return tokenBalance;
  }

  function encodeData(address t, uint256 _amount)
    public
    returns (bytes memory)
  {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address _venusToken, address _holder)
    public
    pure
    returns (bytes memory, address)
  {
    return (
      abi.encodeWithSelector(ComptrollerInterface.claimVenus.selector, _holder),
      COMPTROLLER
    );
  }

  receive() external payable {}
}
