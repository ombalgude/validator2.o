@echo off
echo Starting Authenticity Validator for Academia...
echo.

echo [1/4] Starting Backend Server...
start "Backend" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak > nul

echo [2/4] Starting AI Services...
start "AI Services" cmd /k "cd ai-services && python -m uvicorn api.main:app --host 0.0.0.0 --port 8001"
timeout /t 3 /nobreak > nul

echo [3/4] Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 3 /nobreak > nul

echo [4/4] All services started!
echo.
echo Access Points:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5000
echo - AI Services: http://localhost:8001
echo.
echo Press any key to exit...
pause > nul
