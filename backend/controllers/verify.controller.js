const contract = require("../config/blockchain");
const generateHash = require("../utils/hash");

exports.verifyDocument = async (req, res) => {
    try {
        const { documentData } = req.body;

        if (!documentData) {
            return res.status(400).json({ message: "No document data" });
        }

        const hash = generateHash(documentData);
        const bytes32Hash = "0x" + hash;

        const result = await contract.verifyDocument(bytes32Hash);

        res.json({
            verified: result[0],
            issuer: result[1],
            timestamp: Number(result[2]),
            hash
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};