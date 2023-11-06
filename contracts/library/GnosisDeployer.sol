// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {GnosisSafe} from "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import {MultiSend} from "@gnosis.pm/safe-contracts/contracts/libraries/MultiSend.sol";
import {Module} from "@gnosis.pm/zodiac/contracts/core/Module.sol";
import {GnosisSafeProxyFactory} from "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";

import {IVelvetSafeModule} from "../vault/IVelvetSafeModule.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {VelvetSafeModule} from "../vault/VelvetSafeModule.sol";
import {ErrorLibrary} from "./ErrorLibrary.sol";

library GnosisDeployer {
  /**
   * @notice This function deploys a new gnosis safe and module from the factory
   * @param _gnosisSingleton Address of master copy of gnosis safe
   * @param _gnosisSafeProxyFactory Address of gnosis safe proxy factory
   * @param _gnosisMultisendLibrary Address of multi send library by gnosis
   * @param _gnosisFallbackLibrary Address of fallback library by gnosis
   * @param baseGnosisModule Address of base gnosis velvet safe module
   * @param _owners Array of owners
   */
  function deployGnosisSafeAndModule(
    address _gnosisSingleton,
    address _gnosisSafeProxyFactory,
    address _gnosisMultisendLibrary,
    address _gnosisFallbackLibrary,
    address baseGnosisModule,
    address[] memory _owners,
    uint256 _threshold
  ) internal returns (address gnosisSafe, address velvetModule) {
    GnosisSafeProxyFactory gnosisSafeProxyFactory = GnosisSafeProxyFactory(_gnosisSafeProxyFactory);
    GnosisSafe _safe = GnosisSafe(payable(gnosisSafeProxyFactory.createProxy(_gnosisSingleton, bytes(""))));
    VelvetSafeModule _gnosisModule = VelvetSafeModule(Clones.clone(baseGnosisModule));
    bytes memory _multisendAction = generateByteCode(address(_safe), address(_gnosisModule));

    _safe.setup(
      _owners,
      _threshold,
      _gnosisMultisendLibrary,
      _multisendAction,
      _gnosisFallbackLibrary,
      address(0),
      0,
      payable(address(0))
    );
    gnosisSafe = address(_safe);
    velvetModule = address(_gnosisModule);

    if (!_safe.isModuleEnabled(velvetModule)) {
      revert ErrorLibrary.ModuleNotInitialised();
    }
    return (gnosisSafe, velvetModule);
  }

  /**
   * @notice This function generates byte code to be executed during the safe setup
   * @param _safe Address of gnosis safe
   * @param _gnosisModule Address of velvet safe module
   */
  function generateByteCode(
    address _safe,
    address _gnosisModule
  ) internal pure returns (bytes memory _multisendAction) {
    bytes memory _enableSafeModule = abi.encodeWithSignature("enableModule(address)", address(_gnosisModule));
    bytes memory _enableVelvetMultisend = abi.encodePacked(
      uint8(0),
      address(_safe),
      uint256(0),
      uint256(_enableSafeModule.length),
      bytes(_enableSafeModule)
    );
    _multisendAction = abi.encodeWithSignature("multiSend(bytes)", _enableVelvetMultisend);
  }
}
