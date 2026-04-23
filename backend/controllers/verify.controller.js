const contract = require("../config/blockchain");
const generateHash = require("../utils/hash");


const verifyDocument = async (req, res) => {
    try {
        const { documentData } = req.body;
        const file = req.file;

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
            hash,
            fileUrl: file ? file.path : null
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
<<<<<<< HEAD



module.exports = {
    verifyDocument
};
=======
>>>>>>> 95f0fbbcfbc1d1dbca177a972cbcd8e93cc1f4fe
