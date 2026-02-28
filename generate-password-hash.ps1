# Helper script to generate password hash for .env.docker
param(
    [Parameter(Mandatory=$true)]
    [string]$Password
)

Write-Host ""
Write-Host "🔐 Generating bcrypt hash for password..." -ForegroundColor Cyan

# Navigate to server directory to use bcrypt
Push-Location server

# Check if bcrypt is installed
if (-not (Test-Path "node_modules/bcrypt")) {
    Write-Host "📦 bcrypt not installed. Installing..." -ForegroundColor Yellow
    npm install bcrypt --no-save
}

# Generate hash
$hash = node -e "console.log(require('bcrypt').hashSync('$Password', 10))"

Pop-Location

Write-Host ""
Write-Host "Copy this hash to ADMIN_PASSWORD_HASH in .env.docker:" -ForegroundColor Green
Write-Host ""
Write-Host $hash -ForegroundColor White
Write-Host ""
