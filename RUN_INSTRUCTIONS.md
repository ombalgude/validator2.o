# 🚀 Authenticity Validator - Run Instructions

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

### Required Software
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **MongoDB** (local or MongoDB Atlas) - [Download here](https://mongodb.com/)
- **Git** - [Download here](https://git-scm.com/)

### Optional (for full functionality)
- **Docker** - [Download here](https://docker.com/)
- **Tesseract OCR** - [Download here](https://github.com/tesseract-ocr/tesseract)

## 🏗️ Project Structure

```
authenticity-validator/
├── frontend/                 # Next.js 14 + TypeScript
├── backend/                  # Express.js + MongoDB
├── ai-services/             # Python + FastAPI
├── blockchain/              # Rust smart contracts (future)
├── shared/                  # Common utilities
├── docs/                    # Documentation
└── docker-compose.yml       # Docker orchestration
```

## 🚀 Quick Start (All Services)

### Option 1: Using Docker (Recommended)

1. **Clone and navigate to the project:**
   ```bash
   git clone https://github.com/ombalgude/validator.git
   cd validator/authenticity-validator
   ```

2. **Set up environment variables:**
   ```bash
   # Copy example files
   cp backend/env.example backend/.env
   cp frontend/env.local.example frontend/.env.local
   ```

3. **Edit environment files:**
   - `backend/.env` - Add your MongoDB connection string
   - `frontend/.env.local` - Add your backend URL

4. **Run with Docker:**
   ```bash
   docker-compose up --build
   ```

### Option 2: Manual Setup

#### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your MongoDB connection string

# Start the backend server
npm start
# Server will run on http://localhost:5000
```

#### 2. AI Services Setup

```bash
# Navigate to AI services
cd ai-services

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start AI services
python -m uvicorn api.main:app --host 0.0.0.0 --port 8001
# AI services will run on http://localhost:8001
```

#### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp env.local.example .env.local
# Edit .env.local with your backend URL

# Start the development server
npm run dev
# Frontend will run on http://localhost:3000
```

## 🔧 Environment Configuration

### Backend Environment (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/authenticity-validator
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
AI_SERVICE_URL=http://localhost:8001
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### Frontend Environment (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

## 🌐 Access Points

Once all services are running:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **AI Services**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs (FastAPI auto-generated)

## 📊 Default Admin Account

After first run, create an admin account:

```bash
# Using the backend API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'
```

## 🐳 Docker Commands

### Start all services
```bash
docker-compose up --build
```

### Start specific service
```bash
docker-compose up frontend
docker-compose up backend
docker-compose up ai-services
```

### Stop all services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f [service-name]
```

## 🔍 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process using port
   # Windows:
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # macOS/Linux:
   lsof -ti:3000 | xargs kill -9
   ```

2. **MongoDB connection failed**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - For MongoDB Atlas, whitelist your IP

3. **Python dependencies issues**
   ```bash
   # Recreate virtual environment
   rm -rf venv
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

4. **Node modules issues**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### Service Health Checks

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000/api/health
- **AI Services**: http://localhost:8001/health

## 📝 Development Workflow

### 1. Start Development Environment
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - AI Services
cd ai-services && python -m uvicorn api.main:app --reload --port 8001

# Terminal 3 - Frontend
cd frontend && npm run dev
```

### 2. Code Changes
- Frontend changes auto-reload
- Backend changes require restart (or use nodemon)
- AI services auto-reload with `--reload` flag

### 3. Testing
```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# AI services tests
cd ai-services && python -m pytest
```

## 🚀 Production Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Railway/Render)
1. Connect GitHub repository
2. Set environment variables
3. Deploy with MongoDB Atlas connection

### AI Services (Railway)
1. Connect GitHub repository
2. Set Python version and dependencies
3. Deploy with proper environment variables

## 📚 API Documentation

### Backend API Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/certificates/verify` - Upload and verify certificate
- `GET /api/certificates/:id` - Get verification results
- `GET /api/institutions` - List institutions
- `GET /api/dashboard/stats` - Dashboard analytics

### AI Services Endpoints
- `POST /ai/ocr/extract` - Extract text from documents
- `POST /ai/verify/tampering` - Detect image tampering
- `POST /ai/verify/template` - Match certificate template
- `POST /ai/analyze/anomaly` - Detect anomalies

## 🎯 Next Steps

1. **Set up MongoDB Atlas** for production database
2. **Configure environment variables** for your deployment
3. **Test all endpoints** using the provided API documentation
4. **Upload sample certificates** to test the verification flow
5. **Set up monitoring** and logging for production

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the logs for error messages
3. Ensure all prerequisites are installed
4. Verify environment variables are set correctly

---

**Happy Coding! 🎉**

The Authenticity Validator is now ready to detect fake certificates and ensure academic integrity!
