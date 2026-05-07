const { contract, isBlockchainAvailable } = require("../config/blockchain");
const generateHash = require("../utils/hash");
const User = require("../models/User");
const fs = require("fs").promises;

const addDocument = async (req, res) => {
    let storedFileForUser = false;

    try {
        const { documentData, user_id } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        if (!documentData) {
            return res.status(400).json({ message: "No document data" });
        }

        if (!user_id) {
            return res.status(400).json({ message: "No target user_id provided" });
        }

        const hash = generateHash(documentData);
        const bytes32Hash = "0x" + hash;
        const targetUser = await User.findById(user_id);

        if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
        }

        let txHash = null;

        // 1. Blockchain Transaction (only if blockchain is configured)
        if (isBlockchainAvailable && contract) {
            const tx = await contract.addDocument(bytes32Hash);
            await tx.wait();
            txHash = tx.hash;
        }

        // 2. Update User in MongoDB
        targetUser.myDocuments.push(file.path);
        await targetUser.save({ validateBeforeSave: false });
        storedFileForUser = true;

        // 3. Final Response
        res.json({
            success: true,
            hash,
            txHash,
            documentStored: true,
            blockchainRecorded: isBlockchainAvailable && txHash !== null,
            message: isBlockchainAvailable
                ? "Document successfully added to blockchain and user profile"
                : "Document added to user profile (blockchain not configured)",
        });

    } catch (error) {
        console.error("Add Document Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (req.file?.path && !storedFileForUser) {
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
