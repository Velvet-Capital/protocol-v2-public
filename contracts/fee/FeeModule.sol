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

  event ProtocolFeeToBeMinted(
    uint256 time,
    address indexed index,
    address indexed assetManagementTreasury,
    address indexed protocolTreasury,
    uint256 protocolFee,
    uint256 managerFee
  );

  event PerformanceFeeToBeMinted(
    uint256 time,
    address indexed index,
    address indexed treasury,
    uint256 performanceFee,
    uint256 currentPrice,
    uint256 feePercent
  );

  IIndexSwap public index;
  IAssetManagerConfig public assetManagerConfig;
  ITokenRegistry public tokenRegistry;
  IAccessController public accessController;

  uint256 public lastChargedProtocolFee;
  uint256 public lastChargedPManagementFee;
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

  function chargeFees() public virtual notPaused {
    (, uint256 vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, index.getTokens());
    uint256 vaultBalanceInBNB = IndexSwapLibrary._getTokenPriceUSDETH(IPriceOracle(index.oracle()), vaultBalance);
    _chargeFees(vaultBalanceInBNB);
  }

  function _chargeFees(uint256 _vaultBalance) internal {
    uint256 _managementFee = chargeProtocolAndManagementFee(_vaultBalance, index.totalSupply());

    uint256 _performanceFee = chargePerformanceFee(_vaultBalance, index.totalSupply().add(_managementFee));

    uint256 assetManagerFee = _managementFee.add(_performanceFee);
    if (assetManagerFee > MIN_FEE_MINT) {
      index.mintShares(assetManagerConfig.assetManagerTreasury(), assetManagerFee);
      lastChargedPManagementFee = block.timestamp;
    }
  }

  /**
   * @notice The function charges the protocol and management fee
   *         Only the protocol fee is being minted because for the performance fee we mint to the same account
   *         so the mint function only has to be called once to mint the management and performance fees together
   * @return Returns the asset manager (management fees) that is being minted together with the performance fee
   */
  function chargeProtocolAndManagementFee(
    uint256 _vaultBalance,
    uint256 _totalSupply
  ) internal virtual returns (uint256) {
    if (_totalSupply == 0 && _vaultBalance == 0) {
      lastChargedProtocolFee = block.timestamp;
      lastChargedPManagementFee = block.timestamp;
      return 0;
    }
    (uint256 _protocolFee, uint256 _assetManagerFee) = calculateProtocolAndManagementFee(_vaultBalance, _totalSupply);
    if (_protocolFee > MIN_FEE_MINT) {
      index.mintShares(tokenRegistry.velvetTreasury(), _protocolFee);
      lastChargedProtocolFee = block.timestamp;
    }

    return _assetManagerFee;
  }

  /**
   * @notice The function calculates the protocol and management fee
   * @return _protocolFee Returns the amount of idx tokens to be minted to represent the fee
   * @return _assetManagerFee Returns the amount of idx tokens to be minted to represent the fee
   */
  function calculateProtocolAndManagementFee(
    uint256 _vaultBalance,
    uint256 _totalSupply
  ) internal virtual returns (uint256 _protocolFee, uint256 _assetManagerFee) {
    if (_totalSupply == 0) {
      return (0, 0);
    }

    _protocolFee = FeeLibrary.calculateStreamingFee(
      _totalSupply,
      _vaultBalance,
      lastChargedProtocolFee,
      tokenRegistry.protocolFee()
    );

    _assetManagerFee = FeeLibrary.calculateStreamingFee(
      _totalSupply,
      _vaultBalance,
      lastChargedPManagementFee,
      tokenRegistry.maxManagementFee()
    );

    emit ProtocolFeeToBeMinted(
      block.timestamp,
      address(index),
      assetManagerConfig.assetManagerTreasury(),
      tokenRegistry.velvetTreasury(),
      _protocolFee,
      _assetManagerFee
    );
  }

  /**
   * @notice The function calculates the amount to mint which is minted together with the management fee
   *         The high watermark is updated if the current token price is higher than the old high watermark (performance fee > 0)
   * @return Returns the amount of idx tokens to mint for the performance fee
   */
  function chargePerformanceFee(uint256 _vaultBalance, uint256 _totalSupplyNew) internal virtual returns (uint256) {
    // if totalSupply == 0 -> totalSupplyNew will be 0 because for managementFee 0 will be returned
    if ((_totalSupplyNew == 0 && _vaultBalance == 0) || assetManagerConfig.performanceFee() == 0) {
      return 0;
    }
    uint256 _performanceFee = calculatePerformanceFee(_vaultBalance, _totalSupplyNew);

    if (_performanceFee > MIN_FEE_MINT) {
      highWatermark = _vaultBalance.mul(10 ** 18).div(_totalSupplyNew);
    }
  }

  /**
   * @notice The function calculates the amount to mint which is minted together with the management fee
   * @return _performanceFee Returns the amount of idx tokens to mint for the performance fee
   */
  function calculatePerformanceFee(
    uint256 _vaultBalance,
    uint256 _totalSupply
  ) internal virtual returns (uint256 _performanceFee) {
    if (_totalSupply == 0 || _vaultBalance == 0) {
      return 0;
    }

    uint256 currentPrice;
    (_performanceFee, currentPrice) = FeeLibrary.calculatePerformanceFee(
      _totalSupply,
      _vaultBalance,
      highWatermark,
      assetManagerConfig.performanceFee()
    );

    emit PerformanceFeeToBeMinted(
      block.timestamp,
      address(index),
      assetManagerConfig.assetManagerTreasury(),
      _performanceFee,
      currentPrice,
      assetManagerConfig.performanceFee()
    );
  }

  /**
   * @notice The function charges fees and is called by the IndexSwap contract
   *         The vault values has already been calculated and can be passed
   */
  function chargeFeesFromIndex(uint256 _vaultBalance) public virtual onlyIndexManager notPaused {
    _chargeFees(_vaultBalance);
  }

  /**
   * @notice The function calculates all fees and returns the values
   */
  function calculateFees()
    public
    virtual
    returns (uint256 _protocolFee, uint256 _managementFee, uint256 _performanceFee)
  {
    uint256 _totalSupply = index.totalSupply();
    (, uint256 vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(index, index.getTokens());
    if (vaultBalance == 0 || _totalSupply == 0) {
      return (0, 0, 0);
    }

    (_protocolFee, _managementFee) = calculateProtocolAndManagementFee(vaultBalance, _totalSupply);
    _performanceFee = calculatePerformanceFee(vaultBalance, _totalSupply.add(_managementFee));
  }

  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
