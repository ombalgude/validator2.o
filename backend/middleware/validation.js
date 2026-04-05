const { body, validationResult } = require('express-validator');
const { normalizeCertificateInput } = require('../utils/certificatePayload');

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

const certificateContentValidationRules = [
  body('certificateId')
    .notEmpty()
    .trim()
    .withMessage('Certificate ID is required'),
  body('student.name')
    .notEmpty()
    .trim()
    .withMessage('Student name is required'),
  body('student.seatNo')
    .notEmpty()
    .trim()
    .withMessage('Seat number is required'),
  body('college.code')
    .notEmpty()
    .trim()
    .withMessage('College code is required'),
  body('college.name')
    .notEmpty()
    .trim()
    .withMessage('College name is required'),
  body('exam.course')
    .notEmpty()
    .trim()
    .withMessage('Course is required'),
  body('exam.session')
    .notEmpty()
    .trim()
    .withMessage('Exam session is required'),
  body('exam.year')
    .notEmpty()
    .trim()
    .withMessage('Exam year is required'),
  body('issue.date')
    .custom((value) => !Number.isNaN(new Date(value).getTime()))
    .withMessage('Please provide a valid issue date'),
  body('subjects')
    .isArray({ min: 1 })
    .withMessage('At least one subject is required'),
];

const buildNormalizedCertificateBody = (body) => ({
  ...body,
  ...normalizeCertificateInput(body),
});

const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
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
    .notEmpty()
    .trim()
    .matches(/^[A-Z0-9_-]{2,20}$/)
    .withMessage('Institution code must be 2-20 uppercase letters, numbers, underscores, or dashes'),
  body('establishedYear')
    .optional({ values: 'falsy' })
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Please provide a valid establishment year'),
  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid contact email'),
  handleValidationErrors
];

const normalizeCertificateRequest = (req, _res, next) => {
  req.body = buildNormalizedCertificateBody(req.body);

  if (!req.body.institutionId && req.user?.institutionId) {
    req.body.institutionId = String(req.user.institutionId);
  }

  next();
};

const normalizeCertificateComparisonRequest = (req, _res, next) => {
  req.body = buildNormalizedCertificateBody(req.body);

  next();
};

const validateCertificate = [
  ...certificateContentValidationRules,
  body('institutionId')
    .isMongoId()
    .withMessage('Please provide a valid institution ID'),
  handleValidationErrors
];

const validateCertificateComparison = [
  ...certificateContentValidationRules,
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateInstitution,
  normalizeCertificateRequest,
  normalizeCertificateComparisonRequest,
  validateCertificate,
  validateCertificateComparison
};

