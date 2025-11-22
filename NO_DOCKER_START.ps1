# Start Argos WITHOUT Docker
# Requires: PostgreSQL, MongoDB, Redis installed locally

Write-Host "🚀 Starting Argos WITHOUT Docker..." -ForegroundColor Cyan
Write-Host "`n⚠️  Prerequisites:" -ForegroundColor Yellow
Write-Host "   - PostgreSQL running on localhost:5432" -ForegroundColor Yellow
Write-Host "   - MongoDB running on localhost:27017" -ForegroundColor Yellow
Write-Host "   - Redis running on localhost:6379" -ForegroundColor Yellow
Write-Host "`n   (Kafka/Zookeeper are optional - services will work without them)" -ForegroundColor Gray

# Check if databases are running
Write-Host "`n🔍 Checking database connections..." -ForegroundColor Cyan

$postgresRunning = $false
$mongoRunning = $false
$redisRunning = $false

# Check PostgreSQL
try {
    $pgTest = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($pgTest.TcpTestSucceeded) {
        $postgresRunning = $true
        Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL is NOT running on port 5432" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot check PostgreSQL" -ForegroundColor Red
}

# Check MongoDB
try {
    $mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($mongoTest.TcpTestSucceeded) {
        $mongoRunning = $true
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB is NOT running on port 27017" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot check MongoDB" -ForegroundColor Red
}

# Check Redis
try {
    $redisTest = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($redisTest.TcpTestSucceeded) {
        $redisRunning = $true
        Write-Host "✅ Redis is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Redis is NOT running (optional, but recommended)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Cannot check Redis (optional)" -ForegroundColor Yellow
}

if (-not $postgresRunning -or -not $mongoRunning) {
    Write-Host "`n❌ Required databases are not running!" -ForegroundColor Red
    Write-Host "`n💡 Solutions:" -ForegroundColor Cyan
    Write-Host "   1. Install PostgreSQL and MongoDB locally" -ForegroundColor White
    Write-Host "   2. Or fix Docker and use: docker compose up -d" -ForegroundColor White
    Write-Host "   3. Or run: .\DOCKER_FIX.ps1 to retry Docker pull" -ForegroundColor White
    exit 1
}

Write-Host "`n✅ All required databases are running!" -ForegroundColor Green

# Activate virtual environment
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "`n🐍 Activating Python virtual environment..." -ForegroundColor Cyan
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "⚠️  Virtual environment not found. Creating one..." -ForegroundColor Yellow
    python -m venv venv
    & "venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
}

# Start services
Write-Host "`n🚀 Starting microservices..." -ForegroundColor Cyan

# Start API Gateway
Write-Host "`n📡 Starting API Gateway (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd services/api_gateway; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
Start-Sleep -Seconds 3

# Start User Service
Write-Host "👤 Starting User Service (port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd services/user_service; python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
Start-Sleep -Seconds 2

# Start Academic Service
Write-Host "📚 Starting Academic Service (port 8002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd services/academic_service; python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload"
Start-Sleep -Seconds 2

# Start Analytics Service
Write-Host "🤖 Starting Analytics Service (port 8004)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd services/analytics_service; python -m uvicorn main:app --host 0.0.0.0 --port 8004 --reload"
Start-Sleep -Seconds 2

# Start Scheduler Service
Write-Host "📅 Starting Scheduler Service (port 8005)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd services/scheduler_service; python -m uvicorn main:app --host 0.0.0.0 --port 8005 --reload"
Start-Sleep -Seconds 2

# Start Facility Service
Write-Host "🏢 Starting Facility Service (port 8006)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd services/facility_service; python -m uvicorn main:app --host 0.0.0.0 --port 8006 --reload"
Start-Sleep -Seconds 2

# Start Security Service
Write-Host "🔒 Starting Security Service (port 8007)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd services/security_service; python -m uvicorn main:app --host 0.0.0.0 --port 8007 --reload"
Start-Sleep -Seconds 2

# Start Consensus Service
Write-Host "⚡ Starting Consensus Service (port 8008)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd services/consensus_service; python -m uvicorn main:app --host 0.0.0.0 --port 8008 --reload"
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "`n🎨 Starting Frontend (port 5173)..." -ForegroundColor Yellow
if (Test-Path "frontend\node_modules") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"
} else {
    Write-Host "⚠️  Frontend dependencies not installed. Installing now..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"
}

Write-Host "`n✅ All services started!" -ForegroundColor Green
Write-Host "`n🌐 Access the application:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   API Gateway: http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "`n💡 Each service opened in a separate window for monitoring." -ForegroundColor Gray

