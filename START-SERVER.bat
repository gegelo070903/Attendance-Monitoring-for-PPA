@echo off
title PPA Attendance Monitoring System
echo ========================================
echo   PPA Attendance Monitoring System
echo ========================================
echo.
echo Starting server...
echo.
cd /d "%~dp0"

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

echo.
echo ==========================================
echo   Server is running!
echo ==========================================
echo.
echo   Local:    http://localhost:3000
echo   Network:  http://%IP%:3000
echo.
echo   Share the Network URL with employees
echo   on your company WiFi/network.
echo.
echo   Press Ctrl+C to stop the server.
echo ==========================================
echo.

npm run start -- -H 0.0.0.0
pause
