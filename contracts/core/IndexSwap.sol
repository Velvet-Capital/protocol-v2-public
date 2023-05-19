// SPDX-License-Identifier: MIT

/**
 * @title IndexSwap for the Index
 * @author Velvet.Capital
 * @notice This contract is used by the user to invest and withdraw from the index
 * @dev This contract includes functionalities:
 *      1. Invest in the particular fund
 *      2. Withdraw from the fund
 */

pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/ERC20Upgradeable.sol";
import {UUPSUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";

import {IIndexSwap} from "../core/IIndexSwap.sol";
import "../core/IndexSwapLibrary.sol";
import {IIndexOperations} from "./IIndexOperations.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";
import {IAccessController} from "../access/IAccessController.sol";
import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {IExchange} from "./IExchange.sol";
import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {IFeeModule} from "../fee/IFeeModule.sol";
import {FunctionParameters} from "../FunctionParameters.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";

contract IndexSwap is Initializable, ERC20Upgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  /**
   * @dev Token record data structure
   * @param lastDenormUpdate timestamp of last denorm change
   * @param denorm denormalized weight
   * @param index index of address in tokens array
   * @param handler handler address for token
   */

  struct Record {
    uint40 lastDenormUpdate;
    uint96 denorm;
    uint256 index;
  }

  // Array of underlying tokens in the pool.
  address[] internal _tokens;

  // Internal records of the pool's underlying tokens
  mapping(address => Record) internal _records;

  // Internal records of the tokens input by asset manager while updating
  mapping(address => bool) internal _previousToken;

  // IERC20 public token;

  //Keeps track of user last investment time
  mapping(address => uint256) public lastInvestmentTime;
  using SafeMathUpgradeable for uint256;

  address internal _vault;
  address internal _module;

  bool internal _paused;

  bool internal _redeemed;

  IPriceOracle internal _oracle;
  IFeeModule internal _feeModule;
  IAccessController internal _accessController;
  ITokenRegistry internal _tokenRegistry;
  IExchange internal _exchange;
  IAssetManagerConfig internal _iAssetManagerConfig;

  // Total denormalized weight of the pool.
  uint256 internal constant _TOTAL_WEIGHT = 10_000;

  //events
  event InvestInFund(
    address user,
    uint256 investedAmount,
    uint256 tokenAmount,
    uint256 rate,
    address index,
    uint256 time
  );
  event WithdrawFund(
    address indexed user,
    uint256 tokenAmount,
    uint256 indexed rate,
    address indexed index,
    uint256 time
  );

  // /** @dev Emitted when public trades are enabled. */
  event LOG_PUBLIC_SWAP_ENABLED();

  function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._beforeTokenTransfer(from, to, amount);

    if (from == address(0) || to == address(0)) {
      return;
    }
    if (
      !(_iAssetManagerConfig.transferableToPublic() ||
        (_iAssetManagerConfig.transferable() && _iAssetManagerConfig.whitelistedUsers(to)))
    ) {
      revert ErrorLibrary.Transferprohibited();
    }
  }

  /**
   * @notice This function is used to init the IndexSwap while deployment
   * @param initData Includes the input params
   */
  function init(FunctionParameters.IndexSwapInitData calldata initData) external initializer {
    __ERC20_init(initData._name, initData._symbol);
    __UUPSUpgradeable_init();
    _vault = initData._vault;
    _module = initData._module;
    _accessController = IAccessController(initData._accessController);
    _tokenRegistry = ITokenRegistry(initData._tokenRegistry);
    _oracle = IPriceOracle(initData._oracle);
    _paused = false;
    _exchange = IExchange(initData._exchange);
    _iAssetManagerConfig = IAssetManagerConfig(initData._iAssetManagerConfig);
    _feeModule = IFeeModule(initData._feeModule);
  }

  /**
   * @dev Sets up the initial assets for the pool.
   * @param tokens Underlying tokens to initialize the pool with
   * @param denorms Initial denormalized weights for the tokens
   */
  function initToken(address[] calldata tokens, uint96[] calldata denorms) external virtual onlySuperAdmin {
    if (tokens.length != denorms.length) {
      revert ErrorLibrary.InvalidInitInput();
    }
    if (_tokens.length != 0) {
      revert ErrorLibrary.AlreadyInitialized();
    }
    uint256 len = tokens.length;
    uint256 totalWeight = 0;
    for (uint256 i = 0; i < len; i++) {
      IndexSwapLibrary._beforeInitCheck(IIndexSwap(address(this)), tokens[i], denorms[i]);
      _records[tokens[i]] = Record({lastDenormUpdate: uint40(block.timestamp), denorm: denorms[i], index: uint256(i)});
      _tokens.push(tokens[i]);

      totalWeight = totalWeight.add(denorms[i]);
    }
    if (totalWeight != _TOTAL_WEIGHT) {
      revert ErrorLibrary.InvalidWeights({totalWeight: _TOTAL_WEIGHT});
    }

    emit LOG_PUBLIC_SWAP_ENABLED();
  }

  modifier onlySuperAdmin() {
    if (!(_accessController.hasRole(keccak256("SUPER_ADMIN"), msg.sender))) {
      revert ErrorLibrary.CallerNotSuperAdmin();
    }
    _;
  }

  function mintShares(address _to, uint256 _amount) public virtual onlyMinter {
    _mint(_to, _amount);
  }

  function burnShares(address _to, uint256 _amount) public virtual onlyMinter {
    _burn(_to, _amount);
  }

  /**
     * @notice The function swaps BNB into the portfolio tokens after a user makes an investment
     * @dev The output of the swap is converted into BNB to get the actual amount after slippage to calculate 
            the index token amount to mint
     * @dev (tokenBalanceInBNB, vaultBalance) has to be calculated before swapping for the _mintShareAmount function 
            because during the swap the amount will change but the index token balance is still the same 
            (before minting)
     */
  function investInFund(
    FunctionParameters.InvestFund memory investData
  ) external payable virtual nonReentrant notPaused {
    IndexSwapLibrary.beforeInvestment(investData._slippage.length, investData._lpSlippage.length, investData._to);
    if (msg.value > 0) {
      investData._tokenAmount = msg.value;
      IndexSwapLibrary._checkInvestmentValue(investData._tokenAmount, _iAssetManagerConfig);
    } else {
      IndexSwapLibrary._checkPermissionAndBalance(
        investData._token,
        investData._tokenAmount,
        _iAssetManagerConfig,
        msg.sender
      );
      uint256 tokenBalanceInBNB = getTokenBalanceInBNB(investData._token, investData._tokenAmount);
      IndexSwapLibrary._checkInvestmentValue(tokenBalanceInBNB, _iAssetManagerConfig);
      TransferHelper.safeApprove(investData._token, address(this), investData._tokenAmount);
    }

    uint256 investedAmountAfterSlippage = 0;
    uint256 vaultBalance = 0;
    uint256 len = _tokens.length;
    uint256[] memory amount = new uint256[](len);
    uint256[] memory tokenBalance = new uint256[](len);

    (tokenBalance, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(IIndexSwap(address(this)), getTokens());

    uint256 vaultBalanceInBNB = IndexSwapLibrary._getTokenPriceUSDETH(_oracle, vaultBalance);
    _feeModule.chargeFeesFromIndex(vaultBalanceInBNB);

    amount = IndexSwapLibrary.calculateSwapAmounts(
      IIndexSwap(address(this)),
      investData._tokenAmount,
      tokenBalance,
      vaultBalance
    );
    IIndexOperations indexOperations = IIndexOperations(_tokenRegistry.IndexOperationHandler());
    uint256[] memory slippage = investData._slippage;
    if (investData._token != _tokenRegistry.WETH()) {
      TransferHelper.safeTransferFrom(investData._token, msg.sender, address(indexOperations), investData._tokenAmount);
    }
    investedAmountAfterSlippage = indexOperations._swapTokenToTokens{value: msg.value}(
      FunctionParameters.SwapTokenToTokensData(
        address(this),
        investData._token,
        investData._swapHandler,
        investData._tokenAmount,
        totalSupply(),
        amount,
        slippage,
        investData._lpSlippage
      )
    );
    uint256 investedAmountAfterSlippageBNB = IndexSwapLibrary._getTokenPriceUSDETH(_oracle, investedAmountAfterSlippage);

    require(investedAmountAfterSlippageBNB > 0, "final invested amount is 0");
    uint256 tokenAmount;
    if (totalSupply() > 0) {
      tokenAmount = IndexSwapLibrary._mintShareAmount(investedAmountAfterSlippageBNB, vaultBalanceInBNB, totalSupply());
    } else {
      tokenAmount = investedAmountAfterSlippageBNB;
    }
    require(tokenAmount > 0, "token amount is 0");

    _mint(investData._to, tokenAmount);
    lastInvestmentTime[investData._to] = block.timestamp;

    emit InvestInFund(
      investData._to,
      investData._tokenAmount,
      tokenAmount,
      IndexSwapLibrary.getIndexTokenRate(IIndexSwap(address(this))),
      address(this),
      block.timestamp
    );
    // refund leftover ETH to user
    (bool success, ) = payable(investData._to).call{value: address(this).balance}("");
    require(success, "refund failed");
  }

  /**
     * @notice The function swaps the amount of portfolio tokens represented by the amount of index token back to 
               BNB and returns it to the user and burns the amount of index token being withdrawn
     */

  function withdrawFund(FunctionParameters.WithdrawFund calldata initData) external nonReentrant notPaused {
    checkCoolDownPeriod();
    IndexSwapLibrary.beforeWithdrawCheck(
      initData._slippage.length,
      initData._lpSlippage.length,
      msg.sender,
      IIndexSwap(address(this)),
      initData.tokenAmount
    );
    uint256 vaultBalance;
    (, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(IIndexSwap(address(this)), getTokens());
    uint256 vaultBalanceInBNB = IndexSwapLibrary._getTokenPriceUSDETH(_oracle, vaultBalance);

    address assetManagerTreasury = _iAssetManagerConfig.assetManagerTreasury();
    address velvetTreasury = _tokenRegistry.velvetTreasury();
    if (!(msg.sender == assetManagerTreasury || msg.sender == velvetTreasury)) {
      _feeModule.chargeFeesFromIndex(vaultBalanceInBNB);
    }

    uint256 totalSupplyIndex = totalSupply();
    emit WithdrawFund(
      msg.sender,
      initData.tokenAmount,
      IndexSwapLibrary.getIndexTokenRate(IIndexSwap(address(this))),
      address(this),
      block.timestamp
    );
    _burn(msg.sender, initData.tokenAmount);

    for (uint256 i = 0; i < _tokens.length; i++) {
      uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(IIndexSwap(address(this)), _tokens[i]);

  //     require(tokenBalance.mul(initData.tokenAmount) >= totalSupplyIndex, "incorrect token amount");

      tokenBalance = tokenBalance.mul(initData.tokenAmount).div(totalSupplyIndex);

      if (initData.isMultiAsset || _tokens[i] == initData._token) {
        IndexSwapLibrary.withdrawMultiAsset(_tokens[i], tokenBalance);
      } else {
        IndexSwapLibrary.pullFromVault(IIndexSwap(address(this)), _tokens[i], tokenBalance, address(_exchange));
        _exchange._swapTokenToToken(
          FunctionParameters.SwapTokenToTokenData(
            _tokens[i],
            initData._token,
            msg.sender,
            initData._swapHandler,
            tokenBalance,
            initData._slippage[i],
            initData._lpSlippage[i],
            false
          )
        );
      }
    }

    if (
      !(balanceOf(msg.sender) == 0 ||
        getVelvetTokenBalanceInBNB(balanceOf(msg.sender)) >= _tokenRegistry.MIN_VELVET_INVESTMENTAMOUNT())
    ) {
      revert ErrorLibrary.BalanceCantBeBelowVelvetMinInvestAmount({
        minVelvetInvestment: _tokenRegistry.MIN_VELVET_INVESTMENTAMOUNT()
      });
    }
  }

  modifier onlyRebalancerContract() {
    if (!(_accessController.hasRole(keccak256("REBALANCER_CONTRACT"), msg.sender))) {
      revert ErrorLibrary.CallerNotRebalancerContract();
    }
    _;
  }

  modifier onlyMinter() {
    if (!(_accessController.hasRole(keccak256("MINTER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotIndexManager();
    }
    _;
  }

  modifier notPaused() {
    if (_paused) {
      revert ErrorLibrary.ContractPaused();
    }
    _;
  }

  /**
    @notice The function will pause the InvestInFund() and Withdrawal() called by the rebalancing contract.
    @param _state The state is bool value which needs to input by the Index Manager.
  */
  function setPaused(bool _state) public virtual onlyRebalancerContract {
    _paused = _state;
  }

  /**
    @notice The function will update the redeemed value
    @param _state The state is bool value which needs to input by the Index Manager.
  */
  function setRedeemed(bool _state) public virtual onlyRebalancerContract {
    _redeemed = _state;
  }

  /**
   * @notice The function updates the record struct including the denorm information
   * @dev The token list is passed so the function can be called with current or updated token list
   * @param tokens The updated token list of the portfolio
   * @param denorms The new weights for for the portfolio
   */
  function updateRecords(address[] calldata tokens, uint96[] calldata denorms) public virtual onlyRebalancerContract {
    uint256 totalWeight = 0;
    for (uint256 i = 0; i < tokens.length; i++) {
      if (denorms[i] <= 0) {
        revert ErrorLibrary.ZeroDenormValue();
      }
      if (_previousToken[tokens[i]] == true) {
        revert ErrorLibrary.TokenAlreadyExist();
      }
      _records[tokens[i]] = Record({lastDenormUpdate: uint40(block.timestamp), denorm: denorms[i], index: uint8(i)});

      totalWeight = totalWeight.add(denorms[i]);
      _previousToken[tokens[i]] = true;
    }
    setFalse(tokens);

    if (totalWeight != _TOTAL_WEIGHT) {
      revert ErrorLibrary.InvalidWeights({totalWeight: _TOTAL_WEIGHT});
    }
  }

  /**
    @notice The function sets the token state to false for it be reused later by the asset manager
    @param tokens Addresses of the tokens whose state is to be changed
  */
  function setFalse(address[] calldata tokens) internal {
    for (uint i = 0; i < tokens.length; i++) {
      _previousToken[tokens[i]] = false;
    }
  }

  /**
    @notice The function returns the token list
  */
  function getTokens() public view virtual returns (address[] memory) {
    return _tokens;
  }

  /**
    @notice The function returns a boolean ouput of the redeemed value
  */
  function getRedeemed() public view virtual returns (bool) {
    return _redeemed;
  }

  /**
    @notice This function calculates the IndexToken balance of user in terms of BNB
    @param tokenAmount Index Token amount passed
    @return tokenAmountBNB Final token balance of the user in BNB
  */
  function getVelvetTokenBalanceInBNB(uint256 tokenAmount) internal virtual returns (uint256 tokenAmountBNB) {
    (, uint256 vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(IIndexSwap(address(this)), getTokens());

    if (tokenAmount > 0 && vaultBalance > 0) {
      tokenAmountBNB = IndexSwapLibrary._getTokenPriceUSDETH(_oracle, vaultBalance.mul(tokenAmount).div(totalSupply()));
    }
  }

  /**
   * @notice This function returns the record of a specific token
   */
  function getRecord(address _token) public view virtual returns (Record memory) {
    return _records[_token];
  }

  /**
   * @notice This function updates the token list with new tokens
   * @param tokens List of updated tokens
   */
  function updateTokenList(address[] calldata tokens) public virtual onlyRebalancerContract {
    _tokens = tokens;
  }

  function vault() external view returns(address){
    return _vault;
  }

  function feeModule() external view returns (address){
    return address(_feeModule);
  }

  function exchange() external view returns (address){
    return address(_exchange);
  }

  function tokenRegistry() external view returns (address){
    return address(_tokenRegistry);
  }

  function accessController() external view returns (address){
    return address(_accessController);
  }

  function paused() external view returns (bool){
    return _paused;
  }

  function TOTAL_WEIGHT() external pure returns (uint256){
    return _TOTAL_WEIGHT;
  }

  function iAssetManagerConfig() external view returns (address){
    return address(_iAssetManagerConfig);
  }

  function oracle() external view returns (address){
    return address(_oracle);
  }

  /**
   * @notice This function deletes a particular token record
   * @param t Address of the token whose record is to be deleted
   */
  function deleteRecord(address t) public virtual onlyRebalancerContract {
    delete _records[t];
  }

  /**
   * @notice Claims the token for the caller via the Exchange contract
   * @param tokens Addresses of the token for which the reward is to be claimed
   */
  function claimTokens(address[] calldata tokens) public {
    _exchange.claimTokens(IIndexSwap(address(this)), tokens);
  }

  /**
   * @notice Returns the token balance in BNB
   * @param _token Address of the token whose balance is required
   * @param _tokenAmount Amount of the token
   * @return tokenBalanceInBNB Final token balance in BNB
   */
  function getTokenBalanceInBNB(
    address _token,
    uint256 _tokenAmount
  ) internal view returns (uint256 tokenBalanceInBNB) {
    uint256 tokenBalanceInUSD = IndexSwapLibrary._getTokenAmountInUSD(address(_oracle), _token, _tokenAmount);
    tokenBalanceInBNB = IndexSwapLibrary._getTokenPriceUSDETH(_oracle, tokenBalanceInUSD);
  }

  /**
   * @notice Checks for the cooldown period to be correct as per the block timestamp
   */
  function checkCoolDownPeriod() public view {
    if (block.timestamp.sub(lastInvestmentTime[msg.sender]) < _tokenRegistry.COOLDOWN_PERIOD()) {
      revert ErrorLibrary.CoolDownPeriodNotPassed();
    }
  }

  /**
   * @notice Keeps a record of the last investment made
   * @param _to Address of the last investor
   */
  function setLastInvestmentPeriod(address _to) public onlyMinter {
    lastInvestmentTime[_to] = block.timestamp;
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override {}
}
