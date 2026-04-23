const contract = require("../config/blockchain");
const generateHash = require("../utils/hash");
const User = require("../models/User");

const addDocument = async (req, res) => {
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

        // Local file path instead of Cloudinary URL
        const fileUrl = file.path;

        const hash = generateHash(documentData);
        const bytes32Hash = "0x" + hash;

        // 1. Blockchain Transaction
        const tx = await contract.addDocument(bytes32Hash);
        await tx.wait();

        // 2. Update User in MongoDB
        const targetUser = await User.findById(user_id);
        if (targetUser) {
            targetUser.myDocuments.push(fileUrl);
            await targetUser.save({ validateBeforeSave: false });
        }

        // 3. Final Response
        res.json({
            success: true,
            hash,
            fileUrl,
            txHash: tx.hash,
            message: "Document successfully added to blockchain and user profile locally"
        });

    } catch (error) {
        console.error("Add Document Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const revokeDocument = async (req, res) => {
    try {
        const { hash } = req.body;

        if (!hash) {
            return res.status(400).json({ message: "No hash provided" });
        }

        const tx = await contract.revokeDocument(hash);
        await tx.wait();

        res.json({
            success: true,
            txHash: tx.hash
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    addDocument,
    revokeDocument
};