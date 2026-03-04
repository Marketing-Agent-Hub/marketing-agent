# Script deploy tự động trên VPS (PowerShell version)
# Chạy: .\deploy.ps1 [tag] (default: latest)

param(
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "========================================"
Write-ColorOutput Green "  Bắt đầu deploy ocNewsBot"
Write-ColorOutput Green "  Image tag: $ImageTag"
Write-ColorOutput Green "========================================"

# 1. Kiểm tra file .env
if (-not (Test-Path ".env")) {
    Write-ColorOutput Red "✗ Không tìm thấy file .env!"
    exit 1
}

Write-ColorOutput Yellow "→ Load biến môi trường..."
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

# 2. Pull images mới nhất
Write-ColorOutput Yellow "→ Đang pull images mới..."
$env:IMAGE_TAG = $ImageTag
docker compose pull

# 3. Dừng và xóa containers cũ
Write-ColorOutput Yellow "→ Dừng containers cũ..."
docker compose down

# 4. Chạy migrations
Write-ColorOutput Yellow "→ Chạy database migrations..."
docker compose run --rm server npx prisma migrate deploy

# 5. Khởi động containers mới
Write-ColorOutput Yellow "→ Khởi động containers mới..."
docker compose up -d

# 6. Kiểm tra health
Write-ColorOutput Yellow "→ Kiểm tra health status..."
Start-Sleep -Seconds 10

$maxRetries = 30
$retryCount = 0
Write-ColorOutput Yellow "→ Đang kiểm tra server health..."

while ($retryCount -lt $maxRetries) {
    $serverStatus = docker compose ps server | Select-String "healthy"
    if ($serverStatus) {
        Write-ColorOutput Green "✓ Server đã sẵn sàng!"
        break
    }
    $retryCount++
    Write-Output "  Chờ server khởi động... ($retryCount/$maxRetries)"
    Start-Sleep -Seconds 2
}

if ($retryCount -eq $maxRetries) {
    Write-ColorOutput Red "✗ Server không healthy sau $maxRetries lần thử!"
    docker compose logs server
    exit 1
}

# Kiểm tra web
$webStatus = docker compose ps web | Select-String "healthy"
if ($webStatus) {
    Write-ColorOutput Green "✓ Web đã sẵn sàng!"
} else {
    Write-ColorOutput Yellow "⚠ Web chưa healthy, kiểm tra logs..."
}

# 7. Dọn dẹp images cũ
Write-ColorOutput Yellow "→ Dọn dẹp images cũ..."
docker image prune -f

# 8. Hiển thị trạng thái
Write-ColorOutput Green "========================================"
Write-ColorOutput Green "  Deploy hoàn tất!"
Write-ColorOutput Green "========================================"
docker compose ps

Write-Output ""
Write-ColorOutput Green "Logs realtime: docker compose logs -f"
Write-ColorOutput Green "Stop services: docker compose down"
Write-ColorOutput Green "Restart: docker compose restart"
