const crypto = require('crypto');
const path = require('path');

/**
 * Generate a unique certificate ID
 * @returns {string} Unique certificate ID
 */
const generateCertificateId = () => {
  return `CERT_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

/**
 * Generate SHA-256 hash of file content
 * @param {Buffer} fileBuffer - File buffer
 * @returns {string} SHA-256 hash
 */
const generateFileHash = (fileBuffer) => {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate random verification code
 * @param {number} length - Length of code
 * @returns {string} Random verification code
 */
const generateVerificationCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate verification confidence score
 * @param {Object} results - Verification results
 * @returns {number} Confidence score (0-100)
 */
const calculateConfidenceScore = (results) => {
  const { ocrConfidence = 0, tamperScore = 0, databaseMatch = false, anomalyScore = 0 } = results;
  
  let score = 0;
  
  // OCR confidence (40% weight)
  score += (ocrConfidence / 100) * 40;
  
  // Tamper score (30% weight) - lower is better
  score += ((100 - tamperScore) / 100) * 30;
  
  // Database match (20% weight)
  score += databaseMatch ? 20 : 0;
  
  // Anomaly score (10% weight) - lower is better
  score += ((100 - anomalyScore) / 100) * 10;
  
  return Math.round(Math.max(0, Math.min(100, score)));
};

/**
 * Sanitize filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

/**
 * Check if file type is supported
 * @param {string} filename - Filename
 * @returns {boolean} Is supported file type
 */
const isSupportedFileType = (filename) => {
  const supportedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif'];
  const extension = getFileExtension(filename);
  return supportedTypes.includes(extension);
};

/**
 * Generate institution code
 * @param {string} name - Institution name
 * @returns {string} Institution code
 */
const generateInstitutionCode = (name) => {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 6);
};

/**
 * Format error message for API response
 * @param {Error} error - Error object
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (error) => {
  return {
    success: false,
    message: error.message || 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
};

/**
 * Format success response for API
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Formatted success response
 */
const formatSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Pagination metadata
 */
const generatePaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  generateCertificateId,
  generateFileHash,
  isValidEmail,
  generateVerificationCode,
  formatDate,
  calculateConfidenceScore,
  sanitizeFilename,
  getFileExtension,
  isSupportedFileType,
  generateInstitutionCode,
  formatErrorResponse,
  formatSuccessResponse,
  generatePaginationMeta
};
