// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HelloMezoir} from "../src/HelloMezoir.sol";

contract DeployHelloMezoir is Script {
    function run() external returns (HelloMezoir deployed) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory initialGreeting = vm.envString("INITIAL_GREETING");

        vm.startBroadcast(deployerPrivateKey);
        deployed = new HelloMezoir(initialGreeting);
        vm.stopBroadcast();
    }
}
