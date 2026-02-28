# Quick start script for Docker deployment (Windows)

Write-Host "🚀 Starting ocNewsBot with Docker..." -ForegroundColor Green
Write-Host ""

# Run pre-deployment checks
if (Test-Path .\check-deployment.ps1) {
    Write-Host "Running pre-deployment checks..." -ForegroundColor Cyan
    & .\check-deployment.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Pre-deployment checks failed. Please fix issues above." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Check if .env.docker exists
if (-not (Test-Path .env.docker)) {
    Write-Host "⚠️  .env.docker not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item .env.docker.example .env.docker
    Write-Host "✅ Created .env.docker - Please edit it with your actual values!" -ForegroundColor Green
    Write-Host "   REQUIRED:" -ForegroundColor Yellow
    Write-Host "   - JWT_SECRET (min 32 chars) - Generate: openssl rand -base64 32" -ForegroundColor Yellow
    Write-Host "   - OPENAI_API_KEY (from platform.openai.com)" -ForegroundColor Yellow
    Write-Host "   - ADMIN_EMAIL (your admin email)" -ForegroundColor Yellow
    Write-Host "   - ADMIN_PASSWORD_HASH (bcrypt hash of password)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   To generate password hash:" -ForegroundColor Cyan
    Write-Host "   node -e `"console.log(require('bcrypt').hashSync('your-password', 10))`"" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter after editing .env.docker to continue"
}

Write-Host "📦 Building and starting services..." -ForegroundColor Cyan
docker-compose --env-file .env.docker up -d --build

Write-Host ""
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "✅ Services started!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access points:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost" -ForegroundColor White
Write-Host "   Backend:   http://localhost:3000" -ForegroundColor White
Write-Host "   Database:  localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "📊 View logs:" -ForegroundColor Cyan
Write-Host "   docker-compose logs -f" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Stop services:" -ForegroundColor Cyan
Write-Host "   docker-compose down" -ForegroundColor White
Write-Host ""
