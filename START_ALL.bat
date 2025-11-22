@echo off
echo =============================================
echo   ARGOS SMART CAMPUS PLATFORM
echo   Starting All Services...
echo =============================================
echo.

REM Set Python path to project root
set PYTHONPATH=%~dp0

echo [Step 1] Setting PYTHONPATH...
echo PYTHONPATH=%PYTHONPATH%
echo.

echo [Step 2] Waiting for databases to be ready...
timeout /t 5 /nobreak > nul
echo   Databases should be ready now
echo.

echo [Step 3] Starting Backend Services...
echo.

REM Start API Gateway (Frontend connects to this)
echo   Starting API Gateway (port 8000)...
start "Argos - API Gateway" cmd /k "set PYTHONPATH=%PYTHONPATH% && python services\api_gateway\main.py"
timeout /t 3 /nobreak > nul

REM Start User Service
echo   Starting User Service (port 8001)...
start "Argos - User Service" cmd /k "set PYTHONPATH=%PYTHONPATH% && python services\user_service\main.py"
timeout /t 3 /nobreak > nul

REM Start Academic Service
echo   Starting Academic Service (port 8002)...
start "Argos - Academic Service" cmd /k "set PYTHONPATH=%PYTHONPATH% && python services\academic_service\main.py"
timeout /t 3 /nobreak > nul

REM Start Analytics Service
echo   Starting Analytics Service (port 8004)...
start "Argos - Analytics Service" cmd /k "set PYTHONPATH=%PYTHONPATH% && python services\analytics_service\main.py"
timeout /t 3 /nobreak > nul

REM Start Facility Service
echo   Starting Facility Service (port 8005)...
start "Argos - Facility Service" cmd /k "set PYTHONPATH=%PYTHONPATH% && python services\facility_service\main.py"
timeout /t 3 /nobreak > nul

echo.
echo [Step 4] Starting Frontend...
echo.

REM Start Frontend
echo   Starting Frontend (port 5173)...
start "Argos - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =============================================
echo   ALL SERVICES STARTED!
echo =============================================
echo.
echo Access the application:
echo   Frontend:       http://localhost:5173
echo   API Gateway:    http://localhost:8000/docs
echo   User API:       http://localhost:8001/docs
echo   Academic API:   http://localhost:8002/docs
echo   Analytics API:  http://localhost:8004/docs
echo   Facility API:   http://localhost:8005/docs
echo.
echo Note: Services are running in separate windows.
echo       Close those windows to stop services.
echo.
echo Press any key to close this window...
pause > nul

