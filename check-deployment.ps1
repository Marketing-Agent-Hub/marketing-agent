# Deployment verification script

Write-Host "🔍 Checking deployment readiness..." -ForegroundColor Cyan
Write-Host ""

$ERRORS = 0

# Check if .env.docker exists
if (-not (Test-Path .env.docker)) {
    Write-Host "❌ .env.docker not found" -ForegroundColor Red
    Write-Host "   Run: Copy-Item .env.docker.example .env.docker" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✅ .env.docker exists" -ForegroundColor Green
    
    # Check required variables
    $requiredVars = @('JWT_SECRET', 'OPENAI_API_KEY', 'ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'CORS_ORIGIN')
    $content = Get-Content .env.docker
    
    foreach ($var in $requiredVars) {
        $line = $content | Select-String "^$var=" | Select-Object -First 1
        if (-not $line) {
            Write-Host "⚠️  $var is missing" -ForegroundColor Yellow
            $ERRORS++
        } else {
            $val = $line.ToString().Split('=', 2)[1]
            if ([string]::IsNullOrWhiteSpace($val) -or 
                $val -match 'your-super-secret' -or 
                $val -match 'sk-your-openai' -or 
                $val -match '\.\.\.' -or
                $val -match 'change-in-production') {
                Write-Host "⚠️  $var needs to be configured" -ForegroundColor Yellow
                $ERRORS++
            }
        }
    }
}

Write-Host ""

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is installed ($dockerVersion)" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
    $ERRORS++
}

# Check if Docker Compose is installed
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose is installed ($composeVersion)" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed" -ForegroundColor Red
    $ERRORS++
}

Write-Host ""

# Check if ports are available
$ports = @(80, 3000, 5432)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "⚠️  Port $port is already in use" -ForegroundColor Yellow
        $ERRORS++
    } else {
        Write-Host "✅ Port $port is available" -ForegroundColor Green
    }
}

Write-Host ""

# Check docker-compose.yml password
$composeContent = Get-Content docker-compose.yml -Raw
if ($composeContent -match "POSTGRES_PASSWORD: m1505") {
    Write-Host "⚠️  Default PostgreSQL password detected in docker-compose.yml" -ForegroundColor Yellow
    Write-Host "   Please change POSTGRES_PASSWORD in docker-compose.yml (lines 9 & 29)" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✅ PostgreSQL password has been changed" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

if ($ERRORS -eq 0) {
    Write-Host "✅ All checks passed! Ready to deploy." -ForegroundColor Green
    Write-Host ""
    Write-Host "Run: docker-compose up -d --build" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "❌ Found $ERRORS issue(s). Please fix them before deploying." -ForegroundColor Red
    Write-Host ""
    Write-Host "See DEPLOY_VPS.md for detailed instructions" -ForegroundColor Yellow
    exit 1
}
