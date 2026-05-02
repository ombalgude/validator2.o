const express = require('express');
const {
  approveUniversityAdminRequest,
  listUniversityAdminRequests,
  rejectUniversityAdminRequest,
} = require('../controllers/universityAdminRequests.controller');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, authorize('admin'), listUniversityAdminRequests);
router.put('/:id/approve', auth, authorize('admin'), approveUniversityAdminRequest);
router.put('/:id/reject', auth, authorize('admin'), rejectUniversityAdminRequest);

module.exports = router;
