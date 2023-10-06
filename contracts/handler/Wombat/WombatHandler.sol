// SPDX-License-Identifier: BUSL-1.1

// Wombat Official Docs: https://docs.wombat.exchange/docs/
// Wombat GitHub: https://github.com/wombat-exchange

/**
 * @title Handler for the Wombat's staking protocol
 * @author Velvet.Capital
 * @notice This contract is used to stake tokens
 *      to/from the Wombat protocol.
 * @dev This contract includes functionalities:
 *      1. Stake tokens to the Wombat protocol
 *      2. Redeem staked tokens from the Wombat protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {IAsset} from "./interfaces/IAsset.sol";
import {IPool} from "./interfaces/IPool.sol";
import {IWombat, StructLib} from "./interfaces/IWombat.sol";
import {IWombatRouter} from "./interfaces/IWombatRouter.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";
import {IHandler} from "../IHandler.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {SlippageControl} from "../SlippageControl.sol";
import {FunctionParameters} from "contracts/FunctionParameters.sol";

import {DustHandler} from "../DustHandler.sol";

contract WombatHandler is IHandler, SlippageControl, DustHandler {
  address internal constant WOMBAT_OPTIMIZED_PROXY = 0x489833311676B566f888119c29bd997Dc6C95830;
  IWombat internal MasterWombat = IWombat(WOMBAT_OPTIMIZED_PROXY);

  address internal constant WOMBAT_ROUTER = 0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7;

  IPriceOracle internal _oracle;

  event Deposit(address indexed user, address indexed token, uint256[] amounts, address indexed to);
  event Redeem(
    address indexed user,
    address indexed token,
    uint256 amount,
    address indexed to,
    bool isWETH
  );

  constructor(address _priceOracle) {
    if(_priceOracle == address(0)){
      revert ErrorLibrary.InvalidAddress();
    }
    _oracle = IPriceOracle(_priceOracle);
  }

  /**
   * @notice This function stakes to the Wombat protocol
   * @param _lpAsset Address of the protocol asset to be staked
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the cTokens in return
   */
  function deposit(
    address _lpAsset,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override returns (uint256 _mintedAmount) {
    if (_lpAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IAsset asset = IAsset(_lpAsset);
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(_lpAsset)[0]);
    IPool _pool = IPool(asset.pool());

    if (msg.value == 0) {
      TransferHelper.safeApprove(address(underlyingToken), address(_pool), 0);
      TransferHelper.safeApprove(address(underlyingToken), address(_pool), _amount[0]);
      _mintedAmount = _pool.deposit(
        address(underlyingToken),
        _amount[0],
        getInternalSlippage(_amount[0], _lpAsset, _lpSlippage, true),
        _to,
        block.timestamp,
        true
      );
    } else {
      if (msg.value < _amount[0]) {
        revert ErrorLibrary.MintAmountNotEqualToPassedValue();
      }
      if (address(underlyingToken) != _oracle.WETH()) revert ErrorLibrary.TokenNotETH();
      _mintedAmount = IWombatRouter(WOMBAT_ROUTER).addLiquidityNative{value: _amount[0]}(
        _pool,
        getInternalSlippage(_amount[0], _lpAsset, _lpSlippage, true),
        _to,
        block.timestamp,
        true
      );
    }

    _returnDust(address(underlyingToken), user);

    emit Deposit(msg.sender, _lpAsset, _amount, _to);

    (uint256 _potentialWithdrawalAmount, ) = _pool.quotePotentialWithdraw(address(underlyingToken), _mintedAmount);
    _mintedAmount = _oracle.getPriceTokenUSD18Decimals(address(underlyingToken), _potentialWithdrawalAmount);
  }

  /**
   * @notice This function redeems the staked tokens from the Wombat protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IAsset token = IAsset(inputData._yieldAsset);
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(inputData._yieldAsset)[0]);
    if (inputData._amount > token.balanceOf(address(this))) {
      revert ErrorLibrary.NotEnoughBalanceInWombatProtocol();
    }
    IPool _pool = IPool(token.pool());
    if (!inputData.isWETH) {
      TransferHelper.safeApprove(address(token), address(_pool), 0);
      TransferHelper.safeApprove(address(token), address(_pool), inputData._amount);

      _pool.withdraw(
        address(underlyingToken),
        inputData._amount,
        getInternalSlippage(inputData._amount, inputData._yieldAsset, inputData._lpSlippage, false),
        inputData._to,
        block.timestamp
      );
    } else {
      TransferHelper.safeApprove(address(token), address(WOMBAT_ROUTER), 0);
      TransferHelper.safeApprove(address(token), address(WOMBAT_ROUTER), inputData._amount);

      IWombatRouter(WOMBAT_ROUTER).removeLiquidityNative(
        _pool,
        inputData._amount,
        getInternalSlippage(inputData._amount, inputData._yieldAsset, inputData._lpSlippage, false),
        inputData._to,
        block.timestamp
      );
    }
    emit Redeem(msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param _lpToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _lpToken) public view override returns (address[] memory) {
    if (_lpToken == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](1);
    IAsset token = IAsset(_lpToken);
    underlying[0] = token.underlyingToken();
    return underlying;
  }

  /**
   * @notice This function returns the protocol token balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address t) public view override returns (uint256 tokenBalance) {
    if (_tokenHolder == address(0) || t == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IAsset asset = IAsset(t);
    StructLib.UserInfo memory _amountStaked = MasterWombat.userInfo(
      MasterWombat.getAssetPid(address(asset)),
      _tokenHolder
    );
    tokenBalance = _amountStaked.amount;
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address t) public override returns (uint256[] memory) {
    if (_tokenHolder == address(0) || t == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint256[] memory tokenBalance = new uint256[](1);
    uint256 yieldTokenBalance = getTokenBalance(_tokenHolder, t);
    if (yieldTokenBalance != 0) {
      (tokenBalance[0], ) = IPool(IAsset(t).pool()).quotePotentialWithdraw(getUnderlying(t)[0], yieldTokenBalance);
    }
    return tokenBalance;
  }

  /**
   * @notice This function returns the USD value of the LP asset using Fair LP Price model
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   */
  function getTokenBalanceUSD(address _tokenHolder, address t) public override returns (uint256) {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint[] memory underlyingBalance = getUnderlyingBalance(_tokenHolder, t);
    address[] memory underlyingToken = getUnderlying(t);

    uint balanceUSD = _oracle.getPriceTokenUSD18Decimals(underlyingToken[0], underlyingBalance[0]);
    return balanceUSD;
  }

  function encodeData(address t, uint256 _amount) public view returns (bytes memory) {
    IAsset asset = IAsset(t);
    return abi.encodeWithSelector(IWombat.withdraw.selector, MasterWombat.getAssetPid(address(asset)), _amount);
  }

  function getRouterAddress() public pure returns (address) {
    return WOMBAT_OPTIMIZED_PROXY;
  }

  function getClaimTokenCalldata(address _token, address _holder) public view returns (bytes memory, address) {
    uint256 pid = MasterWombat.getAssetPid(address(_token));
    return (abi.encodeWithSelector(IWombat.deposit.selector, pid, 0), address(MasterWombat));
  }

  /**
   * @notice This function returns the slippage required by the Wombat Handler
   * @param _amount This amount needed to be checked
   * @param _token Address of the token needed
   * @param _slippage Slippage required to be checked
   * @param _deposit Type of operation done here, can be deposit or redeem
   * @return slippageAmount amount calculated after slippage
   */
  function getInternalSlippage(
    uint _amount,
    address _token,
    uint _slippage,
    bool _deposit
  ) internal returns (uint slippageAmount) {
    IAsset asset = IAsset(_token);
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(_token)[0]);
    address pool = asset.pool();
    //Formula By Wombat For Slippage
    /**
     minAmount = liquidity * (1/1+slippage)
     */
    //Here 1 is 100%(For Velvet) as slippage denoted by wombat is 0.01 for 1%
    uint expectedAmount;
    if (_deposit) {
      (expectedAmount, ) = IPool(pool).quotePotentialDeposit(address(underlyingToken), _amount);
    } else {
      (expectedAmount, ) = IPool(pool).quotePotentialWithdraw(address(underlyingToken), _amount);
    }
    slippageAmount = (expectedAmount * HUNDRED_PERCENT ) / (HUNDRED_PERCENT + _slippage);
  }

  receive() external payable {}
}