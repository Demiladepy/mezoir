// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockVeMEZO
/// @notice Mock implementation of Mezo's veMEZO interface for hackathon development.
///         Mirrors veMEZO at 0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b
///         on Mezo testnet, using payable msg.value to sidestep testnet
///         BTC/MEZO precompile authorization issues during hackathon.
contract MockVeMEZO {
    struct LockedBalance {
        int128 amount;
        uint256 end;
    }

    uint256 public nextTokenId = 1;

    // tokenId => owner
    mapping(uint256 => address) public ownerOf;
    // tokenId => locked balance
    mapping(uint256 => LockedBalance) private _locked;
    // owner => list of tokenIds (for enumeration)
    mapping(address => uint256[]) private _ownedTokens;
    // owner => index of token in their list
    mapping(uint256 => uint256) private _ownedTokensIndex;
    // account-level allowed manager
    mapping(address => address) public allowedManager;

    event Deposit(
        address indexed provider,
        uint256 indexed tokenId,
        uint256 value,
        uint256 locktime,
        uint8 depositType,
        uint256 ts
    );

    event AllowedManagerSet(address indexed account, address indexed manager);

    /// @notice Lock MEZO into a new veMEZO NFT
    /// @param _value Amount of MEZO to lock (in wei) — must equal msg.value
    /// @param _lockDuration Absolute Unix timestamp when lock expires
    /// @return tokenId The minted NFT id
    function createLock(uint256 _value, uint256 _lockDuration)
        external
        payable
        returns (uint256 tokenId)
    {
        require(msg.value == _value, "MockVeMEZO: msg.value must equal _value");
        require(_value > 0, "MockVeMEZO: zero value");
        require(_lockDuration > block.timestamp, "MockVeMEZO: unlock in past");
        require(
            _lockDuration <= block.timestamp + 4 * 365 * 24 * 60 * 60,
            "MockVeMEZO: unlock beyond 4y"
        );

        tokenId = nextTokenId++;
        ownerOf[tokenId] = msg.sender;
        _locked[tokenId] = LockedBalance({
            amount: int128(int256(_value)),
            end: _lockDuration
        });

        _ownedTokensIndex[tokenId] = _ownedTokens[msg.sender].length;
        _ownedTokens[msg.sender].push(tokenId);

        emit Deposit(msg.sender, tokenId, _value, _lockDuration, 0, block.timestamp);
    }

    /// @notice Set the allowed manager for the caller's positions
    function setAllowedManager(address _allowedManager) external {
        allowedManager[msg.sender] = _allowedManager;
        emit AllowedManagerSet(msg.sender, _allowedManager);
    }

    /// @notice Read locked balance struct
    function locked(uint256 _tokenId) external view returns (int128 amount, uint256 end) {
        LockedBalance memory lb = _locked[_tokenId];
        return (lb.amount, lb.end);
    }

    /// @notice Mock voting power — for hackathon, return amount as-is
    function balanceOfNFT(uint256 _tokenId) external view returns (uint256) {
        return uint256(uint128(_locked[_tokenId].amount));
    }

    /// @notice ERC-721 enumeration: count of NFTs owned by address
    function balanceOf(address owner) external view returns (uint256) {
        return _ownedTokens[owner].length;
    }

    /// @notice ERC-721 enumeration: nth tokenId owned by address
    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256)
    {
        require(index < _ownedTokens[owner].length, "MockVeMEZO: index out of bounds");
        return _ownedTokens[owner][index];
    }
}
