# How to Restart API Gateway with CORS Fix

## Quick Restart Instructions

1. **Stop the current API Gateway server** (if running):
   - Find the terminal/PowerShell window running the API Gateway
   - Press `Ctrl+C` to stop it

2. **Restart the API Gateway**:
   ```powershell
   cd "D:\PERSONAL\Projects\Smart Campus"
   .\venv\Scripts\Activate.ps1
   python services/api_gateway/main.py
   ```

   OR if using uvicorn directly:
   ```powershell
   cd "D:\PERSONAL\Projects\Smart Campus"
   .\venv\Scripts\Activate.ps1
   uvicorn services.api_gateway.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Verify CORS is working**:
   - Look for this log message: `"CORS configured for development - allowing localhost origins"`
   - Look for: `"Handled OPTIONS preflight"` when making requests

## Architecture Explanation

- **API Gateway (8000)**: The ONLY service the frontend talks to
- **Backend Services (8001, 8002, 8004, 8005)**: Internal services, only accessed by API Gateway
  - User Service (8001)
  - Academic Service (8002)
  - Analytics Service (8004)
  - Facility Service (8005)

The frontend should NEVER make direct requests to ports 8001, 8002, 8004, or 8005.
All requests go through the API Gateway at port 8000.

## Troubleshooting

If CORS errors persist after restart:
1. Check server logs for CORS configuration messages
2. Verify the server is running on port 8000
3. Check browser console for the exact error
4. Ensure no other process is using port 8000

