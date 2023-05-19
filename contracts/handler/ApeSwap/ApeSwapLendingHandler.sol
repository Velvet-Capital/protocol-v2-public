// SPDX-License-Identifier: MIT

// ApeSwap Official Docs: https://apeswap.gitbook.io/apeswap-finance/welcome/master
// ApeSwap GitHub: https://github.com/ApeSwapFinance/

/**
 * @title Handler for the ApeSwap's lending protocol
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem assets
 *      to/from the ApeSwap protocol.
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to the ApeSwap protocol
 *      2. Redeem tokens from the ApeSwap protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {IHandler} from "../IHandler.sol";

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {IcToken} from "./interfaces/IcToken.sol";
import {ApeSwapStorage} from "./interfaces/ApeSwapStorage.sol";
import {IRainMaker} from "./interfaces/IRainMaker.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";

import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {FunctionParameters} from "../../FunctionParameters.sol";

contract ApeSwapLendingHandler is IHandler, Ownable {
  address constant oBNB = 0x34878F6a484005AA90E7188a546Ea9E52b538F6f;
  address constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
  address public constant RAIN_MAKER = 0x5CB93C0AdE6B7F2760Ec4389833B0cCcb5e4efDa;

  event Velvet_ApeSwap_Mint(address _cAsset, uint256 _amount, address _to);
  event Velvet_ApeSwap_Redeem(address _cAsset, uint256 _amount, address _to, bool isWETH);

  mapping(address => uint256) public pid;

  /**
   * @notice This function deposits assets to the ApeSwap protocol
   * @param _cAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the cTokens in return
   */
  function deposit(
    address _cAsset,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to
  ) public payable override {
    require(address(_cAsset) != address(0), "zero address passed");
    require(address(_to) != address(0), "zero address passed");

    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(_cAsset)[0]);
    IcToken cToken = IcToken(_cAsset);

    if (msg.value == 0) {
      TransferHelper.safeApprove(address(underlyingToken), address(cToken), 0);
      TransferHelper.safeApprove(address(underlyingToken), address(cToken), _amount[0]);
      if (cToken.mint(_amount[0]) != 0) {
        revert ErrorLibrary.MintProcessFailed();
      }
    } else {
      if (msg.value < _amount[0]) {
        revert ErrorLibrary.MintAmountMustBeEqualToValue();
      }
      cToken.mint{value: _amount[0]}();
    }

    if (_to != address(this)) {
      uint256 cBalance = cToken.balanceOf(address(this));
      TransferHelper.safeTransfer(_cAsset, _to, cBalance);
    }

    emit Velvet_ApeSwap_Mint(_cAsset, _amount[0], _to);
  }

  /**
   * @notice This function redeems assets from the ApeSwap protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    require(address(inputData._yieldAsset) != address(0), "zero address passed");
    require(address(inputData._to) != address(0), "zero address passed");

    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(inputData._yieldAsset)[0]);
    IcToken cToken = IcToken(inputData._yieldAsset);

    if (inputData._amount > cToken.balanceOf(address(this))) {
      revert ErrorLibrary.NotEnoughBalanceInApeSwap();
    }
    if (cToken.redeem(inputData._amount) != 0) {
      revert ErrorLibrary.RedeemingCTokenFailed();
    }

    if (inputData._to != address(this)) {
      if (inputData.isWETH) {
        (bool success, ) = payable(inputData._to).call{value: address(this).balance}("");
        require(success, "Transfer failed.");
      } else {
        IERC20Upgradeable token = IERC20Upgradeable(underlyingToken);
        uint256 tokenAmount = token.balanceOf(address(this));
        TransferHelper.safeTransfer(address(underlyingToken), inputData._to, tokenAmount);
      }
    }

    emit Velvet_ApeSwap_Redeem(inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param _apeToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _apeToken) public view override returns (address[] memory) {
    require(address(_apeToken) != address(0), "zero address passed");
    address[] memory underlying = new address[](1);

    if (_apeToken == oBNB) {
      underlying[0] = WBNB;
      return underlying;
    }

    ApeSwapStorage apeToken = ApeSwapStorage(_apeToken);
    underlying[0] = apeToken.underlying();
    return underlying;
  }

  /**
   * @notice This function returns the protocol token balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address t) public view override returns (uint256 tokenBalance) {
    require(address(_tokenHolder) != address(0), "zero address passed");
    require(address(t) != address(0), "zero address passed");

    IcToken token = IcToken(t);
    tokenBalance = token.balanceOf(_tokenHolder);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address t) public override returns (uint256[] memory) {
    require(address(_tokenHolder) != address(0), "zero address passed");
    require(address(t) != address(0), "zero address passed");
    uint256[] memory tokenBalance = new uint256[](1);

    IcToken token = IcToken(t);
    tokenBalance[0] = token.balanceOfUnderlying(_tokenHolder);
    return tokenBalance;
  }

  function encodeData(address t, uint256 _amount) public returns (bytes memory) {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address _token, address _holder) public view returns (bytes memory, address) {
    return (abi.encodeWithSelector(IRainMaker.claimComp.selector, _holder), RAIN_MAKER);
  }

  receive() external payable {}
}
