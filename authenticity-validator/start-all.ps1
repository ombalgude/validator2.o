Write-Host "Starting Authenticity Validator for Academia..." -ForegroundColor Green
Write-Host ""

Write-Host "[1/4] Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "start-backend.ps1"
Start-Sleep -Seconds 5

Write-Host "[2/4] Starting AI Services..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "start-ai-services.ps1"
Start-Sleep -Seconds 5

Write-Host "[3/4] Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "start-frontend.ps1"
Start-Sleep -Seconds 5

Write-Host "[4/4] All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "- AI Services: http://localhost:8001" -ForegroundColor White
Write-Host "- API Documentation: http://localhost:8001/docs" -ForegroundColor White
Write-Host ""
Write-Host "Smart Contracts Status: Ready for development" -ForegroundColor Magenta
Write-Host "- Blockchain directory: ./blockchain/" -ForegroundColor Gray
Write-Host "- Solana smart contracts: Complete structure" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
