# Authenticity Validator

Authenticity Validator is a comprehensive academic certificate verification platform. It leverages AI-assisted OCR, digital forensics (tampering detection), and optional blockchain anchoring to ensure the integrity of educational credentials.

## 🚀 How to Run the System

### 1. Using Docker (Recommended)
The easiest way to run the entire stack (Frontend, Backend, AI Service, MongoDB, Redis, Nginx) is using Docker Compose.

**Prerequisites:**
- Docker and Docker Compose installed.

**Steps:**
```bash
# Clone the repository
git clone <repository-url>
cd authenticity-validator

# Start all services
docker-compose up -d --build
```
The application will be available at `http://localhost`.
- **Frontend:** `http://localhost`
- **Backend API:** `http://localhost/api`
- **AI Service:** `http://localhost/ai`

---

### 2. Running Locally (Development)
If you want to run services individually for development:

#### **A. AI Service (Python)**
```bash
cd ai-services
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run the service
python api/main.py
```
*Note: Requires Tesseract OCR binary installed on your system.*

#### **B. Backend (Node.js)**
```bash
cd backend
# Install dependencies
npm install
# Set up .env file (copy from .env.example if available)
# Run the service
npm run dev
```
*Note: Requires a running MongoDB instance.*

#### **C. Frontend (React)**
```bash
cd frontend
# Install dependencies
npm install
# Run the development server
npm run dev
```

---

## 🛠️ How to Use & Integrate

### 1. Backend Integration
To integrate the certificate validation logic into your own backend:

**A. Call the AI Service for OCR/Forensics:**
```javascript
const axios = require('axios');
const FormData = require('form-data');

async function validateDocument(fileBuffer, filename) {
    const form = new FormData();
    form.append('file', fileBuffer, filename);
    
    const response = await axios.post('http://ai-service:8001/ai/verify/complete', form, {
        headers: form.getHeaders()
    });
    return response.data; // Contains confidence_score, status, and tampering_results
}
```

**B. Generate Semantic Hashes:**
Use the shared hashing utility to ensure consistency:
```javascript
const { generateCertificateHash } = require('./utils/hash');
const hash = generateCertificateHash(normalizedData);
```

### 2. Frontend Integration
To use the validation features in a frontend application:

**A. Upload for Validation:**
```javascript
const handleValidation = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/certificates/validate-candidate', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    // Result includes verificationStatus: 'verified', 'fake', or 'suspicious'
};
```

**B. Real-time Notifications:**
Subscribe to verification events using Socket.IO:
```javascript
import { io } from 'socket.io-client';
const socket = io(process.env.VITE_SOCKET_URL);

socket.on('verification_complete', (data) => {
    console.log('Certificate verified:', data.certificateId);
    toast.success('Verification Complete!');
});
```

## 📖 Documentation
- [Detailed System Architecture](architecture.md) - Explains the model logic, hashing strategy, and microservice boundaries.
- [Project Description](PROJECT_DESCRIPTION.md) - Research-oriented overview of the platform.

## ⚖️ License
MIT License - See [LICENSE](LICENSE) for details.
