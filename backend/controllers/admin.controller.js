const fs = require("fs");
const generateHash = require("../utils/hash");
const { contract, isBlockchainAvailable } = require("../config/blockchain");

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
            fs.promises.unlink(req.file.path).catch(() => {});
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
