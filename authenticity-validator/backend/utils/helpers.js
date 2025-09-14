/**
 * Helper Utilities
 * Common helper functions used throughout the application
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @param {number} length - Length of the random part
 * @returns {string} Unique ID
 */
function generateId(prefix = '', length = 8) {
    const random = crypto.randomBytes(length).toString('hex');
    return prefix ? `${prefix}_${random}` : random;
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {string} format - Format string
 * @returns {string} Formatted date
 */
function formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    switch (format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD HH:mm:ss':
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        case 'DD/MM/YYYY HH:mm':
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        default:
            return d.toISOString();
    }
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize input string
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized input
 */
function sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') return input;

    let sanitized = input.trim();

    // Remove HTML tags
    if (options.removeHtml) {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove special characters
    if (options.removeSpecialChars) {
        sanitized = sanitized.replace(/[^\w\s\-.,]/g, '');
    }

    // Limit length
    if (options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
    }

    // Convert to lowercase
    if (options.toLowerCase) {
        sanitized = sanitized.toLowerCase();
    }

    return sanitized;
}

/**
 * Generate random string
 * @param {number} length - Length of the string
 * @param {string} charset - Character set to use
 * @returns {string} Random string
 */
function generateRandomString(length = 10, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone(obj[key]);
        });
        return cloned;
    }
}

/**
 * Check if value is empty
 * @param {any} value - Value to check
 * @returns {boolean} Is empty
 */
function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Convert bytes to human readable format
 * @param {number} bytes - Bytes to convert
 * @param {number} decimals - Number of decimal places
 * @returns {string} Human readable size
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calculate time difference
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Object} Time difference object
 */
function timeDifference(start, end = new Date()) {
    const diff = end.getTime() - start.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    return {
        milliseconds: diff,
        seconds,
        minutes,
        hours,
        days,
        weeks,
        months,
        years
    };
}

/**
 * Format time difference for display
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {string} Formatted time difference
 */
function formatTimeDifference(start, end = new Date()) {
    const diff = timeDifference(start, end);
    
    if (diff.years > 0) return `${diff.years} year${diff.years > 1 ? 's' : ''} ago`;
    if (diff.months > 0) return `${diff.months} month${diff.months > 1 ? 's' : ''} ago`;
    if (diff.weeks > 0) return `${diff.weeks} week${diff.weeks > 1 ? 's' : ''} ago`;
    if (diff.days > 0) return `${diff.days} day${diff.days > 1 ? 's' : ''} ago`;
    if (diff.hours > 0) return `${diff.hours} hour${diff.hours > 1 ? 's' : ''} ago`;
    if (diff.minutes > 0) return `${diff.minutes} minute${diff.minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePassword(password) {
    const result = {
        isValid: true,
        errors: [],
        score: 0
    };

    if (!password) {
        result.isValid = false;
        result.errors.push('Password is required');
        return result;
    }

    if (password.length < 8) {
        result.isValid = false;
        result.errors.push('Password must be at least 8 characters long');
    } else {
        result.score += 1;
    }

    if (!/[a-z]/.test(password)) {
        result.errors.push('Password must contain at least one lowercase letter');
    } else {
        result.score += 1;
    }

    if (!/[A-Z]/.test(password)) {
        result.errors.push('Password must contain at least one uppercase letter');
    } else {
        result.score += 1;
    }

    if (!/[0-9]/.test(password)) {
        result.errors.push('Password must contain at least one number');
    } else {
        result.score += 1;
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
        result.errors.push('Password must contain at least one special character');
    } else {
        result.score += 1;
    }

    if (result.errors.length === 0) {
        result.isValid = true;
    }

    return result;
}

/**
 * Generate pagination info
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Pagination info
 */
function generatePagination(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
    };
}

/**
 * Create error object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {any} details - Additional error details
 * @returns {Object} Error object
 */
function createError(message, statusCode = 500, details = null) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Promise that resolves with function result
 */
async function retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (i === maxRetries) {
                throw lastError;
            }
            
            const delay = baseDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }
}

module.exports = {
    generateId,
    formatDate,
    validateEmail,
    sanitizeInput,
    generateRandomString,
    deepClone,
    isEmpty,
    formatBytes,
    timeDifference,
    formatTimeDifference,
    validatePassword,
    generatePagination,
    createError,
    sleep,
    retry
};

