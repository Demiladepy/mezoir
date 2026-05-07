// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockVeMEZO} from "../src/MockVeMEZO.sol";

contract DeployMockVeMEZO is Script {
    function run() external returns (address) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        MockVeMEZO mock = new MockVeMEZO();
        console.log("MockVeMEZO deployed at:", address(mock));

        vm.stopBroadcast();
        return address(mock);
    }
}
