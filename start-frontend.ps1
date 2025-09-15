Write-Host "Starting Frontend..." -ForegroundColor Green
Write-Host ""

# Navigate to frontend directory
Set-Location -Path "frontend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file from example..." -ForegroundColor Yellow
    Copy-Item "env.local.example" ".env.local"
    Write-Host "Please edit frontend/.env.local with your API URLs" -ForegroundColor Red
}

Write-Host "Starting frontend development server on http://localhost:3000" -ForegroundColor Cyan
npm run dev
