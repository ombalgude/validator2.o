/**
 * Shared Types and Constants
 * Common types and constants used across the application
 */

// User Roles
const USER_ROLES = {
    ADMIN: 'admin',
    INSTITUTION: 'institution',
    VERIFIER: 'verifier'
};

// Verification Status
const VERIFICATION_STATUS = {
    VERIFIED: 'verified',
    SUSPICIOUS: 'suspicious',
    FAKE: 'fake',
    PENDING: 'pending'
};

// File Types
const FILE_TYPES = {
    PDF: 'application/pdf',
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    TIFF: 'image/tiff'
};

// API Response Status
const API_STATUS = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning'
};

// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};

// Notification Types
const NOTIFICATION_TYPES = {
    VERIFICATION_COMPLETE: 'verification_complete',
    STATUS_UPDATE: 'status_update',
    ALERT: 'alert',
    DASHBOARD_UPDATE: 'dashboard_update',
    SYSTEM_NOTIFICATION: 'system_notification'
};

// AI Service Endpoints
const AI_ENDPOINTS = {
    OCR_EXTRACT: '/ai/ocr/extract',
    DETECT_TAMPERING: '/ai/verify/tampering',
    MATCH_TEMPLATE: '/ai/verify/template',
    DETECT_ANOMALY: '/ai/analyze/anomaly',
    COMPLETE_VERIFICATION: '/ai/verify/complete'
};

// Validation Rules
const VALIDATION_RULES = {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    EMAIL_MAX_LENGTH: 255,
    NAME_MAX_LENGTH: 100,
    ROLL_NUMBER_MAX_LENGTH: 50,
    COURSE_MAX_LENGTH: 200,
    INSTITUTION_NAME_MAX_LENGTH: 200,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.tiff']
};

// Database Collections
const COLLECTIONS = {
    USERS: 'users',
    INSTITUTIONS: 'institutions',
    CERTIFICATES: 'certificates',
    VERIFICATION_LOGS: 'verificationlogs'
};

// Error Messages
const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCESS_DENIED: 'Access denied',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    INTERNAL_ERROR: 'Internal server error',
    FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
    INVALID_FILE_TYPE: 'Invalid file type',
    DUPLICATE_ENTRY: 'Entry already exists',
    UNAUTHORIZED: 'Unauthorized access'
};

// Success Messages
const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTRATION_SUCCESS: 'Registration successful',
    UPLOAD_SUCCESS: 'File uploaded successfully',
    VERIFICATION_SUCCESS: 'Verification completed successfully',
    UPDATE_SUCCESS: 'Update successful',
    DELETE_SUCCESS: 'Delete successful'
};

module.exports = {
    USER_ROLES,
    VERIFICATION_STATUS,
    FILE_TYPES,
    API_STATUS,
    HTTP_STATUS,
    NOTIFICATION_TYPES,
    AI_ENDPOINTS,
    VALIDATION_RULES,
    COLLECTIONS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
};

