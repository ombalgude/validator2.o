# API Documentation

## Overview

This document provides comprehensive API documentation for the Authenticity Validator for Academia system.

## Base URLs

- **Backend API**: `http://localhost:5000/api`
- **AI Services**: `http://localhost:8000`

## Authentication

All API endpoints (except login/register) require authentication via JWT token.

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Endpoints

### Authentication

#### POST /api/auth/login
Login user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### POST /api/auth/register
Register new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "institution",
  "institutionId": "institution_id"
}
```

#### GET /api/auth/me
Get current user information.

### Certificates

#### POST /api/certificates/verify
Upload and verify certificate.

**Request:** Multipart form data
- `file`: Certificate file (PDF, JPG, PNG, TIFF)
- `studentName`: Student name (optional)
- `rollNumber`: Roll number (optional)
- `institutionId`: Institution ID (optional)

**Response:**
```json
{
  "success": true,
  "certificateId": "CERT_123456",
  "verificationStatus": "verified",
  "verificationResults": {
    "ocrConfidence": 0.95,
    "tamperScore": 0.1,
    "databaseMatch": true,
    "anomalyScore": 0.05
  }
}
```

#### GET /api/certificates
Get all certificates with filtering and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `verificationStatus`: Filter by status
- `institutionId`: Filter by institution
- `studentName`: Search by student name
- `rollNumber`: Search by roll number

#### GET /api/certificates/:id
Get specific certificate details.

#### PUT /api/certificates/:id/verify
Update certificate verification status.

**Request Body:**
```json
{
  "status": "verified",
  "reason": "Manual verification completed"
}
```

#### POST /api/certificates/bulk
Bulk upload certificates.

**Request:** Multipart form data with multiple files

### Institutions

#### GET /api/institutions
Get all institutions.

#### POST /api/institutions
Create new institution.

**Request Body:**
```json
{
  "name": "University Name",
  "code": "UNIV001",
  "address": {
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "country": "Country"
  },
  "contactInfo": {
    "email": "contact@university.edu",
    "phone": "+1234567890"
  }
}
```

#### GET /api/institutions/:id
Get specific institution.

#### PUT /api/institutions/:id
Update institution.

#### DELETE /api/institutions/:id
Delete institution.

#### POST /api/institutions/:id/verify
Verify institution.

### Dashboard

#### GET /api/dashboard/stats
Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalCertificates": 1000,
    "verifiedCertificates": 850,
    "suspiciousCertificates": 50,
    "fakeCertificates": 20,
    "pendingCertificates": 80,
    "totalInstitutions": 25,
    "verifiedInstitutions": 20
  }
}
```

#### GET /api/dashboard/trends
Get trend data for charts.

#### GET /api/dashboard/alerts
Get recent alerts and notifications.

## AI Service Endpoints

### POST /ai/ocr/extract
Extract text from document using OCR.

**Request:** Multipart form data with file

**Response:**
```json
{
  "text": "Extracted text content",
  "confidence": 0.95,
  "language": "en",
  "processing_time": 2.5
}
```

### POST /ai/verify/tampering
Detect image tampering.

**Request:** Multipart form data with file

**Response:**
```json
{
  "tampering_detected": false,
  "confidence_score": 0.1,
  "analysis_details": {
    "ela_score": 0.05,
    "noise_score": 0.02
  },
  "recommendations": ["No obvious signs of tampering"]
}
```

### POST /ai/verify/template
Match certificate against templates.

**Request:** Multipart form data with file and optional template_id

**Response:**
```json
{
  "match_score": 0.85,
  "template_id": "template_001",
  "matched_template": "University Certificate Template",
  "confidence": 0.9
}
```

### POST /ai/analyze/anomaly
Detect anomalies in certificate.

**Request:** Multipart form data with file

**Response:**
```json
{
  "anomaly_score": 0.1,
  "anomalies": [],
  "confidence": 0.95,
  "analysis_details": {}
}
```

### POST /ai/verify/complete
Complete verification process.

**Request:** Multipart form data with file

**Response:**
```json
{
  "verification_status": "verified",
  "confidence_score": 0.9,
  "ocr_results": {},
  "tampering_results": {},
  "template_results": {},
  "anomaly_results": {},
  "recommendations": [],
  "processing_time": 5.2
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

### Common HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited:
- Authentication: 5 requests per minute
- File uploads: 10 requests per minute
- General API: 100 requests per minute

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000');
socket.emit('authenticate', { userId: 'user_id', role: 'admin' });
```

### Events
- `verification_complete` - Certificate verification completed
- `status_update` - Certificate status updated
- `alert` - System alert
- `dashboard_update` - Dashboard data updated
- `system_notification` - System-wide notification

## Examples

### Upload and Verify Certificate
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('studentName', 'John Doe');
formData.append('rollNumber', '12345');

const response = await fetch('/api/certificates/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

### Get Certificates with Filtering
```javascript
const response = await fetch('/api/certificates?verificationStatus=verified&page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
```

