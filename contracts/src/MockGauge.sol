// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * Hackathon mock gauge for demonstrating Mezoir's voting flow.
 * This contract is intentionally minimal and does not attempt to mirror
 * full production gauge/voter mechanics.
 * In production, real Mezo gauge voting routes through the protocol's Voter contract.
 */

interface IMockVeMEZO {
    function ownerOf(uint256) external view returns (address);
    function allowedManager(address) external view returns (address);
}

contract MockGauge {
    string public name;
    address public veMEZO;

    // tokenId => weight cast on this gauge
    mapping(uint256 => uint256) public votes;
    uint256 public totalVotes;

    event Voted(address indexed voter, uint256 indexed tokenId, uint256 weight, uint256 timestamp);

    constructor(string memory _name, address _veMEZO) {
        name = _name;
        veMEZO = _veMEZO;
    }

    function vote(uint256 tokenId, uint256 weight) external {
        IMockVeMEZO ve = IMockVeMEZO(veMEZO);
        address owner = ve.ownerOf(tokenId);
        address manager = ve.allowedManager(owner);
        require(msg.sender == owner || msg.sender == manager, "MockGauge: not authorized");
        require(weight > 0, "MockGauge: zero weight");

        totalVotes -= votes[tokenId];
        votes[tokenId] = weight;
        totalVotes += weight;

        emit Voted(msg.sender, tokenId, weight, block.timestamp);
    }
}
