const mongoose = require('mongoose');
const {
  HASH_REGEX,
  computeCertificateHash,
  deriveCertificateSearchFields,
  normalizeCertificateInput,
} = require('../utils/certificatePayload');

const StudentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    seatNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
      alias: 'seat_no',
    },
    prn: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 64,
      default: '',
    },
    motherName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
      alias: 'mother_name',
    },
  },
  { _id: false }
);

const CollegeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 32,
      match: /^[A-Z0-9_-]{2,32}$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false }
);

const ExamSchema = new mongoose.Schema(
  {
    session: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    year: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    course: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    branchCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      default: '',
      alias: 'branch_code',
    },
  },
  { _id: false }
);

const SubjectSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 32,
      alias: 'course_code',
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      alias: 'course_name',
    },
    type: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    credits: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    grade: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: '',
    },
    creditPoints: {
      type: Number,
      min: 0,
      default: null,
      alias: 'credit_points',
    },
  },
  { _id: false }
);

const SummarySchema = new mongoose.Schema(
  {
    sgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    totalCredits: {
      type: Number,
      min: 0,
      default: null,
      alias: 'total_credits',
    },
  },
  { _id: false }
);

const IssueSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    serialNo: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 64,
      default: '',
      alias: 'serial_no',
    },
  },
  { _id: false }
);

const VerificationResultsSchema = new mongoose.Schema(
  {
    ocrConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    tamperScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    databaseMatch: {
      type: Boolean,
      default: false,
    },
    anomalyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    tamperingDetected: {
      type: Boolean,
      default: false,
    },
    templateMatch: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    templateId: {
      type: String,
      trim: true,
      default: '',
    },
    anomalies: {
      type: [String],
      default: [],
    },
    extractedText: {
      type: String,
      trim: true,
      default: '',
    },
    processingTime: {
      type: Number,
      min: 0,
      default: 0,
    },
    errors: {
      type: [String],
      default: [],
    },
  },
  { _id: false, suppressReservedKeysWarning: true }
);

const CertificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
      alias: 'certificate_id',
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    student: {
      type: StudentSchema,
      required: true,
    },
    college: {
      type: CollegeSchema,
      required: true,
    },
    exam: {
      type: ExamSchema,
      required: true,
    },
    subjects: {
      type: [SubjectSchema],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one subject is required',
      },
    },
    summary: {
      type: SummarySchema,
      default: () => ({}),
    },
    issue: {
      type: IssueSchema,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
      index: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    issueDate: {
      type: Date,
      required: true,
      index: true,
    },
    institutionCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      index: true,
    },
    institutionName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    examYear: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    serialNo: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 64,
      default: '',
    },
    documentHash: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      match: HASH_REGEX,
      index: true,
    },
    certificateHash: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: HASH_REGEX,
      index: true,
    },
    hashVersion: {
      type: Number,
      default: 2,
      min: 1,
    },
    verificationStatus: {
      type: String,
      enum: ['verified', 'suspicious', 'fake', 'pending'],
      default: 'pending',
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['manual_upload', 'bulk_upload', 'api', 'system'],
      default: 'manual_upload',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    verificationResults: {
      type: VerificationResultsSchema,
      default: () => ({}),
    },
    filePath: {
      type: String,
      trim: true,
      maxlength: 512,
      default: '',
    },
    originalFileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: '',
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

CertificateSchema.pre('validate', function normalizeCertificate(next) {
  const normalized = normalizeCertificateInput({
    certificateId: this.certificateId,
    institutionId: this.institutionId,
    student: this.student,
    college: this.college,
    exam: this.exam,
    subjects: this.subjects,
    summary: this.summary,
    issue: this.issue,
  });

  this.certificateId = normalized.certificateId;
  this.institutionId = normalized.institutionId || this.institutionId;
  this.student = normalized.student;
  this.college = normalized.college;
  this.exam = normalized.exam;
  this.subjects = normalized.subjects;
  this.summary = normalized.summary;
  this.issue = normalized.issue;

  const derivedFields = deriveCertificateSearchFields(normalized);
  this.studentName = derivedFields.studentName;
  this.rollNumber = derivedFields.rollNumber;
  this.course = derivedFields.course;
  this.issueDate = derivedFields.issueDate;
  this.institutionCode = derivedFields.institutionCode;
  this.institutionName = derivedFields.institutionName;
  this.examYear = derivedFields.examYear;
  this.serialNo = derivedFields.serialNo;

  if (this.documentHash) {
    this.documentHash = String(this.documentHash).trim().toLowerCase();
  }

  this.certificateHash = computeCertificateHash(normalized);
  next();
});

CertificateSchema.index({ institutionId: 1, rollNumber: 1, issueDate: -1 });
CertificateSchema.index({ institutionId: 1, certificateId: 1 });
CertificateSchema.index({ certificateHash: 1, documentHash: 1 });

module.exports = mongoose.models.Certificate || mongoose.model('Certificate', CertificateSchema);
