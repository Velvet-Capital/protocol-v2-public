// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";
import {IHandler} from "../handler/IHandler.sol";
import {IIndexOperations} from "./IIndexOperations.sol";

import {IWETH} from "../interfaces/IWETH.sol";
import {IVault} from "../vault/IVault.sol";

import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";
import {IAccessController} from "../access/IAccessController.sol";

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {IFeeModule} from "../fee/IFeeModule.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import "./IndexSwapLibrary.sol";

import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";
import {IIndexSwap} from "./IIndexSwap.sol";

contract OffChainIndexSwap is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
  using SafeMathUpgradeable for uint256;
  bool public paused;
  bool public redeemed;
  address internal WETH;

  // Total denormalized weight of the pool.
  uint256 public constant TOTAL_WEIGHT = 10_000;

  ITokenRegistry public tokenRegistry;
  IExchange public exchange;
  IFeeModule public feeModule;
  IAssetManagerConfig public iAssetManagerConfig;
  IPriceOracle public oracle;
  uint256 public vaultBalance;
  IIndexSwap public index;
  struct UserData {
    bool userRedeemedStatus;
    address withdrawToken;
    uint256 tokenAmount;
    bytes userRedeemedTokens;
  }
  mapping(address => UserData) public userData;
  mapping(address => mapping(address => uint256[])) public tokenAmounts;
  mapping(address => mapping(address => uint256)) public userUnderlyingAmounts;
  event InvestInFundOffChain(
    uint256 investedAmount,
    uint256 tokenAmount,
    uint256 indexed rate,
    address indexed index,
    uint256 time,
    address indexed user
  );
  event WithdrawFund(address indexed user, uint256 tokenAmount, address indexed index, uint256 timestamp);
  event UserTokenRedeemed(
    address indexed user,
    uint256 tokenAmount,
    uint256 indexed rate,
    address indexed index,
    uint256 timestamp
  );

  function init(address _indexSwap) external initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();
    index = IIndexSwap(_indexSwap);
    exchange = IExchange(index.exchange());
    feeModule = IFeeModule(index.feeModule());
    oracle = IPriceOracle(index.oracle());
    iAssetManagerConfig = IAssetManagerConfig(index.iAssetManagerConfig());
    tokenRegistry = ITokenRegistry(index.tokenRegistry());
    paused = false;
    WETH = tokenRegistry.getETH();
  }

  /**
   * @notice The function is used for investment in portfolios thorugh zeroEx
   * @return balanceInUSD get balanceInUsd after investment
   */
  function investInFundOffChain(
    ExchangeData.ZeroExData memory _initData,
    uint256 _tokenAmount,
    uint256[] calldata _lpSlippage,
    address _to
  ) external payable virtual nonReentrant notPaused returns (uint256 balanceInUSD) {
    IndexSwapLibrary.beforeCheck(index, _tokenAmount);
    IIndexOperations indexOperations = IIndexOperations(tokenRegistry.IndexOperationHandler());
    if (msg.value > 0) {
      _tokenAmount = msg.value;
      IndexSwapLibrary._checkInvestmentValue(_tokenAmount, iAssetManagerConfig);
      IWETH(WETH).deposit{value: msg.value}();
      IWETH(WETH).transfer(address(indexOperations), _tokenAmount);
    } else {
      IndexSwapLibrary._checkPermissionAndBalance(
        _initData.sellTokenAddress,
        _tokenAmount,
        iAssetManagerConfig,
        msg.sender
      );
      uint256 tokenBalanceInBNB = _getTokenBalanceInBNB(_initData.sellTokenAddress, _tokenAmount);
      IndexSwapLibrary._checkInvestmentValue(tokenBalanceInBNB, iAssetManagerConfig);
      TransferHelper.safeTransferFrom(_initData.sellTokenAddress, msg.sender, address(indexOperations), _tokenAmount);
    }
    vaultBalance = IndexSwapLibrary.chargeFees(index,feeModule);
    balanceInUSD = _offChainInvestment(_initData, indexOperations, _lpSlippage);
    uint256 investedAmountAfterSlippageBNB = IndexSwapLibrary._getTokenPriceUSDETH(oracle, balanceInUSD);

    require(investedAmountAfterSlippageBNB > 0, "final invested amount is zero");
    uint256 vaultBalanceBNB = IndexSwapLibrary._getTokenPriceUSDETH(oracle, vaultBalance);
    uint256 tokenAmount;
    if (index.totalSupply() > 0) {
      tokenAmount = IndexSwapLibrary._mintShareAmount(
        investedAmountAfterSlippageBNB,
        vaultBalanceBNB,
        index.totalSupply()
      );
    } else {
      tokenAmount = investedAmountAfterSlippageBNB;
    }
    require(tokenAmount > 0, "token amount is 0");

    index.mintShares(_to, tokenAmount);
    index.setLastInvestmentPeriod(_to);
    // refund leftover ETH to user
    (bool success, ) = payable(_to).call{value: address(this).balance}("");
    require(success, "refund failed");
    uint256 rate = IndexSwapLibrary.getIndexTokenRate(index);
    emit InvestInFundOffChain(_tokenAmount, tokenAmount, rate, address(index), block.timestamp, _to);
  }

  /**
   * @notice The function is used as support fucntion for invest, it iterates throught the index tokens then swap then invest
   * @return balanceInUSD get balanceInUsd after investment
   */
  function _offChainInvestment(
    ExchangeData.ZeroExData memory inputData,
    IIndexOperations indexOperations,
    uint256[] calldata _lpSlippage
  ) internal virtual returns (uint256 balanceInUSD) {
    uint256 underlyingIndex = 0;
    balanceInUSD = 0;
    address[] memory _tokens = index.getTokens();
    for (uint256 i = 0; i < _tokens.length; i++) {
      IHandler handler = IHandler(
        ITokenRegistry(index.tokenRegistry()).getTokenInformation(_tokens[i]).handler
      );

      (balanceInUSD, underlyingIndex) = indexOperations.swapOffChainTokens(
        ExchangeData.IndexOperationData(
          inputData,
          handler,
          index,
          underlyingIndex,
          inputData.protocolFee[i],
          balanceInUSD,
           _lpSlippage[i],
          _tokens[i]
        )
      );
    }
  }

  /**
   * @notice This Function is use to calculate the expected amount to token user will get during withdraw
   * @return _tokenAmount Amount of index token user want to withdraw
   */
  function calulateWithdrawAmount(uint256 _tokenAmount) external view returns (uint256[] memory) {
    return IndexSwapLibrary.calculateWithdrawAmount(index, _tokenAmount);
  }

  /**
   * @notice This Function is used ionly for base token portfolio, used to withdraw tokens for user
   * @param inputData tokenAmount,buyToken, array of sellAmount,array of protocolFee,array of swapData,address of offchainHandler
   */
  function withdraw(ExchangeData.PrimaryWithdraw memory inputData) external virtual nonReentrant {
    address[] memory _tokens = index.getTokens();
    IndexSwapLibrary.checkPrimary(index,_tokens);
    uint256 totalSupplyIndex = index.totalSupply();
    _beforeCheckAndBurn(inputData.tokenAmount, inputData.buyToken, false);
    uint256 balanceBefore = IERC20Upgradeable(inputData.buyToken).balanceOf(address(this));
    for (uint i = 0; i < _tokens.length; i++) {
      uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, _tokens[i]);
      require(tokenBalance.mul(inputData.tokenAmount) >= totalSupplyIndex, "incorrect token amount");
      tokenBalance = tokenBalance.mul(inputData.tokenAmount).div(totalSupplyIndex);
      IndexSwapLibrary.pullFromVault(index, _tokens[i], tokenBalance, address(this));
      _withdraw(
        ExchangeData.withdrawData(
          inputData.sellAmount[i],
          inputData.protocolFee[i],
          tokenBalance,
          _tokens[i],
          inputData.offChainHandler,
          inputData.buyToken,
          inputData.buySwapData[i]
        )
      );
    }
    uint256 balanceAfter = IERC20Upgradeable(inputData.buyToken).balanceOf(address(this));
    _transferTokenToUser(inputData.buyToken, balanceAfter.sub(balanceBefore));
    emit WithdrawFund(msg.sender, inputData.tokenAmount, address(index), block.timestamp);
  }

  /**
   * @notice The function is used withdrawaing - pulling from vault and redeeming the tokens of user for withdrawal
   */
  function redeemTokens(ExchangeData.RedeemData memory inputdata) external virtual nonReentrant notPaused {
    uint256 totalSupplyIndex = index.totalSupply();
    address user = msg.sender;
    _beforeCheckAndBurn(inputdata.tokenAmount, inputdata.token, userData[user].userRedeemedStatus);
    address[] memory _tokens = index.getTokens();
    for (uint256 i = 0; i < _tokens.length; i++) {
      delete tokenAmounts[user][_tokens[i]];
      uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, _tokens[i]);
      uint256 amount = tokenBalance.mul(inputdata.tokenAmount).div(totalSupplyIndex);
      if (_tokens[i] == inputdata.token && inputdata.token == WETH) {
        uint256 balanceBefore = IERC20Upgradeable(inputdata.token).balanceOf(address(this));
        IndexSwapLibrary.pullFromVault(index, inputdata.token, amount, address(this));
        uint256 balanceAfter = IERC20Upgradeable(inputdata.token).balanceOf(address(this));
        _withdrawAndTransfer(balanceAfter.sub(balanceBefore));
      } else if (_tokens[i] == inputdata.token) {
        IndexSwapLibrary.pullFromVault(index, inputdata.token, amount, user);
      } else {
        IHandler handler = IHandler(tokenRegistry.getTokenInformation(_tokens[i]).handler);
        address[] memory underlying = handler.getUnderlying(_tokens[i]);
        uint256[] memory balanceBefore = IndexSwapLibrary.checkUnderlyingBalance(_tokens[i], handler, address(this));
        IndexSwapLibrary._pullAndRedeem(
          index,
          _tokens[i],
          address(this),
          amount,
          inputdata._lpSlippage[i],
          tokenRegistry.getTokenInformation(_tokens[i]).primary,
          handler
        );
        for (uint256 j = 0; j < underlying.length; j++) {
          if (underlying[j] == WETH) {
            IWETH(underlying[j]).deposit{value: address(this).balance}();
          }
        }
        uint256[] memory balanceAfter = IndexSwapLibrary.checkUnderlyingBalance(
          _tokens[i],
          handler,
          address(this)
        );
        for (uint256 j = 0; j < underlying.length; j++) {
          tokenAmounts[user][_tokens[i]].push(balanceAfter[j].sub(balanceBefore[j]));
          userUnderlyingAmounts[user][underlying[j]] = userUnderlyingAmounts[user][underlying[j]]
            .add(balanceAfter[j])
            .sub(balanceBefore[j]);
        }
      }
    }
    userData[user].withdrawToken = inputdata.token;
    userData[user].userRedeemedStatus = true;
    userData[user].tokenAmount = inputdata.tokenAmount;
    userData[user].userRedeemedTokens = abi.encode(_tokens);

    emit UserTokenRedeemed(
      user,
      inputdata.tokenAmount,
      IndexSwapLibrary.getIndexTokenRate(index),
      address(index),
      block.timestamp
    );
  }

  /**
   * @notice The function is used swaping the redeemed token to desired token and giving to user
   */
  function withdrawOffChain(ExchangeData.ZeroExWithdraw memory inputData) external virtual nonReentrant {
    address user = msg.sender;
    address buyToken = userData[user].withdrawToken;
    IndexSwapLibrary.beforeWithdrawOffChain(userData[user].userRedeemedStatus,tokenRegistry,inputData.offChainHandler);
    uint256 balanceBefore = IERC20Upgradeable(buyToken).balanceOf(address(this));
    for (uint256 i = 0; i < inputData.sellTokenAddress.length; i++) {
      _withdraw(
        ExchangeData.withdrawData(
          inputData.sellAmount[i],
          inputData.protocolFee[i],
          userUnderlyingAmounts[user][inputData.sellTokenAddress[i]],
          inputData.sellTokenAddress[i],
          inputData.offChainHandler,
          buyToken,
          inputData.buySwapData[i]
        )
      );
      userUnderlyingAmounts[user][inputData.sellTokenAddress[i]] = 0;
    }
    uint256 balanceAfter = IERC20Upgradeable(buyToken).balanceOf(address(this));
    _transferTokenToUser(buyToken, balanceAfter.sub(balanceBefore));
    userData[user].userRedeemedStatus = false;
    emit WithdrawFund(user, userData[user].tokenAmount, address(index), block.timestamp);
  }

  /**
   * @notice This function gets the token amount for the user
   */
  function getTokenAmounts(address _user, address _token) external view virtual returns (uint256[] memory) {
    return tokenAmounts[_user][_token];
  }

  /**
   * @notice This Function is internal fucntion of withdraw,used to swap tokens
   * @param inputData sellTokenAddress, address of offchainHandler, address of buyToken, calldata, sellAmount,protocolFee, and users tokenamount
   */
  function _withdraw(ExchangeData.withdrawData memory inputData) internal {
    if (inputData.sellAmount != inputData.userAmount) {
      revert ErrorLibrary.InvalidSellAmount();
    }
    if (inputData.sellTokenAddress == inputData.buyToken && inputData.buyToken == WETH) {
      _withdrawAndTransfer(inputData.sellAmount);
    } else if (inputData.sellTokenAddress == inputData.buyToken) {
      TransferHelper.safeTransfer(inputData.buyToken, msg.sender, inputData.sellAmount);
    } else {
      IndexSwapLibrary._transferAndSwapUsingOffChainHandler(
        inputData.sellTokenAddress,
        inputData.buyToken,
        inputData.sellAmount,
        address(this),
        inputData.swapData,
        inputData.offChainHandler,
        inputData.protocolFee
      );
    }
  }

  function _withdrawAndTransfer(uint256 _amount) internal virtual {
    IWETH(WETH).withdraw(_amount);
    (bool success, ) = payable(msg.sender).call{value: _amount}("");
    if (!success) {
      revert ErrorLibrary.WithdrawTransferFailed();
    }
  }

  /**
   * @notice This function calls the calculateSwapAmountsOffChain() function from the IndexSwapLibrary
   */
  function calculateSwapAmountsOffChain(
    IIndexSwap _index,
    uint256 _tokenAmount
  ) external virtual returns (uint256[] memory) {
    return IndexSwapLibrary.calculateSwapAmountsOffChain(_index, _tokenAmount);
  }

  function _transferTokenToUser(address buyToken, uint256 amount) internal {
    if (buyToken == WETH) {
      _withdrawAndTransfer(amount);
    } else {
      TransferHelper.safeTransfer(buyToken, msg.sender, amount);
    }
  }

  function _swapAndCalculate(
    ExchangeData.ZeroExData memory inputData,
    uint256 balance,
    address _to,
    uint256 _index,
    uint256 _protocolFee
  ) internal virtual returns (uint256 balanceInUSD, uint256 swapRes) {
    uint256 balanceBefore = IERC20Upgradeable(inputData._buyToken[_index]).balanceOf(address(this));
    IndexSwapLibrary._transferAndSwapUsingOffChainHandler(
      inputData.sellTokenAddress,
      inputData._buyToken[_index],
      inputData.buyAmount[_index],
      address(this),
      inputData._buySwapData[_index],
      inputData._offChainHandler,
      _protocolFee
    );
    uint256 balanceAfter = IERC20Upgradeable(inputData._buyToken[_index]).balanceOf(address(this));
    swapRes = balanceAfter.sub(balanceBefore);
    balanceInUSD = balance.add(
      IndexSwapLibrary._getTokenAmountInUSD(index.oracle(), inputData._buyToken[_index], swapRes)
    );
    TransferHelper.safeTransfer(inputData._buyToken[_index], _to, swapRes);
  }

  /**
   * @notice This function gets the token balance in BNB
   */
  function _getTokenBalanceInBNB(
    address _token,
    uint256 _tokenAmount
  ) internal view returns (uint256 tokenBalanceInBNB) {
    uint256 tokenBalanceInUSD = IndexSwapLibrary._getTokenAmountInUSD(index.oracle(), _token, _tokenAmount);
    tokenBalanceInBNB = IndexSwapLibrary._getTokenPriceUSDETH(oracle, tokenBalanceInUSD);
  }

  function _beforeCheckAndBurn(uint256 _tokenAmount, address _token, bool _status) internal {
    IndexSwapLibrary.beforeRedeemCheck(index, _tokenAmount, _token, _status);
    index.checkCoolDownPeriod();
    address assetManagerTreasury = iAssetManagerConfig.assetManagerTreasury();
    address velvetTreasury = tokenRegistry.velvetTreasury();
    if (!(msg.sender == assetManagerTreasury || msg.sender == velvetTreasury)) {
      IndexSwapLibrary.chargeFees(index,feeModule);
    }
    index.burnShares(msg.sender, _tokenAmount);
  }

  modifier notPaused() {
    if (index.paused()) {
      revert ErrorLibrary.ContractPaused();
    }
    _;
  }

  modifier onlyRebalancerContract() {
    if (!(IAccessController(index.accessController()).hasRole(keccak256("REBALANCER_CONTRACT"), msg.sender))) {
      revert ErrorLibrary.CallerNotRebalancerContract();
    }
    _;
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
