const { contract, isBlockchainAvailable } = require("../config/blockchain");
const generateHash = require("../utils/hash");
const fs = require("fs").promises;
const Certificate = require('../models/Certificate');
const VerificationLog = require('../models/VerificationLog');
const AIService = require('../services/ai_service');
const { Contract } = require('web3');
const notificationService = require('./notification_instance');
const {
  computeCertificateHash,
  deriveCertificateSearchFields,
  normalizeCertificateInput,
} = require('../utils/certificatePayload');
const { buildInstitutionScopedFilter, canUserAccessInstitution } = require('../utils/institutionScope');
const { contract: blockchainContract, isBlockchainAvailable } = require('../config/blockchain');
const dotenv = require('dotenv');

dotenv.config();

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load contract ABI and address
const contractAbi = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../backend/blockchain/abi.json"), "utf8")
);
const contractAddress = process.env.CONTRACT_ADDRESS;

if (!contractAddress || !contractAbi) {
    console.error("❌ Smart contract configuration is missing.");
    console.error("   Please verify CONTRACT_ADDRESS in .env and ABI in abi.json.");
}

// Set up provider and contract
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://sepolia-rpc.publicnode.com");
const signer = new ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractAbi, signer);


const addDocument = async (req, res) => {
    try {
        const { documentData } = req.body;

        if (!documentData) {
            return res.status(400).json({ message: "No document data" });
        }

        const hash = generateHash(documentData);
        const bytes32Hash = "0x" + hash;
        let txHash = null;


        if (isBlockchainAvailable && contract) {
            console.log("Adding document to blockchain...");
            const tx = await contract.addDocument(bytes32Hash);

            await tx.wait();

            txHash = tx.hash;

            console.log("Transaction successful:", txHash);
        }

        

        res.json({
            success: true,
            hash,
            txHash,
            blockchainRecorded: isBlockchainAvailable && txHash !== null,
            message: isBlockchainAvailable
                ? "Document successfully added to blockchain"
                : "Document hash generated (blockchain not configured)",
        });

    } catch (error) {
        console.error("Add Document Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (req.file?.path) {
            fs.unlink(req.file.path).catch(() => {});
        }
    }
};

const revokeDocument = async (req, res) => {
    try {
        const { hash } = req.body;

        if (!hash) {
            return res.status(400).json({ message: "No hash provided" });
        }

        if (!isBlockchainAvailable || !contract) {
            return res.status(503).json({
                message: "Blockchain is not configured on this server. Set BLOCKCHAIN_ENABLED=true with RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS.",
            });
        }

        const tx = await contract.revokeDocument(hash);
        await tx.wait();

        res.json({
            success: true,
            txHash: tx.hash,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { addDocument, revokeDocument };
