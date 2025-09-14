/**
 * AI Service
 * Handles communication with AI microservices
 */

const axios = require('axios');
const FormData = require('form-data');

class AIService {
    constructor() {
        this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
        this.timeout = 30000; // 30 seconds timeout
    }

    /**
     * Extract text from document using OCR
     * @param {Object} file - Uploaded file
     * @returns {Promise<Object>} OCR results
     */
    async extractText(file) {
        try {
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });

            const response = await axios.post(
                `${this.aiServiceUrl}/ai/ocr/extract`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: this.timeout
                }
            );

            return {
                success: true,
                text: response.data.text || '',
                confidence: response.data.confidence || 0,
                language: response.data.language || 'en',
                processing_time: response.data.processing_time || 0
            };

        } catch (error) {
            console.error('OCR extraction error:', error);
            return {
                success: false,
                text: '',
                confidence: 0,
                error: error.message
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
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });

            const response = await axios.post(
                `${this.aiServiceUrl}/ai/verify/tampering`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: this.timeout
                }
            );

            return {
                success: true,
                tampering_detected: response.data.tampering_detected || false,
                tampering_score: response.data.confidence_score || 0,
                analysis_details: response.data.analysis_details || {},
                recommendations: response.data.recommendations || []
            };

        } catch (error) {
            console.error('Tampering detection error:', error);
            return {
                success: false,
                tampering_detected: false,
                tampering_score: 0,
                error: error.message
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
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });

            if (templateId) {
                formData.append('template_id', templateId);
            }

            const response = await axios.post(
                `${this.aiServiceUrl}/ai/verify/template`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: this.timeout
                }
            );

            return {
                success: true,
                match_score: response.data.match_score || 0,
                template_id: response.data.template_id || null,
                matched_template: response.data.matched_template || null,
                confidence: response.data.confidence || 0
            };

        } catch (error) {
            console.error('Template matching error:', error);
            return {
                success: false,
                match_score: 0,
                error: error.message
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
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });

            const response = await axios.post(
                `${this.aiServiceUrl}/ai/analyze/anomaly`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: this.timeout
                }
            );

            return {
                success: true,
                anomaly_score: response.data.anomaly_score || 0,
                anomalies: response.data.anomalies || [],
                confidence: response.data.confidence || 0,
                analysis_details: response.data.analysis_details || {}
            };

        } catch (error) {
            console.error('Anomaly detection error:', error);
            return {
                success: false,
                anomaly_score: 0,
                anomalies: [],
                error: error.message
            };
        }
    }

    /**
     * Complete verification process
     * @param {Object} file - Uploaded file
     * @returns {Promise<Object>} Complete verification results
     */
    async completeVerification(file) {
        try {
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });

            const response = await axios.post(
                `${this.aiServiceUrl}/ai/verify/complete`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: this.timeout
                }
            );

            return {
                success: true,
                verification_status: response.data.verification_status || 'pending',
                confidence_score: response.data.confidence_score || 0,
                ocr_results: response.data.ocr_results || {},
                tampering_results: response.data.tampering_results || {},
                template_results: response.data.template_results || {},
                anomaly_results: response.data.anomaly_results || {},
                recommendations: response.data.recommendations || [],
                processing_time: response.data.processing_time || 0
            };

        } catch (error) {
            console.error('Complete verification error:', error);
            return {
                success: false,
                verification_status: 'error',
                confidence_score: 0,
                error: error.message
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
                status: 'healthy',
                response_time: response.data.response_time || 0,
                version: response.data.version || 'unknown'
            };

        } catch (error) {
            console.error('AI service health check failed:', error);
            return {
                success: false,
                status: 'unhealthy',
                error: error.message
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
                statistics: response.data || {}
            };

        } catch (error) {
            console.error('Failed to get AI service statistics:', error);
            return {
                success: false,
                statistics: {},
                error: error.message
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
                        error: error.message
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
                errors: [{ error: error.message }]
            };
        }
    }
}

module.exports = AIService;


