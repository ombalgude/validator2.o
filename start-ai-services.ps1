Write-Host "Starting AI Services..." -ForegroundColor Green
Write-Host ""

# Navigate to ai-services directory
Set-Location -Path "ai-services"

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing AI services dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

Write-Host "Starting AI services on http://localhost:8001" -ForegroundColor Cyan
python -m uvicorn api.main:app --host 0.0.0.0 --port 8001
