# Docker Pull Fix Script
# Retries pulling Docker images with better timeout settings

Write-Host "🔧 Fixing Docker Pull Issues..." -ForegroundColor Cyan

# Increase Docker timeout
$env:DOCKER_CLIENT_TIMEOUT = "300"
$env:COMPOSE_HTTP_TIMEOUT = "300"

Write-Host "`n📥 Pulling images one by one with retries..." -ForegroundColor Yellow

# Pull images individually with retries
$images = @(
    "postgres:16-alpine",
    "mongo:7",
    "redis:7-alpine",
    "confluentinc/cp-zookeeper:7.6.0",
    "confluentinc/cp-kafka:7.6.0",
    "prom/prometheus:latest",
    "grafana/grafana:latest"
)

foreach ($image in $images) {
    $retries = 3
    $success = $false
    
    while ($retries -gt 0 -and -not $success) {
        Write-Host "`n📦 Pulling $image (attempts left: $retries)..." -ForegroundColor Cyan
        try {
            docker pull $image
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Successfully pulled $image" -ForegroundColor Green
                $success = $true
            } else {
                throw "Pull failed"
            }
        } catch {
            Write-Host "❌ Failed to pull $image" -ForegroundColor Red
            $retries--
            if ($retries -gt 0) {
                Write-Host "⏳ Waiting 10 seconds before retry..." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            }
        }
    }
    
    if (-not $success) {
        Write-Host "`n⚠️  WARNING: Could not pull $image after 3 attempts" -ForegroundColor Yellow
        Write-Host "   You can try running WITHOUT Docker (see NO_DOCKER_START.ps1)" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Docker pull process completed!" -ForegroundColor Green
Write-Host "`nNow try: docker compose up -d" -ForegroundColor Cyan

