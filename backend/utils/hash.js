const crypto = require("crypto");

const OMIT_VALUE = Symbol("omit_value");

function normalizeForHash(value) {
    if (value === null || value === undefined) {
        return OMIT_VALUE;
    }

    if (Buffer.isBuffer(value)) {
        return value.toString("utf8").trim().toLowerCase();
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value
            .map(normalizeForHash)
            .filter((entry) => entry !== OMIT_VALUE);
    }

    if (typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((accumulator, key) => {
                const normalizedValue = normalizeForHash(value[key]);

                if (normalizedValue !== OMIT_VALUE) {
                    accumulator[key] = normalizedValue;
                }

                return accumulator;
            }, {});
    }

    if (typeof value === "string") {
        return value.trim().toLowerCase();
    }

    return value;
}

function serializeForHash(data) {
    const normalized = normalizeForHash(data);

    if (normalized === OMIT_VALUE) {
        return "";
    }

    return typeof normalized === "string"
        ? normalized
        : JSON.stringify(normalized);
}

function generateHash(data) {
    return crypto
        .createHash("sha256")
        .update(serializeForHash(data))
        .digest("hex");
}

module.exports = generateHash;
