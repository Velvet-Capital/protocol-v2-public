// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";

import {FeeLibrary} from "./FeeLibrary.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";

import {IAccessController} from "../access/IAccessController.sol";

import {IIndexSwap} from "../core/IIndexSwap.sol";
import "../core/IndexSwapLibrary.sol";

import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FeeModule is Initializable, OwnableUpgradeable, UUPSUpgradeable {
  using SafeMathUpgradeable for uint256;

  uint256 internal constant MIN_FEE_MINT = 100000000000000;

  event FeesToBeMinted(
    uint256 time,
    address indexed index,
    address indexed assetManagementTreasury,
    address indexed protocolTreasury,
    uint256 protocolFee,
    uint256 managerFee
  );

  event PerformanceFeeCalculated(
    uint256 time,
    address indexed index,
    uint256 performanceFee,
    uint256 currentPrice,
    uint256 feePercent
  );

  event ManagementFeeCalculated(
    uint256 time,
    address indexed index,
    uint256 managementFee,
    uint256 protocolStreamingFee
  );

  event EntryFeeCharged(uint256 time, address indexed index, uint256 entryProtocolFee, uint256 entryAssetManagerFee);

  event ExitFeeCharged(uint256 time, address indexed index, uint256 exitProtocolFee, uint256 exitAssetManagerFee);

  IIndexSwap public index;
  IAssetManagerConfig public assetManagerConfig;
  ITokenRegistry public tokenRegistry;
  IAccessController public accessController;

  uint256 public lastChargedProtocolFee;
  uint256 public lastChargedManagementFee;
  uint256 public highWatermark;

  modifier onlyIndexManager() {
    if (!(accessController.hasRole(keccak256("INDEX_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotIndexManager();
    }
    _;
  }

  modifier notPaused() {
    if ((index.paused())) {
      revert ErrorLibrary.ContractPaused();
    }
    _;
  }

  /**
   * @notice This function is used to initialise the fee module while deployment
   */
  function init(
    address _indexSwap,
    address _assetManagerConfig,
    address _tokenRegistry,
    address _accessController
  ) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();

    highWatermark = 10 ** 18;
    index = IIndexSwap(_indexSwap);
    assetManagerConfig = IAssetManagerConfig(_assetManagerConfig);
    tokenRegistry = ITokenRegistry(_tokenRegistry);
    accessController = IAccessController(_accessController);
  }

  /**
   * @notice This function charges the management fee as per the vault balance in BNB
   */
  function chargeFees() external virtual notPaused {
    (, uint256 vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, index.getTokens());
    uint256 vaultBalanceInBNB = IPriceOracle(index.oracle()).getUsdEthPrice(vaultBalance);
    _chargeManagementFees(vaultBalanceInBNB);
  }

  /**
   * @notice This function is used to mint the management fee share as per the vault balance
   */
  function _chargeManagementFees(uint _vaultBalance) internal {
    (uint _protocolFeeToMint, uint assetManagerFeeToMint, ) = _calculateManagementFees(_vaultBalance);
    _mintManagementFeeShares(assetManagerFeeToMint, _protocolFeeToMint);

    emit FeesToBeMinted(
      block.timestamp,
      address(index),
      assetManagerConfig.assetManagerTreasury(),
      tokenRegistry.velvetTreasury(),
      _protocolFeeToMint,
      assetManagerFeeToMint
    );
  }

  /**
   * @notice This function calculates all management fees (management + performance fee), as a protocol we're taking the cut calculated in feeSplitter (e.g. 25%), entry and exit fees are separate
   */
  function _calculateManagementFees(uint256 _vaultBalance) internal returns (uint, uint, uint) {
    uint256 _totalSupply = index.totalSupply();

    if (_totalSupply == 0 && _vaultBalance == 0) {
      lastChargedProtocolFee = block.timestamp;
      lastChargedManagementFee = block.timestamp;
      return (0, 0, 0);
    }

    (uint256 _protocolFeeCut, uint256 _managementFee) = _calculateProtocolAndManagementFee(_vaultBalance, _totalSupply);
    uint256 _performanceFee = _calculatePerformanceFee(_vaultBalance, _totalSupply.add(_managementFee));

    uint256 assetManagerFeeTotal = _managementFee.add(_performanceFee);

    (uint256 _protocolFeeToMint, uint256 assetManagerFeeToMint) = protocolMinFeeCheck(
      assetManagerFeeTotal,
      _protocolFeeCut
    );

    return (_protocolFeeToMint, assetManagerFeeToMint, _performanceFee);
  }

  /**
   * @notice The function charges fees and is called by the IndexSwap contract
   *         The vault values has already been calculated and can be passed
   */
  function chargeFeesFromIndex(uint256 _vaultBalance) external virtual onlyIndexManager notPaused {
    _chargeManagementFees(_vaultBalance);
  }

  /**
   * @notice This function is used to mint the fees if the calculated value is greater than 0 and we update the highWatermark (for the performance fee)
   */
  function _mintManagementFeeShares(uint256 assetManagerFeeToMint, uint256 _protocolFeeToMint) internal {
    if (assetManagerFeeToMint > 0) {
      index.mintShares(assetManagerConfig.assetManagerTreasury(), assetManagerFeeToMint);
      lastChargedManagementFee = block.timestamp;
    }

    if (_protocolFeeToMint > 0) {
      index.mintShares(tokenRegistry.velvetTreasury(), _protocolFeeToMint);
      lastChargedProtocolFee = block.timestamp;
    }

    _updateHighWaterMark();
  }

  /**
   * @notice This function is used to mint shares of the specific amount (has to be greator than the minimum mint fee) to the user
   */
  function _mintSharesSingle(address _to, uint256 _amount) internal returns (uint256) {
    if (_amount >= MIN_FEE_MINT) {
      index.mintShares(_to, _amount);
      return _amount;
    }
    return 0;
  }

  /**
   * @notice This function is used to check if 25% of the management fee is greater than 0.3% (or any value set by us) of the streaming fee to make sure our protocol fee is at least 0.3% streaming fee.
   * If the above case is not satisfied, streaming fee is charged and any leftover fee amount is sent to the asset manager.
   */
  function protocolMinFeeCheck(uint256 _fee, uint256 _protocolStreamingFeeMin) internal returns (uint256, uint256) {
    (uint256 _protocolFeeCut, uint256 _assetManagerFee) = FeeLibrary.feeSplitter(_fee, tokenRegistry.protocolFee());

    if (_protocolFeeCut < _protocolStreamingFeeMin) {
      _assetManagerFee = _fee > _protocolStreamingFeeMin ? _fee.sub(_protocolStreamingFeeMin) : 0;

      return (_protocolStreamingFeeMin, _assetManagerFee);
    } else {
      return (_protocolFeeCut, _assetManagerFee);
    }
  }

  /**
   * @notice The function calculates the protocol and management fee
   * @return _protocolStreamingFeeMin Protocol streming fee with protocolFeeBottomConstraint % set in token registry
   * @return _fee Returns the amount of idx tokens to be minted for management fee (including protocol cut)
   */
  function _calculateProtocolAndManagementFee(
    uint256 _vaultBalance,
    uint256 _totalSupply
  ) internal virtual returns (uint256 _protocolStreamingFeeMin, uint256 _fee) {
    // Streming fee for management fee, we're taking a cut for protocol fee
    _fee = FeeLibrary.calculateStreamingFee(
      _totalSupply,
      _vaultBalance,
      lastChargedManagementFee,
      assetManagerConfig.managementFee()
    );

    // Streaming protocol fee with protocolFeeBottomConstraint set in tokenRegistry, e.g. 0.3%
    _protocolStreamingFeeMin = FeeLibrary.calculateStreamingFee(
      _totalSupply,
      _vaultBalance,
      lastChargedProtocolFee,
      tokenRegistry.protocolFeeBottomConstraint() // 0.3%, TODO add to token registry
    );

    emit ManagementFeeCalculated(block.timestamp, address(index), _fee, _protocolStreamingFeeMin);
  }

  /**
   * @notice The function calculates the amount to mint which is minted together with the management fee
   * @return _performanceFee Returns the amount of idx tokens to mint for the performance fee
   */
  function _calculatePerformanceFee(
    uint256 _vaultBalance,
    uint256 _totalSupply
  ) internal virtual returns (uint256 _performanceFee) {
    if (_totalSupply == 0 || _vaultBalance == 0) {
      highWatermark = 10 ** 18;
      return 0;
    }

    uint256 currentPrice;
    (_performanceFee, currentPrice) = FeeLibrary.calculatePerformanceFee(
      _totalSupply,
      _vaultBalance,
      highWatermark,
      assetManagerConfig.performanceFee()
    );
    emit PerformanceFeeCalculated(
      block.timestamp,
      address(index),
      _performanceFee,
      currentPrice,
      assetManagerConfig.performanceFee()
    );
  }

  /**
   * @notice This function is used to chage the "entry fee" based on the protocol and the asset-manager fee
   */
  function chargeEntryFee(uint256 _mintAmount, uint256 _fee) external virtual onlyIndexManager returns (uint256) {
    uint256 _entryFee = FeeLibrary.calculateEntryAndExitFee(_fee, _mintAmount);
    (uint256 protocolFee, uint256 assetManagerFee) = FeeLibrary.feeSplitter(_entryFee, tokenRegistry.protocolFee());

    protocolFee = _mintSharesSingle(tokenRegistry.velvetTreasury(), protocolFee);
    assetManagerFee = _mintSharesSingle(assetManagerConfig.assetManagerTreasury(), assetManagerFee);

    uint256 _userMintAmount = _mintAmount.sub(protocolFee).sub(assetManagerFee);

    emit EntryFeeCharged(block.timestamp, address(index), protocolFee, assetManagerFee);

    return _userMintAmount;
  }

  /**
   * @notice This function is used to charge the "exit fee" based on the protocol and asset-manager fee
   */
  function chargeExitFee(
    uint256 _mintAmount,
    uint256 _fee
  ) external virtual onlyIndexManager returns (uint256, uint256, uint256) {
    uint256 _exitFee = FeeLibrary.calculateEntryAndExitFee(_fee, _mintAmount);
    (uint256 protocolFee, uint256 assetManagerFee) = FeeLibrary.feeSplitter(_exitFee, tokenRegistry.protocolFee());

    protocolFee = _mintSharesSingle(tokenRegistry.velvetTreasury(), protocolFee);
    assetManagerFee = _mintSharesSingle(assetManagerConfig.assetManagerTreasury(), assetManagerFee);

    emit ExitFeeCharged(block.timestamp, address(index), protocolFee, assetManagerFee);

    return (protocolFee, assetManagerFee, protocolFee.add(assetManagerFee));
  }

  /**
   * @notice The function calculates all fees and returns the values
   */
  function calculateFees()
    external
    virtual
    returns (uint256 _protocolFee, uint256 _managementFee, uint256 _performanceFee)
  {
    (, uint256 vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, index.getTokens());
    uint256 vaultBalanceInBNB = IPriceOracle(index.oracle()).getUsdEthPrice(vaultBalance);
    (_protocolFee, _managementFee, _performanceFee) = _calculateManagementFees(vaultBalanceInBNB);
  }

  /**
   * @notice This function is used to the update the higherWatermark value as per the current index token rate in BNB
   */
  function _updateHighWaterMark() internal {
    uint256 currentPriceBNB = IndexSwapLibrary.getIndexTokenRateBNB(index);
    highWatermark = currentPriceBNB > highWatermark ? currentPriceBNB : highWatermark;
  }

  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
