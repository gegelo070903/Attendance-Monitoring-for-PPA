@echo off
title PPA Attendance Monitoring System
echo ========================================
echo   PPA Attendance Monitoring System
echo ========================================
echo.
cd /d "%~dp0"

REM Check if .next folder exists (means already built)
if not exist ".next" (
    echo First time setup - Building the application...
    echo This may take a few minutes...
    echo.
    call npm run build
    echo.
    echo Build complete!
    echo.
)

echo Starting server (HTTPS for camera support)...
echo.

REM Generate SSL certificate if needed
node generate-cert.js

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

echo.
echo ==========================================
echo   Server is running! (HTTPS)
echo ==========================================
echo.
echo   Local:    https://localhost:3000
echo   Network:  https://%IP%:3000
echo.
echo   Share the Network URL with employees
echo   on your company WiFi/network.
echo.
echo   NOTE: Users will see a security warning
echo   because the certificate is self-signed.
echo   Click "Advanced" then "Proceed" to continue.
echo.
echo ==========================================

REM Copy network URL to clipboard
echo https://%IP%:3000| clip
echo.
echo   [Link copied to clipboard! Press Ctrl+V to paste]
echo.
echo   Press any key to start the server...
echo   (Press Ctrl+C to stop the server later)
echo.
pause >nul

npm run start:https
pause
