/**
 * AI Service
 * Handles communication with AI microservices
 */

const axios = require('axios');
const FormData = require('form-data');

const extractServiceErrorMessage = (error, fallbackMessage) => {
    const responseData = error?.response?.data;

    if (typeof responseData?.detail === 'string' && responseData.detail.trim()) {
        return responseData.detail;
    }

    if (Array.isArray(responseData?.detail) && responseData.detail.length > 0) {
        return responseData.detail
            .map((entry) => {
                if (typeof entry === 'string') {
                    return entry;
                }

                if (entry && typeof entry === 'object') {
                    const location = Array.isArray(entry.loc) ? entry.loc.join('.') : '';
                    const message = entry.msg || JSON.stringify(entry);
                    return location ? `${location}: ${message}` : message;
                }

                return String(entry);
            })
            .join('; ');
    }

    if (typeof responseData?.message === 'string' && responseData.message.trim()) {
        return responseData.message;
    }

    if (typeof responseData?.error === 'string' && responseData.error.trim()) {
        return responseData.error;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
        return error.message;
    }

    return fallbackMessage;
};

class AIService {
    constructor() {
        this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
        this.timeout = 30000; // 30 seconds timeout
    }

    createMultipartPayload(file, extraFields = {}) {
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        Object.entries(extraFields).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                formData.append(key, value);
            }
        });

        return formData;
    }

    async postMultipart(path, file, extraFields = {}) {
        const formData = this.createMultipartPayload(file, extraFields);
        const response = await axios.post(
            `${this.aiServiceUrl}${path}`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: this.timeout
            }
        );

        return response.data || {};
    }

    async processOcrPayload(payload) {
        try {
            const response = await axios.post(
                `${this.aiServiceUrl}/ai/process-ocr`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: this.timeout
                }
            );

            return {
                success: true,
                validation_results: response.data.validation_results || null,
                integration_requirements: response.data.integration_requirements || [],
                ledger_update: response.data.ledger_update || [],
            };
        } catch (error) {
            console.error('OCR orchestration error:', error);
            return {
                success: false,
                validation_results: null,
                integration_requirements: [],
                ledger_update: [],
                error: extractServiceErrorMessage(error, 'OCR orchestration failed')
            };
        }
    }

    /**
     * Extract text from document using OCR
     * @param {Object} file - Uploaded file
     * @returns {Promise<Object>} OCR results
     */
    async extractText(file, extraFields = {}) {
        try {
            const extracted = await this.postMultipart('/ai/ocr/extract', file, extraFields);
            const orchestration = extracted.validation_results
                ? {
                    success: true,
                    validation_results: extracted.validation_results,
                    integration_requirements: extracted.integration_requirements || [],
                    ledger_update: extracted.ledger_update || [],
                }
                : await this.processOcrPayload({
                    raw_text: extracted.text || '',
                    confidence: extracted.confidence || 0,
                });

            return {
                success: true,
                text: extracted.text || '',
                confidence: extracted.confidence || 0,
                language: extracted.language || 'en',
                processing_time: extracted.processing_time || 0,
                structured_data: extracted.structured_data || {},
                schema_validation: extracted.schema_validation || {},
                validation_results: orchestration.validation_results || null,
                integration_requirements: orchestration.integration_requirements || [],
                ledger_update: orchestration.ledger_update || [],
            };

        } catch (error) {
            console.error('OCR extraction error:', error);
            return {
                success: false,
                text: '',
                confidence: 0,
                error: extractServiceErrorMessage(error, 'OCR extraction failed')
            };
        }
    }

    /**
     * Detect image tampering
     * @param {Object} file - Uploaded file
     * @returns {Promise<Object>} Tampering detection results
     */
    async detectTampering(file) {
        try {
            const response = await this.postMultipart('/ai/verify/tampering', file);

            return {
                success: true,
                tampering_detected: response.tampering_detected || false,
                tampering_score: response.confidence_score || 0,
                analysis_details: response.analysis_details || {},
                recommendations: response.recommendations || []
            };

        } catch (error) {
            console.error('Tampering detection error:', error);
            return {
                success: false,
                tampering_detected: false,
                tampering_score: 0,
                error: extractServiceErrorMessage(error, 'Tampering detection failed')
            };
        }
    }

    /**
     * Match certificate template
     * @param {Object} file - Uploaded file
     * @param {string} templateId - Optional template ID
     * @returns {Promise<Object>} Template matching results
     */
    async matchTemplate(file, templateId = null) {
        try {
            const response = await this.postMultipart('/ai/verify/template', file, {
                template_id: templateId,
            });

            return {
                success: true,
                match_score: response.match_score || 0,
                template_id: response.template_id || null,
                matched_template: response.matched_template || null,
                confidence: response.confidence || 0
            };

        } catch (error) {
            console.error('Template matching error:', error);
            return {
                success: false,
                match_score: 0,
                error: extractServiceErrorMessage(error, 'Template matching failed')
            };
        }
    }

    /**
     * Detect anomalies in certificate
     * @param {Object} file - Uploaded file
     * @returns {Promise<Object>} Anomaly detection results
     */
    async detectAnomalies(file) {
        try {
            const response = await this.postMultipart('/ai/analyze/anomaly', file);

            return {
                success: true,
                anomaly_score: response.anomaly_score || 0,
                anomalies: response.anomalies || [],
                confidence: response.confidence || 0,
                analysis_details: response.analysis_details || {}
            };

        } catch (error) {
            console.error('Anomaly detection error:', error);
            return {
                success: false,
                anomaly_score: 0,
                anomalies: [],
                error: extractServiceErrorMessage(error, 'Anomaly detection failed')
            };
        }
    }

    /**
     * Complete verification process
     * @param {Object} file - Uploaded file
     * @returns {Promise<Object>} Complete verification results
     */
    async completeVerification(file, extraFields = {}) {
        try {
            const response = await this.postMultipart('/ai/verify/complete', file, extraFields);

            return {
                success: true,
                verification_status: response.verification_status || 'pending',
                confidence_score: response.confidence_score || 0,
                ocr_results: response.ocr_results || {},
                tampering_results: response.tampering_results || {},
                template_results: response.template_results || {},
                anomaly_results: response.anomaly_results || {},
                orchestration_results: response.orchestration_results || null,
                recommendations: response.recommendations || [],
                processing_time: response.processing_time || 0
            };

        } catch (error) {
            console.error('Complete verification error:', error);
            return {
                success: false,
                verification_status: 'error',
                confidence_score: 0,
                error: extractServiceErrorMessage(error, 'Complete verification failed')
            };
        }
    }

    /**
     * Check AI service health
     * @returns {Promise<Object>} Health status
     */
    async checkHealth() {
        try {
            const response = await axios.get(
                `${this.aiServiceUrl}/health`,
                { timeout: 5000 }
            );

            return {
                success: true,
                status: response.data.status || 'healthy',
                service: response.data.service || 'unknown',
                uptime_seconds: response.data.uptime_seconds || 0,
                response_time: response.data.response_time || 0,
                version: response.data.version || 'unknown'
            };

        } catch (error) {
            console.error('AI service health check failed:', error);
            return {
                success: false,
                status: 'unhealthy',
                error: extractServiceErrorMessage(error, 'AI service health check failed')
            };
        }
    }

    /**
     * Get AI service statistics
     * @returns {Promise<Object>} Service statistics
     */
    async getStatistics() {
        try {
            const response = await axios.get(
                `${this.aiServiceUrl}/stats`,
                { timeout: 5000 }
            );

            return {
                success: true,
                uptime_seconds: response.data.uptime_seconds || 0,
                statistics: response.data.statistics || response.data || {}
            };

        } catch (error) {
            console.error('Failed to get AI service statistics:', error);
            return {
                success: false,
                statistics: {},
                error: extractServiceErrorMessage(error, 'Failed to get AI service statistics')
            };
        }
    }

    /**
     * Process batch of files
     * @param {Array} files - Array of files to process
     * @param {string} operation - Operation type (ocr, tampering, template, anomaly)
     * @returns {Promise<Array>} Batch processing results
     */
    async processBatch(files, operation) {
        try {
            const results = [];
            const errors = [];

            for (let i = 0; i < files.length; i++) {
                try {
                    const file = files[i];
                    let result;

                    switch (operation) {
                        case 'ocr':
                            result = await this.extractText(file);
                            break;
                        case 'tampering':
                            result = await this.detectTampering(file);
                            break;
                        case 'template':
                            result = await this.matchTemplate(file);
                            break;
                        case 'anomaly':
                            result = await this.detectAnomalies(file);
                            break;
                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }

                    results.push({
                        fileName: file.originalname,
                        result
                    });

                } catch (error) {
                    errors.push({
                        fileName: files[i].originalname,
                        error: extractServiceErrorMessage(error, 'Batch operation failed')
                    });
                }
            }

            return {
                success: true,
                processed: results.length,
                errors: errors.length,
                results,
                errors
            };

        } catch (error) {
            console.error('Batch processing error:', error);
            return {
                success: false,
                processed: 0,
                errors: files.length,
                results: [],
                errors: [{ error: extractServiceErrorMessage(error, 'Batch processing failed') }]
            };
        }
    }
}

module.exports = AIService;


