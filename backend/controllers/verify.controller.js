const { contract, isBlockchainAvailable } = require("../config/blockchain");
const generateHash = require("../utils/hash");
const fs = require("fs").promises;


const verifyDocument = async (req, res) => {
    try {
        const { documentData } = req.body;

        if (!documentData) {
            return res.status(400).json({ message: "No document data" });
        }

        const hash = generateHash(documentData);
        const bytes32Hash = "0x" + hash;

        // If blockchain is not configured, return a meaningful response
        if (!isBlockchainAvailable || !contract) {
            return res.json({
                verified: false,
                issuer: null,
                timestamp: null,
                hash,
                blockchainAvailable: false,
                message: "Blockchain verification is not configured on this server.",
            });
        }

        const result = await contract.verifyDocument(bytes32Hash);

        res.json({
            verified: result[0],
            issuer: result[1],
            timestamp: Number(result[2]),
            hash,
            blockchainAvailable: true,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        if (req.file?.path) {
            fs.unlink(req.file.path).catch(() => {});
        }
    }
};

module.exports = { verifyDocument };
