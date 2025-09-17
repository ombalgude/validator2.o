const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 3 })
    .withMessage('Password must be at least 3 characters long'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateInstitution = [
  body('name')
    .notEmpty()
    .trim()
    .withMessage('Institution name is required'),
  body('code')
    .isLength({ min: 2, max: 10 })
    .isUppercase()
    .withMessage('Institution code must be 2-10 uppercase characters'),
  body('establishedYear')
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Please provide a valid establishment year'),
  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid contact email'),
  handleValidationErrors
];

const validateCertificate = [
  body('studentName')
    .notEmpty()
    .trim()
    .withMessage('Student name is required'),
  body('rollNumber')
    .notEmpty()
    .trim()
    .withMessage('Roll number is required'),
  body('course')
    .notEmpty()
    .trim()
    .withMessage('Course is required'),
  body('degree')
    .notEmpty()
    .trim()
    .withMessage('Degree is required'),
  body('issueDate')
    .isISO8601()
    .withMessage('Please provide a valid issue date'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateInstitution,
  validateCertificate
};

