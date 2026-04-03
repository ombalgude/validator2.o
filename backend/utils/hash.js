const crypto = require("crypto");

// normalize + hash
function generateHash(data) {
    const normalized = data.trim().toLowerCase();
    
    return crypto
        .createHash("sha256")
        .update(normalized)
        .digest("hex");
}

module.exports = generateHash;