const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Admin wallet (university)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;

const abi = [
  "function addDocument(bytes32 _hash)",
  "function verifyDocument(bytes32 _hash) view returns (bool, address, uint256)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

module.exports = contract;