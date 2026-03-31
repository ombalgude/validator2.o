const crypto = require('crypto');

const HASH_REGEX = /^[a-f0-9]{64}$/;

const toTrimmedString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const toUpperTrimmedString = (value) => toTrimmedString(value).toUpperCase();

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseJsonIfNeeded = (value, fallback) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  return value;
};

const normalizeSubject = (subject = {}) => ({
  courseCode: toUpperTrimmedString(subject.courseCode ?? subject.course_code),
  courseName: toTrimmedString(subject.courseName ?? subject.course_name),
  type: toTrimmedString(subject.type),
  credits: toNullableNumber(subject.credits),
  grade: toUpperTrimmedString(subject.grade),
  creditPoints: toNullableNumber(subject.creditPoints ?? subject.credit_points),
});

const normalizeCertificateInput = (input = {}) => {
  const base = parseJsonIfNeeded(input.certificateData ?? input.certificate_data, input) || {};
  const student = parseJsonIfNeeded(base.student, {});
  const college = parseJsonIfNeeded(base.college, {});
  const exam = parseJsonIfNeeded(base.exam, {});
  const summary = parseJsonIfNeeded(base.summary, {});
  const issue = parseJsonIfNeeded(base.issue, {});
  const subjectsInput = parseJsonIfNeeded(base.subjects, []);

  const normalizedSubjects = Array.isArray(subjectsInput)
    ? subjectsInput.map(normalizeSubject).filter((subject) =>
        Object.values(subject).some((value) => value !== '' && value !== null)
      )
    : [];

  return {
    certificateId: toUpperTrimmedString(base.certificateId ?? base.certificate_id),
    institutionId: toTrimmedString(base.institutionId ?? base.institution_id) || null,
    student: {
      name: toTrimmedString(student.name ?? base.studentName),
      seatNo: toUpperTrimmedString(student.seatNo ?? student.seat_no ?? base.rollNumber ?? base.seatNo),
      prn: toUpperTrimmedString(student.prn),
      motherName: toTrimmedString(student.motherName ?? student.mother_name),
    },
    college: {
      code: toUpperTrimmedString(college.code ?? base.collegeCode),
      name: toTrimmedString(college.name ?? base.collegeName),
    },
    exam: {
      session: toTrimmedString(exam.session),
      year: toTrimmedString(exam.year),
      course: toTrimmedString(exam.course ?? base.course),
      branchCode: toUpperTrimmedString(exam.branchCode ?? exam.branch_code ?? base.branchCode),
    },
    subjects: normalizedSubjects,
    summary: {
      sgpa: toNullableNumber(summary.sgpa),
      totalCredits: toNullableNumber(summary.totalCredits ?? summary.total_credits),
    },
    issue: {
      date: toDateOrNull(issue.date ?? base.issueDate ?? base.issue_date),
      serialNo: toUpperTrimmedString(issue.serialNo ?? issue.serial_no ?? base.serialNo),
    },
  };
};

const normalizeForHash = (value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeForHash);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalizeForHash(value[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const buildCertificateHashPayload = (certificate = {}) =>
  normalizeForHash({
    certificateId: toUpperTrimmedString(certificate.certificateId ?? certificate.certificate_id),
    student: {
      name: toTrimmedString(certificate.student?.name),
      seatNo: toUpperTrimmedString(certificate.student?.seatNo ?? certificate.student?.seat_no),
      prn: toUpperTrimmedString(certificate.student?.prn),
      motherName: toTrimmedString(certificate.student?.motherName ?? certificate.student?.mother_name),
    },
    college: {
      code: toUpperTrimmedString(certificate.college?.code),
      name: toTrimmedString(certificate.college?.name),
    },
    exam: {
      session: toTrimmedString(certificate.exam?.session),
      year: toTrimmedString(certificate.exam?.year),
      course: toTrimmedString(certificate.exam?.course),
      branchCode: toUpperTrimmedString(certificate.exam?.branchCode ?? certificate.exam?.branch_code),
    },
    subjects: Array.isArray(certificate.subjects) ? certificate.subjects.map(normalizeSubject) : [],
    summary: {
      sgpa: toNullableNumber(certificate.summary?.sgpa),
      totalCredits: toNullableNumber(certificate.summary?.totalCredits ?? certificate.summary?.total_credits),
    },
    issue: {
      date: toDateOrNull(certificate.issue?.date ?? certificate.issue?.issueDate),
      serialNo: toUpperTrimmedString(certificate.issue?.serialNo ?? certificate.issue?.serial_no),
    },
  });

const computeCertificateHash = (certificate = {}) =>
  crypto.createHash('sha256').update(JSON.stringify(buildCertificateHashPayload(certificate))).digest('hex');

const deriveCertificateSearchFields = (certificate = {}) => ({
  studentName: toTrimmedString(certificate.student?.name),
  rollNumber: toUpperTrimmedString(certificate.student?.seatNo || certificate.student?.prn),
  course: toTrimmedString(certificate.exam?.course),
  issueDate: toDateOrNull(certificate.issue?.date),
  institutionCode: toUpperTrimmedString(certificate.college?.code),
  institutionName: toTrimmedString(certificate.college?.name),
  examYear: toTrimmedString(certificate.exam?.year),
  serialNo: toUpperTrimmedString(certificate.issue?.serialNo),
});

module.exports = {
  HASH_REGEX,
  buildCertificateHashPayload,
  computeCertificateHash,
  deriveCertificateSearchFields,
  normalizeCertificateInput,
  parseJsonIfNeeded,
};
