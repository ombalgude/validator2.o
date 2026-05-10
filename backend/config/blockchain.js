const { ethers } = require("ethers");
require("dotenv").config();

/**
 * Blockchain configuration.
 *
 * Set BLOCKCHAIN_ENABLED=true in .env and supply RPC_URL, PRIVATE_KEY, and
 * CONTRACT_ADDRESS to activate on-chain recording. METAMASK_PRIVATE_KEY is
 * accepted as a local-development alias for PRIVATE_KEY. When those variables are
 * absent or BLOCKCHAIN_ENABLED is falsy, contract is null and
 * isBlockchainAvailable is false - callers can check the flag and skip gracefully.
 *
 * Usage:
 *   const { contract, isBlockchainAvailable } = require('../config/blockchain');
 */

const getEnv = (name) => String(process.env[name] || "").trim();
const normalizePrivateKey = (value) => {
  if (/^[a-fA-F0-9]{64}$/.test(value)) {
    return `0x${value}`;
  }

  return value;
};

const BLOCKCHAIN_ENABLED =
  getEnv("BLOCKCHAIN_ENABLED").toLowerCase() === "true";

const RPC_URL = getEnv("RPC_URL");
const PRIVATE_KEY = normalizePrivateKey(
  getEnv("PRIVATE_KEY") || getEnv("METAMASK_PRIVATE_KEY")
);
const CONTRACT_ADDRESS = getEnv("CONTRACT_ADDRESS");

const missingConfig = [
  ["RPC_URL", RPC_URL],
  ["PRIVATE_KEY or METAMASK_PRIVATE_KEY", PRIVATE_KEY],
  ["CONTRACT_ADDRESS", CONTRACT_ADDRESS],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

let isBlockchainAvailable =
  BLOCKCHAIN_ENABLED && missingConfig.length === 0;

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
    isBlockchainAvailable = false;
    contract = null;
    console.warn("Blockchain: failed to connect -", error.message);
  }
} else if (BLOCKCHAIN_ENABLED) {
  console.warn(
    `Blockchain: enabled but missing ${missingConfig.join(", ")}. ` +
      "Set these values in backend/.env to enable on-chain recording."
  );
} else {
  console.log(
    "Blockchain: disabled (set BLOCKCHAIN_ENABLED=true with RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS to enable)"
  );
}

module.exports = { contract, isBlockchainAvailable };
