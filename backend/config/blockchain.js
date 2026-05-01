const { ethers } = require("ethers");
require("dotenv").config();

/**
 * Blockchain configuration.
 *
 * Set BLOCKCHAIN_ENABLED=true in .env and supply RPC_URL, PRIVATE_KEY, and
 * CONTRACT_ADDRESS to activate on-chain recording.  When those variables are
 * absent or BLOCKCHAIN_ENABLED is falsy, contract is null and
 * isBlockchainAvailable is false — callers can check the flag and skip gracefully.
 *
 * Usage:
 *   const { contract, isBlockchainAvailable } = require('../config/blockchain');
 */

const BLOCKCHAIN_ENABLED =
  String(process.env.BLOCKCHAIN_ENABLED || "false").trim().toLowerCase() === "true";

const RPC_URL = process.env.RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

const isBlockchainAvailable =
  BLOCKCHAIN_ENABLED && Boolean(RPC_URL && PRIVATE_KEY && CONTRACT_ADDRESS);

let contract = null;

if (isBlockchainAvailable) {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const abi = [
      "function addDocument(bytes32 _hash)",
      "function revokeDocument(bytes32 _hash)",
      "function verifyDocument(bytes32 _hash) view returns (bool, address, uint256)",
    ];

    contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    console.log("Blockchain: contract connected at", CONTRACT_ADDRESS);
  } catch (error) {
    console.warn("Blockchain: failed to connect —", error.message);
  }
} else {
  console.log(
    "Blockchain: disabled (set BLOCKCHAIN_ENABLED=true with RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS to enable)"
  );
}

module.exports = { contract, isBlockchainAvailable };
