// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockGauge} from "../src/MockGauge.sol";

contract DeployMockGauge is Script {
    function run() external returns (address) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address mockVeMEZO = vm.envAddress("MOCK_VEMEZO_ADDRESS");

        vm.startBroadcast(deployerKey);
        MockGauge gauge = new MockGauge("MUSD/BTC LP", mockVeMEZO);
        console.log("MockGauge deployed at:", address(gauge));
        vm.stopBroadcast();

        return address(gauge);
    }
}
