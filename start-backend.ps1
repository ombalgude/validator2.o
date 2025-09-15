Write-Host "Starting Backend Server..." -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location -Path "backend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "Please edit backend/.env with your MongoDB connection string" -ForegroundColor Red
}

Write-Host "Starting backend server on http://localhost:5000" -ForegroundColor Cyan
npm start
