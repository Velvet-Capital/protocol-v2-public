// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {UUPSUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";
import {IExchange} from "../core/IExchange.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";
import {IIndexSwap} from "../core/IIndexSwap.sol";
import {AccessController} from "../access/AccessController.sol";

import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";

import {IHandler} from "../handler/IHandler.sol";

import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

import {RebalanceLibrary} from "./RebalanceLibrary.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {FunctionParameters} from "../FunctionParameters.sol";
import {IRebalanceAggregator} from "./IRebalanceAggregator.sol";

contract OffChainRebalance is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
  IIndexSwap internal index;

  AccessController internal accessController;
  ITokenRegistry internal tokenRegistry;
  IAssetManagerConfig internal assetManagerConfig;
  IExchange internal exchange;
  IRebalanceAggregator internal aggregator;

  address[] internal modifiedTokens;
  address internal WETH;
  address internal vault;
  address internal _contract;

  //Used to store sellToken address
  address[] internal sellTokensToSwap;

  struct RebalanceData {
    uint96[] oldWeight;
    address[] oldTokens;
    address[] sellTokens;
  }

  RebalanceData internal rebalanceData;
  mapping(address => uint256[]) public redeemedAmounts;
  mapping(address => bool) public sellTokensData;

  enum Steps {
    None,
    FirstEnable,
    SecondSell
  }
  Steps internal step;
  event EnableRebalance(uint96[] _newWeights);

  event EnableRebalanceAndUpdateRecord(address[] _newTokens, uint96[] _newWeights);

  event PullAndRedeemForUpdateWeights(uint96[] oldWeights, address[] sellTokens, address[] buyTokens);

  event PullAndRedeemForUpdateTokens(uint96[] _newWeights, address[] _newTokens);

  event EXTERNAL_REBALANCE_COMPLETED(address indexed user);
  event EXTERNAL_SELL(address indexed assetManager);
  event ENABLE_PRIMARY_TOKENS(address indexed assetManager, uint96[] newWeights);
  event ENABLE_AND_UPDATE_PRIMARY_TOKENS(address indexed assetManager, address[] _newTokens, uint96[] newWeights);
  event REVERT_SELL_TOKENS(address indexed user);
  event REVERT_ENABLE_REBALANCING(address indexed user);

  bytes public updateTokenStateData;
  bytes public updateWeightStateData;

  constructor() {
    _disableInitializers();
  }

  /**
   * @notice This function is used to initialise the OffChainRebalance module while deployment
   */
  function init(
    address _index,
    address _accessController,
    address _exchange,
    address _tokenRegistry,
    address _assetManagerConfig,
    address _vault,
    address _aggregator
  ) external initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();
    __ReentrancyGuard_init();
    if (
      _index == address(0) ||
      _accessController == address(0) ||
      _exchange == address(0) ||
      _tokenRegistry == address(0) ||
      _assetManagerConfig == address(0) ||
      _vault == address(0) ||
      _aggregator == address(0)
    ) {
      revert ErrorLibrary.InvalidAddress();
    }
    index = IIndexSwap(_index);
    accessController = AccessController(_accessController);
    tokenRegistry = ITokenRegistry(_tokenRegistry);
    exchange = IExchange(_exchange);
    assetManagerConfig = IAssetManagerConfig(_assetManagerConfig);
    aggregator = IRebalanceAggregator(_aggregator);
    WETH = tokenRegistry.getETH();
    vault = _vault;
    _contract = address(this);
  }

  modifier onlyAssetManager() {
    if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotAssetManager();
    }
    _;
  }

  function getCurrentWeights(uint256 _vaultValue) internal returns (uint96[] memory) {
    return RebalanceLibrary.getCurrentWeights(index, getTokens(), _vaultValue);
  }

  function getCurrentWeights() public returns (uint96[] memory) {
    uint256 _vaultValue = getVaultBalance();
    return getCurrentWeights(_vaultValue);
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Weight, called to pull and redeem tokens
   * @param inputData NewWeights and LpSlippage in struct
   */
  function enableRebalance(
    FunctionParameters.EnableRebalanceData memory inputData
  ) external virtual nonReentrant onlyAssetManager {
    if (Steps.None != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    RebalanceLibrary.validateEnableRebalance(index, tokenRegistry, getRedeemed());
    //Keeping track of oldWeights and OldTokens for further use
    address[] memory _tokens = setRebalanceDataAndPause();
    uint96[] memory _newWeight = inputData._newWeights;
    updateRecord(_tokens, _newWeight);
    uint256 _vaultValue = getVaultBalance();
    pullAndRedeemForUpdateWeights(inputData._lpSlippage, _vaultValue);
    step = Steps.FirstEnable;
    emit EnableRebalance(_newWeight);
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Tokens,called to pull and redeem tokens
   * @param _newTokens Array of new tokens
   * @param _newWeights Array of new newights
   * @param _lpSlippage array os lpSlippage
   */
  function enableRebalanceAndUpdateRecord(
    address[] memory _newTokens,
    uint96[] memory _newWeights,
    uint256[] calldata _lpSlippage
  ) public virtual nonReentrant onlyAssetManager {
    if (Steps.None != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    uint256 newTokenLength = _newTokens.length;
    uint256 oldTokensLength = getTokens().length;
    if (_newWeights.length != newTokenLength) {
      revert ErrorLibrary.LengthsDontMatch();
    }
    uint256 length = oldTokensLength > newTokenLength ? oldTokensLength : newTokenLength;
    if (_lpSlippage.length != length) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
    if (getRedeemed()) {
      revert ErrorLibrary.AlreadyOngoingOperation();
    }
    _enableRebalanceAndUpdateRecord(_newTokens, _newWeights, _lpSlippage);
  }

  /**
   * @notice The function is helper function, used to delete sellTokensData and sellTokensToSwap after externalSell is completed
   */
  function deleteSellTokenData() internal {
    uint256 len = sellTokensToSwap.length;
    for (uint256 i = 0; i < len; i++) {
      delete sellTokensData[sellTokensToSwap[i]];
    }
    delete sellTokensToSwap;
  }

  /**
   * @notice The function is internal function of update Tokens,called to pull,redeem and sell tokens
   * @param _newTokens Array of new tokens
   * @param _newWeights Array of new newights
   * @param _lpSlippage array os lpSlippage
   */
  function _pullAndRedeemForUpdateTokens(
    uint96[] memory _newWeights,
    address[] memory _newTokens,
    uint256[] calldata _lpSlippage
  ) internal virtual {
    uint256[] memory newDenorms = RebalanceLibrary.evaluateNewDenorms(index, _newTokens, _newWeights);
    address[] memory tokens = getTokens();
    uint256 len = tokens.length;
    address[] memory tokenSell = new address[](len);
    if (index.totalSupply() > 0) {
      for (uint256 i = 0; i < len; i++) {
        address _token = tokens[i];
        if (newDenorms[i] == 0) {
          IHandler handler = IHandler(getTokenInfo(_token).handler);
          uint256 tokenBalance = handler.getTokenBalance(vault, _token);
          _pullAndRedeem(tokenBalance, _lpSlippage[i], _token);
          tokenSell[i] = _token;
          setSellTokenData(_token);
        }
        index.deleteRecord(_token);
      }
    }
    updateTokenStateData = abi.encode(tokenSell);
    emit PullAndRedeemForUpdateTokens(_newWeights, _newTokens);
  }

  /**
   * @notice The function is helper function, used to set tokens to sell in array, and used in externalSell function
   * It considers underlying tokens, it checks whether the token is weth or not ,also checks whether the underlying is already considered in array or not and adds the token in array named sellTokensToSwap
   * @param _token Address of the token in picture
   */
  function setSellTokenData(address _token) internal {
    IHandler handler = IHandler(getTokenInfo(_token).handler);
    address[] memory underlying = getUnderlying(handler, _token);
    for (uint256 j = 0; j < underlying.length; j++) {
      address underlyingToken = underlying[j];
      if (underlyingToken != WETH && !sellTokensData[underlyingToken]) {
        sellTokensData[underlyingToken] = true;
        sellTokensToSwap.push(underlyingToken);
      }
    }
  }

  /**
   * @notice The function is internal function of update Weights,called to pull and redeem  tokens
   * @param _lpSlippage array of lpSlippage
   */
  function pullAndRedeemForUpdateWeights(uint256[] memory _lpSlippage, uint256 _vaultValue) internal virtual {
    address[] memory tokens = getTokens();
    uint96[] memory oldWeights = getCurrentWeights(_vaultValue);
    uint256 len = tokens.length;
    uint256[] memory buyWeights = new uint256[](len);
    address[] memory sellTokens = new address[](len);
    address[] memory buyTokens = new address[](len);
    uint256 sumWeightsToSwap;
    for (uint256 i = 0; i < len; i++) {
      uint256 oldWeight = oldWeights[i];
      address _token = tokens[i];
      uint256 newWeights = uint256(index.getRecord(_token).denorm);
      if (newWeights < oldWeight) {
        uint256 swapAmount = RebalanceLibrary.getAmountToSwap(index, _token, newWeights, oldWeight);
        _pullAndRedeem(swapAmount, _lpSlippage[i], _token);
        sellTokens[i] = _token;
        setSellTokenData(_token);
      } else if (newWeights > oldWeight) {
        uint256 diff = newWeights - oldWeight;
        sumWeightsToSwap = sumWeightsToSwap + diff;
        buyTokens[i] = _token;
        buyWeights[i] = diff;
      }
    }
    setRedeemed(true);
    updateWeightStateData = abi.encode(sellTokens, buyTokens, buyWeights, sumWeightsToSwap);
    emit PullAndRedeemForUpdateWeights(oldWeights, sellTokens, buyTokens);
  }

  /**
   * @notice The function is internal function to Pull from Vault
   * @param swapAmount Amount to Pull From Vault
   * @param token Token to Pull From Vault
   * @param _lpSlippage array os lpSlippage
   */
  function _pullAndRedeem(uint256 swapAmount, uint256 _lpSlippage, address token) internal virtual {
    RebalanceLibrary.beforePullAndRedeem(index, assetManagerConfig, token);
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(token);
    IHandler handler = IHandler(tokenInfo.handler);
    uint256[] memory balanceBefore = RebalanceLibrary.getUnderlyingBalances(token, handler, _contract);
    address[] memory underlying = getUnderlying(handler, token);
    exchange._pullFromVault(token, swapAmount, _contract);
    modifiedTokens.push(token);
    if (!tokenInfo.primary) {
      TransferHelper.safeTransfer(token, address(handler), swapAmount);
      handler.redeem(
        FunctionParameters.RedeemData(
          swapAmount,
          _lpSlippage,
          _contract,
          token,
          exchange.isWETH(token, address(handler))
        )
      );
      for (uint256 j = 0; j < underlying.length; j++) {
        if (underlying[j] == WETH) {
          IWETH(WETH).deposit{value: _contract.balance}();
        }
      }
    }
    for (uint256 i = 0; i < underlying.length; i++) {
      uint balanceAfter = getBalance(underlying[i], _contract);
      redeemedAmounts[token].push(balanceAfter - balanceBefore[i]);
    }
  }

  /**
   * @notice The function is 3rd transaction of update tokens and update weights, used to stake and deposit tokens
   * @param inputData array of buyToken,swapData,buyAmount,tokens and address of offChainHandler
   * @param _lpSlippage array of lpSlippage
   */
  function externalRebalance(
    FunctionParameters.ZeroExData calldata inputData,
    uint256[] calldata _lpSlippage
  ) external nonReentrant onlyAssetManager {
    if (Steps.SecondSell != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    RebalanceLibrary.beforeExternalRebalance(index, tokenRegistry, inputData._offChainHandler);
    _externalRebalance(inputData, _lpSlippage);
    emit EXTERNAL_REBALANCE_COMPLETED(msg.sender);
  }

  /**
   * @notice The function is internal fucntion of external rebalance, used to stake and deposit tokens
   * @param inputData array of buyToken,swapData,buyAmount,tokens and address of offChainHandler
   * @param _lpSlippage array of lpSlippage
   */
  function _externalRebalance(
    FunctionParameters.ZeroExData calldata inputData,
    uint256[] calldata _lpSlippage
  ) internal virtual {
    address[] memory _buyTokens;
    uint256[] memory _buyWeight;
    uint256 _sumWeight;
    //Decoding Stored State Data
    (, _buyTokens, _buyWeight, _sumWeight) = abi.decode(
      updateWeightStateData,
      (address[], address[], uint256[], uint256)
    );
    uint256 balance = getBalance(WETH, _contract);
    TransferHelper.safeTransfer(WETH, address(exchange), balance);
    uint256 underlyingIndex;
    uint256 inputIndex;
    //Looping through the decoded data ( buyTokens)
    for (uint i = 0; i < _buyTokens.length; i++) {
      address _token = _buyTokens[i];
      if (_token != address(0)) {
        uint256 buyVal = (balance * _buyWeight[i]) / _sumWeight;
        underlyingIndex = _stake(inputData, _lpSlippage, buyVal, underlyingIndex, inputIndex, _token);
        inputIndex++;
      }
    }
    deleteState();
  }

  /**
   * @notice The function is 2nd Transaction of update token and update weights,used to sell redeemed tokens using api
   * @param _sellSwapData array of callData for sellTokens
   * @param _offChainHandler address of offChainHandler, use to swap tokens
   */
  function _externalSell(
    bytes[] calldata _sellSwapData,
    address _offChainHandler
  ) external virtual nonReentrant onlyAssetManager {
    if (Steps.FirstEnable != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    RebalanceLibrary.beforeExternalSell(index, tokenRegistry, _offChainHandler);
    //Using stored array data(in setSellTokenData)
    _swap(sellTokensToSwap, _offChainHandler, _sellSwapData, 0);
    //Deleting the sellTokensToSwap data after use
    step = Steps.SecondSell;
    emit EXTERNAL_SELL(msg.sender);
  }

  /**
   * @notice The function is internal fucntion of external rebalance, used to stake and deposit tokens to vault
   * @param inputData array of buyToken,swapData,buyAmount,tokens and address of offChainHandler
   * @param _lpSlippage address of lpSlippage
   */
  function _stake(
    FunctionParameters.ZeroExData calldata inputData,
    uint256[] calldata _lpSlippage,
    uint256 buyVal,
    uint256 underlyingindex,
    uint256 inputIndex,
    address _token
  ) internal virtual returns (uint256 underlyingIndex) {
    (, underlyingIndex) = exchange.swapOffChainTokens(
      ExchangeData.IndexOperationData(
        ExchangeData.InputData(inputData._buyAmount, WETH, inputData._offChainHandler, inputData._buySwapData),
        index,
        underlyingindex,
        _lpSlippage[inputIndex],
        buyVal,
        _token,
        vault
      )
    );
  }

  /**
   * @notice The function is used to get the address and amount of tokens to redeem
   * @param newWeights array of newWeights
   */
  function getSwapData(uint256[] calldata newWeights) external returns (address[] memory, uint256[] memory) {
    return RebalanceLibrary.getRebalanceSwapData(newWeights, index);
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Weight For Only Base Token Portfolio,called to pull,redeem and sell tokens
   * @param newWeights array of newWeights
   * @param swapData array of calldata
   * @param offChainHandler address of offchainHandler use to swap Tokens
   * @param lpSlippage array of lpSlippage
   */
  function enablePrimaryTokens(
    uint96[] calldata newWeights,
    bytes[] calldata swapData,
    address offChainHandler,
    uint256[] memory lpSlippage
  ) external virtual nonReentrant onlyAssetManager {
    if (Steps.None != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    if (getRedeemed()) {
      revert ErrorLibrary.AlreadyOngoingOperation();
    }
    address[] memory tokens = setRebalanceDataAndPause();
    validatePrimaryAndHandler(tokens, offChainHandler);
    address[] memory sellTokens;
    updateRecord(tokens, newWeights);
    uint256 _vaultValue = getVaultBalance();
    pullAndRedeemForUpdateWeights(lpSlippage, _vaultValue);
    (sellTokens, , , ) = abi.decode(updateWeightStateData, (address[], address[], uint256[], uint256));
    _swap(sellTokens, offChainHandler, swapData, 0);

    step = Steps.SecondSell;
    emit ENABLE_PRIMARY_TOKENS(msg.sender, newWeights);
  }

  /**
   * @notice The function is 1st transaction of ZeroEx Update Tokens For Only Base Token Portfolio,called to pull,redeem, sell and update tokens
   * @param _newTokens array of newTokens
   * @param _newWeights array of newWeights
   * @param _lpSlippage array of lpSlippage
   * @param swapData array of calldata
   * @param offChainHandler address of offchainHandler
   */
  function enableAndUpdatePrimaryTokens(
    address[] memory _newTokens,
    uint96[] memory _newWeights,
    uint256[] calldata _lpSlippage,
    bytes[] calldata swapData,
    address offChainHandler
  ) external virtual nonReentrant onlyAssetManager {
    if (Steps.None != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    if (getRedeemed()) {
      revert ErrorLibrary.AlreadyOngoingOperation();
    }
    setPaused(true);
    validatePrimaryAndHandler(getTokens(), offChainHandler);
    address[] memory sellTokens;
    _enableRebalanceAndUpdateRecord(_newTokens, _newWeights, _lpSlippage);
    (sellTokens, , , ) = abi.decode(updateWeightStateData, (address[], address[], uint256[], uint256));
    uint256 _index = 0;
    _index = _swap(sellTokens, offChainHandler, swapData, _index);
    (sellTokens) = abi.decode(updateTokenStateData, (address[]));
    _index = _swap(sellTokens, offChainHandler, swapData, _index);

    step = Steps.SecondSell;
    emit ENABLE_AND_UPDATE_PRIMARY_TOKENS(msg.sender, _newTokens, _newWeights);
  }

  function _enableRebalanceAndUpdateRecord(
    address[] memory _newTokens,
    uint96[] memory _newWeights,
    uint256[] calldata _lpSlippage
  ) internal {
    RebalanceLibrary.validateUpdateRecord(_newTokens, assetManagerConfig, tokenRegistry);
    setRebalanceDataAndPause();
    uint256 _vaultValue = getVaultBalance();
    _pullAndRedeemForUpdateTokens(_newWeights, _newTokens, _lpSlippage);
    _updateTokenListAndRecords(_newTokens, _newWeights);
    pullAndRedeemForUpdateWeights(_lpSlippage, _vaultValue);
    step = Steps.FirstEnable;
    emit EnableRebalanceAndUpdateRecord(_newTokens, _newWeights);
  }

  /**
   * @notice The function is used to swap token using offchainHandler
   * @param sellTokens array of tokens to sell
   * @param offChainHandler address of offchainHandler
   * @param swapData array of calldata
   * @param _index a counter to keep track index of array
   */
  function _swap(
    address[] memory sellTokens,
    address offChainHandler,
    bytes[] calldata swapData,
    uint256 _index
  ) internal returns (uint256) {
    for (uint256 i = 0; i < sellTokens.length; i++) {
      address _token = sellTokens[i];
      if (_token != address(0) && _token != WETH) {
        uint256 sellAmount = getBalance(_token, _contract);
        TransferHelper.safeTransfer(_token, offChainHandler, sellAmount);
        IExternalSwapHandler(offChainHandler).swap(_token, WETH, sellAmount, swapData[_index], _contract);
        _index++;
      }
    }
    return _index;
  }

  /**
   * @notice The function reverts back WETH back to vault,updating the tokenList and weights accordingly,if only 2 transaction out of 3 is executed(ExternalSell)
   */
  function revertSellTokens() external nonReentrant onlyAssetManager {
    _revertSell();
  }

  /**
   * @notice The function is helper function for revertSellTokens
   */
  function _revertSell() internal {
    if (Steps.SecondSell != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    beforeRevertCheck();
    TransferHelper.safeTransfer(WETH, vault, getBalance(WETH, _contract));

    address[] memory newTokens = RebalanceLibrary.getNewTokens(rebalanceData.oldTokens, WETH);
    RebalanceLibrary.setRecord(index, newTokens, WETH);
    deleteState();
    emit REVERT_SELL_TOKENS(msg.sender);
  }

  /**
   * @notice The function reverts back the token to the vault again to old state,if only 1 transaction out of 3 is executed(enebaleRebalance)
   * @param _lpSlippage array of lpSlippage
   */
  function revertEnableRebalancing(uint256[] calldata _lpSlippage) external nonReentrant onlyAssetManager {
    _revertEnableRebalancing(_lpSlippage);
  }

  /**
   * @notice The function is helper function for revertEnableRebalancing
   * @param _lpSlippage Array of Lp slippage values for the function
   */
  function _revertEnableRebalancing(uint256[] calldata _lpSlippage) internal {
    //checks
    if (Steps.FirstEnable != step) {
      revert ErrorLibrary.InvalidExecution();
    }
    beforeRevertCheck();
    //Check if enable transaction has done
    //Looping over tokens to deposit
    for (uint i = 0; i < modifiedTokens.length; i++) {
      address token = modifiedTokens[i];
      //Redeemedamounts is mapping to keep track of amount of underlying contract has,for particular token -
      // Have used this mapping in PullAndRedeem,to store amounts
      uint256[] memory amounts = redeemedAmounts[token];
      IHandler handler = IHandler(getTokenInfo(token).handler);
      address[] memory underlying = getUnderlying(handler, token);
      //Here it loops throught the length of amount and sends to Aggregator Contract
      for (uint j = 0; j < amounts.length; j++) {
        TransferHelper.safeTransfer(underlying[j], address(aggregator), amounts[j]);
      }
      aggregator._revertRebalance(amounts, _lpSlippage[i], token);
    }
    //Updating the record back, I have used this struct mapping to keep track of oldWeoght and OldTokens
    _updateTokenListAndRecords(rebalanceData.oldTokens, rebalanceData.oldWeight);
    //Setting everthing to normal
    deleteState();
    emit REVERT_ENABLE_REBALANCING(msg.sender);
  }

  /**
   * @notice The function reverts back the token to the vault again to old state,if only 1 transaction out of 3 is executed(enebaleRebalance) and it executed by user after 15 minutes is passed
   * @param _lpSlippage array of lpSlippage
   */
  function revertEnableRebalancingByUser(uint256[] calldata _lpSlippage) external nonReentrant {
    validateUser();
    _revertEnableRebalancing(_lpSlippage);
  }

  /**
   * @notice The function reverts back WETH back to vault,updating the tokenList and weights accordingly,if only 2 transaction out of 3 is executed(ExternalSell) and it executed by user after 15 minutes is passed
   */
  function revertSellByUser() external nonReentrant {
    validateUser();
    _revertSell();
  }

  /**
   * @notice The function gives the bool value, after checking for lastRebalance and lastPaused, for user to take action
   */
  function isUserRevertEnabled() internal view returns (bool status) {
    uint256 _lastPaused = index.getLastPaused();
    status = (block.timestamp >= (_lastPaused + 15 minutes));
  }

  /**
   * @notice The function is used to delete and update variable state, after completion of task/last step
   */
  function deleteState() internal {
    for (uint i = 0; i < modifiedTokens.length; i++) {
      delete redeemedAmounts[modifiedTokens[i]];
    }
    deleteSellTokenData();
    step = Steps.None;
    updateTokenStateData = abi.encode();
    updateWeightStateData = abi.encode();
    index.setFlags(false, false);
    delete modifiedTokens;
    delete rebalanceData.oldWeight;
    delete rebalanceData.oldTokens;
  }

  /**
   * @notice The function is used set RebalanceData, Pause and return index tokens
   */
  function setRebalanceDataAndPause() internal returns (address[] memory _tokens) {
    setPaused(true);
    _tokens = getTokens();
    rebalanceData.oldWeight = RebalanceLibrary.getOldWeights(index, _tokens);
    rebalanceData.oldTokens = _tokens;
  }

  /**
   * @notice The function is used to update Record And Token List
   * @param tokens Array of token addresses
   * @param weights Array of token weights
   */
  function _updateTokenListAndRecords(address[] memory tokens, uint96[] memory weights) internal {
    index.updateTokenListAndRecords(tokens, weights);
  }

  /**
   * @notice The function is used to update Record
   * @param tokens Array of token addresses
   * @param weights Array of token weights
   */
  function updateRecord(address[] memory tokens, uint96[] memory weights) internal {
    index.updateRecords(tokens, weights);
  }

  /**
   * @notice The function is used to setPaused
   * @param _state Boolean parameter passed to set the protocol state
   */
  function setPaused(bool _state) internal {
    index.setPaused(_state);
  }

  /**
   * @notice The function is used to setRedeemed
   * @param _state Boolean parameter passed to set the redeemed state
   */
  function setRedeemed(bool _state) internal {
    index.setRedeemed(_state);
  }

  /**
   * @notice The function is used to get tokens from index
   */
  function getTokens() internal view returns (address[] memory) {
    return index.getTokens();
  }

  /**
   * @notice This internal function returns token information
   * @param _token Address of the token whose info is to be retreived
   */
  function getTokenInfo(address _token) internal view returns (ITokenRegistry.TokenRecord memory) {
    return tokenRegistry.getTokenInformation(_token);
  }

  /**
   * @notice This internal function returns balance of token
   * @param _token Address of the token whole balance is to be retreived
   * @param _of Address whose balance is to be retreived
   */
  function getBalance(address _token, address _of) internal view returns (uint256) {
    return IERC20Upgradeable(_token).balanceOf(_of);
  }

  /**
   * @notice This internal function checks for primary tokens and handler
   * @param tokens Address of the token to be validated
   * @param handler Address of the handler in picture
   */
  function validatePrimaryAndHandler(address[] memory tokens, address handler) internal view {
    IndexSwapLibrary.checkPrimaryAndHandler(tokenRegistry, tokens, handler);
  }

  /**
   * @notice This internal function checks for user validation to execute function
   */
  function validateUser() internal view {
    if (!isUserRevertEnabled()) {
      revert ErrorLibrary.FifteenMinutesNotExcedeed();
    }
  }

  /**
   * @notice This function returns if the tokens have been redeemed or not
   */
  function getRedeemed() internal view returns (bool) {
    return index.getRedeemed();
  }

  /**
   * @notice This function returns underlying tokens for given _token
   * @param handler Address of the handler to be used to get the underlying tokens
   * @param _token Address of the token whose underlying is required
   */
  function getUnderlying(IHandler handler, address _token) internal view returns (address[] memory) {
    return handler.getUnderlying(_token);
  }

  /**
   * @notice This function is used for validating before revert
   */
  function beforeRevertCheck() internal view {
    RebalanceLibrary.beforeRevertCheck(index);
  }

  /**
   * @notice This function returns vaultBalance for particular index
   */
  function getVaultBalance() internal returns (uint256 vaultBalance) {
    (, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, getTokens());
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
