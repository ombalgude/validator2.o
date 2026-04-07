// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentVerification {

    address public owner;

    mapping(address => bool) public authorizedIssuers;

    struct Document {
        address issuer;
        uint256 timestamp;
    }

    mapping(bytes32 => Document) private documents;

    event IssuerAdded(address issuer);
    event IssuerRemoved(address issuer);
    event DocumentAdded(bytes32 hash, address issuer, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedIssuers[msg.sender], "Not authorized");
        _;
    }

    // Add university wallet
    function addIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
        emit IssuerAdded(_issuer);
    }

    // Remove university wallet
    function removeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = false;
        emit IssuerRemoved(_issuer);
    }

    // Store document hash
    function addDocument(bytes32 _hash) external onlyAuthorized {
        require(documents[_hash].timestamp == 0, "Document already exists");

        documents[_hash] = Document({
            issuer: msg.sender,
            timestamp: block.timestamp
        });

        emit DocumentAdded(_hash, msg.sender, block.timestamp);
    }

    // Verify document
    function verifyDocument(bytes32 _hash)
        external
        view
        returns (bool, address, uint256)
    {
        Document memory doc = documents[_hash];

        if (doc.timestamp == 0) {
            return (false, address(0), 0);
        }

        return (true, doc.issuer, doc.timestamp);
    }
}

