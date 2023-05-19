// SPDX-License-Identifier: MIT

// Liqee Official Docs: https://docs.liqee.io/
// Liqee GitHub: https://github.com/Liqee

/**
 * @title Handler for the Liqee protocol
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem assets
 *      to/from the Liqee protocol.
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to the Liqee protocol
 *      2. Redeem tokens from the Liqee protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity ^0.8.16;

import { IHandler } from "../IHandler.sol";

import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import { TransferHelper } from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import { IiToken } from "./interfaces/IiToken.sol";
import { ErrorLibrary } from "./../../library/ErrorLibrary.sol";
import { IRewardDistributorV3 } from "./interfaces/IRewardDistributorV3.sol";
import { FunctionParameters } from "../../FunctionParameters.sol";

contract LiqeeHandler is IHandler {
  address constant liqeeBNB = 0x5aF1b6cA84693Cc8E733C8273Ba260095B3D05CA;
  address constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
  address public constant REWARD_DISTRIBUTOR =
    0x6fC21a5a767212E8d366B3325bAc2511bDeF0Ef4;

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
   * @notice This function deposits assets to the Liqee protocol
   * @param _iAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the iTokens in return
   */
  function deposit(
    address _iAsset,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to
  ) public payable override {
    if (_iAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(
      getUnderlying(_iAsset)[0]
    );
    IiToken iToken = IiToken(_iAsset);

    if (msg.value == 0) {
      TransferHelper.safeApprove(address(underlyingToken), address(iToken), 0);
      TransferHelper.safeApprove(
        address(underlyingToken),
        address(iToken),
        _amount[0]
      );
      iToken.mint(_to, _amount[0]);
    } else {
      if (msg.value < _amount[0]) {
        revert ErrorLibrary.MintAmountMustBeEqualToValuePassed();
      }
      iToken.mint{ value: _amount[0] }(_to);
    }
    emit Deposit(block.timestamp, msg.sender, _iAsset, _amount, _to);
  }

  /**
   * @notice This function redeems assets from the Liqee protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData)
    public
    override
  {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(
      getUnderlying(inputData._yieldAsset)[0]
    );
    IiToken iToken = IiToken(inputData._yieldAsset);

    if (inputData._amount > iToken.balanceOf(address(this))) {
      revert ErrorLibrary.NotEnoughBalanceInLiqeeProtocol();
    }

    iToken.redeem(address(this), inputData._amount);

    if (inputData._to != address(this)) {
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
   * @notice This function returns address of the underlying asset
   * @param _liqeeToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _liqeeToken)
    public
    view
    override
    returns (address[] memory)
  {
    if (_liqeeToken == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](1);

    if (_liqeeToken == liqeeBNB) {
      underlying[0] = WBNB;
      return underlying;
    }

    IiToken liqeeToken = IiToken(_liqeeToken);
    underlying[0] = address(liqeeToken.underlying());
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
    if (_tokenHolder == address(0) || t == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IiToken token = IiToken(t);
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
    if (_tokenHolder == address(0) || t == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint256[] memory tokenBalance = new uint256[](1);

    IiToken token = IiToken(t);
    tokenBalance[0] = token.balanceOfUnderlying(_tokenHolder);
    return tokenBalance;
  }

  function encodeData(address t, uint256 _amount)
    public
    returns (bytes memory)
  {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address _liqeeToken, address _holder)
    public
    pure
    returns (bytes memory, address)
  {
    address[] memory holders = new address[](1);
    holders[0] = _holder;
    return (
      abi.encodeWithSelector(
        IRewardDistributorV3.claimAllReward.selector,
        holders
      ),
      REWARD_DISTRIBUTOR
    );
  }

  receive() external payable {}
}
