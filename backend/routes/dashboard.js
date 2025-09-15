const express = require('express');
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const VerificationLog = require('../models/VerificationLog');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const [
      totalCertificates,
      verifiedCertificates,
      suspiciousCertificates,
      fakeCertificates,
      pendingCertificates,
      totalInstitutions,
      verifiedInstitutions,
      recentVerifications,
      monthlyStats
    ] = await Promise.all([
      Certificate.countDocuments(),
      Certificate.countDocuments({ verificationStatus: 'verified' }),
      Certificate.countDocuments({ verificationStatus: 'suspicious' }),
      Certificate.countDocuments({ verificationStatus: 'fake' }),
      Certificate.countDocuments({ verificationStatus: 'pending' }),
      Institution.countDocuments(),
      Institution.countDocuments({ isVerified: true }),
      VerificationLog.find()
        .populate('certificateId', 'studentName verificationStatus')
        .populate('verifiedBy', 'email')
        .sort({ timestamp: -1 })
        .limit(10),
      getMonthlyStats()
    ]);

    const verificationRate = totalCertificates > 0 ? 
      ((verifiedCertificates / totalCertificates) * 100).toFixed(2) : 0;

    const fraudRate = totalCertificates > 0 ? 
      (((suspiciousCertificates + fakeCertificates) / totalCertificates) * 100).toFixed(2) : 0;

    res.json({
      overview: {
        totalCertificates,
        verifiedCertificates,
        suspiciousCertificates,
        fakeCertificates,
        pendingCertificates,
        totalInstitutions,
        verifiedInstitutions,
        verificationRate: parseFloat(verificationRate),
        fraudRate: parseFloat(fraudRate)
      },
      recentVerifications,
      monthlyStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/trends
// @desc    Get fraud trends and analytics
// @access  Private (Admin)
router.get('/trends', auth, authorize('admin'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await Certificate.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$verificationStatus'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    const institutionStats = await Certificate.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$institutionId',
          total: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] }
          },
          suspicious: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'suspicious'] }, 1, 0] }
          },
          fake: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'fake'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'institutions',
          localField: '_id',
          foreignField: '_id',
          as: 'institution'
        }
      },
      {
        $unwind: '$institution'
      },
      {
        $project: {
          institutionName: '$institution.name',
          institutionCode: '$institution.code',
          total: 1,
          verified: 1,
          suspicious: 1,
          fake: 1,
          verificationRate: {
            $multiply: [
              { $divide: ['$verified', '$total'] },
              100
            ]
          }
        }
      },
      {
        $sort: { total: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      trends,
      institutionStats
    });
  } catch (error) {
    console.error('Dashboard trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/alerts
// @desc    Get recent alerts and suspicious activities
// @access  Private (Admin)
router.get('/alerts', auth, authorize('admin'), async (req, res) => {
  try {
    const alerts = await Certificate.find({
      verificationStatus: { $in: ['suspicious', 'fake'] }
    })
      .populate('institutionId', 'name code')
      .populate('uploadedBy', 'email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(alerts);
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

async function getMonthlyStats() {
  const months = [];
  const currentDate = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    
    const stats = await Certificate.aggregate([
      {
        $match: {
          createdAt: { $gte: date, $lt: nextMonth }
        }
      },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const monthStats = {
      month: date.toISOString().substring(0, 7),
      verified: 0,
      suspicious: 0,
      fake: 0,
      pending: 0
    };
    
    stats.forEach(stat => {
      monthStats[stat._id] = stat.count;
    });
    
    months.push(monthStats);
  }
  
  return months;
}

module.exports = router;
