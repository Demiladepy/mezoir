// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockVeBTC} from "../src/MockVeBTC.sol";

contract DeployMockVeBTC is Script {
    function run() external returns (address) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        MockVeBTC mock = new MockVeBTC();
        console.log("MockVeBTC deployed at:", address(mock));

        vm.stopBroadcast();
        return address(mock);
    }
}
