const contract = require("../config/blockchain");
const generateHash = require("../utils/hash");

exports.addDocument = async (req, res) => {
    try {
        const { documentData } = req.body;

        if (!documentData) {
            return res.status(400).json({ message: "No document data" });
        }

        const hash = generateHash(documentData);
        const bytes32Hash = "0x" + hash;

        const tx = await contract.addDocument(bytes32Hash);
        await tx.wait();

        res.json({
            success: true,
            hash,
            txHash: tx.hash
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};