// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HelloMezoir {
    string public greeting;

    constructor(string memory initialGreeting) {
        greeting = initialGreeting;
    }

    function setGreeting(string calldata newGreeting) external {
        greeting = newGreeting;
    }
}
