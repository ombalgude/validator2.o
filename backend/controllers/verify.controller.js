const { contract, isBlockchainAvailable } = require("../config/blockchain");
const generateHash = require("../utils/hash");
const fs = require("fs").promises;
const AIService = require("../services/ai_service");
const CertificateService = require("../services/certificate_service");
const {
    buildCertificateDataFromAiResult,
    getMissingComparisonFields,
    mergeCandidateCertificateData,
} = require("../utils/certificateAiMapping");

const aiService = new AIService();
const certificateService = new CertificateService();

const verifyDocument = async (req, res) => {
    try {
        if (req.file) {
            const fileBuffer = req.file.buffer || await fs.readFile(req.file.path);
            const aiResult = await aiService.extractText(
                { ...req.file, buffer: fileBuffer },
                { document_type: "certificate" }
            );

            if (!aiResult.success) {
                return res.status(502).json({
                    success: false,
                    message: aiResult.error || "AI service could not extract certificate details.",
                });
            }

            const mappedResult = await buildCertificateDataFromAiResult({
                aiResult,
                fileBuffer,
            });
            const candidateInput = mergeCandidateCertificateData(mappedResult.certificateData, req.body);
            const missingFields = getMissingComparisonFields(candidateInput);

            if (missingFields.length > 0) {
                return res.status(422).json({
                    success: false,
                    isValid: false,
                    verificationStatus: "suspicious",
                    message: `Warning : This is falty certificate`,
                    missingRequiredFields: missingFields,
                    extractedCertificate: mappedResult.certificateData,
                    aiExtraction: {
                        confidence: aiResult.confidence || 0,
                        processingTime: aiResult.processing_time || 0,
                        missingRequiredFields: missingFields,
                        warnings: mappedResult.warnings,
                    },
                });
            }

            const verification = await certificateService.verifyPublicCandidateCertificate(
                candidateInput,
                { ...req.file, buffer: fileBuffer }
            );

            return res.json({
                ...verification,
                extractedCertificate: candidateInput,
                aiExtraction: {
                    confidence: aiResult.confidence || 0,
                    processingTime: aiResult.processing_time || 0,
                    missingRequiredFields: missingFields,
                    warnings: mappedResult.warnings,
                },
            });
        }

        const { documentData } = req.body;

        if (!documentData) {
            return res.status(400).json({ message: "Please upload a certificate file." });
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
