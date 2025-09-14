// User types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'institution' | 'verifier';
  institutionId?: string;
  permissions: string[];
  lastLogin?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// Certificate types
export interface Certificate {
  _id: string;
  certificateId: string;
  studentName: string;
  rollNumber: string;
  institutionId: string | Institution;
  course: string;
  degree: string;
  issueDate: string;
  grades: Record<string, any>;
  documentHash: string;
  verificationStatus: 'verified' | 'suspicious' | 'fake' | 'pending';
  uploadedBy: string | User;
  uploadedAt: string;
  verificationResults: VerificationResults;
  filePath: string;
  originalFileName: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResults {
  ocrConfidence?: number;
  tamperScore?: number;
  databaseMatch?: boolean;
  anomalyScore?: number;
}

// Institution types
export interface Institution {
  _id: string;
  name: string;
  code: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
  };
  isVerified: boolean;
  establishedYear: number;
  accreditation: Array<{
    body: string;
    date: string;
    status: string;
  }>;
  apiEndpoint?: string;
  certificateTemplates: Array<{
    name: string;
    templateId: string;
    fields: string[];
  }>;
  totalCertificates: number;
  createdAt: string;
  updatedAt: string;
}

// Verification Log types
export interface VerificationLog {
  _id: string;
  certificateId: string | Certificate;
  verifiedBy: string | User;
  timestamp: string;
  result: string;
  ipAddress: string;
  userAgent?: string;
  verificationMethod: 'manual' | 'ai_automated' | 'database_check';
  details: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Dashboard types
export interface DashboardStats {
  overview: {
    totalCertificates: number;
    verifiedCertificates: number;
    suspiciousCertificates: number;
    fakeCertificates: number;
    pendingCertificates: number;
    totalInstitutions: number;
    verifiedInstitutions: number;
    verificationRate: number;
    fraudRate: number;
  };
  recentVerifications: VerificationLog[];
  monthlyStats: Array<{
    month: string;
    verified: number;
    suspicious: number;
    fake: number;
    pending: number;
  }>;
}

export interface TrendData {
  trends: Array<{
    _id: string;
    statuses: Array<{
      status: string;
      count: number;
    }>;
  }>;
  institutionStats: Array<{
    institutionName: string;
    institutionCode: string;
    total: number;
    verified: number;
    suspicious: number;
    fake: number;
    verificationRate: number;
  }>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalPages: number;
  currentPage: number;
  total: number;
}

// Upload types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUpload {
  file: File;
  preview: string;
  progress: UploadProgress;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'institution' | 'verifier';
  institutionId?: string;
}

export interface InstitutionForm {
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    website: string;
  };
  establishedYear: number;
  accreditation: Array<{
    body: string;
    date: string;
    status: string;
  }>;
}

export interface CertificateForm {
  studentName: string;
  rollNumber: string;
  course: string;
  degree: string;
  issueDate: string;
  institutionId: string;
  grades: Record<string, any>;
}

// WebSocket types
export interface WebSocketMessage {
  type: 'verification_update' | 'notification' | 'dashboard_update';
  data: any;
  timestamp: string;
}

// Chart types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  verified: number;
  suspicious: number;
  fake: number;
  pending: number;
}

// Filter types
export interface CertificateFilters {
  status?: string;
  institutionId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface InstitutionFilters {
  verified?: boolean;
  search?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
