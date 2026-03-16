@echo off
REM ============================================
REM  PPA Attendance Server - Auto Start Script
REM ============================================
REM  This script starts the server and auto-restarts
REM  if it crashes. Run at Windows startup for 24/7 operation.
REM ============================================

title PPA Attendance Server

cd /d "%~dp0"

REM Verify required runtime tools are available before entering restart loop
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Install Node.js 18+ from https://nodejs.org and restart Windows.
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available in PATH.
    echo Reinstall Node.js and restart Windows.
    exit /b 1
)

REM Check if .next folder exists (means already built)
if not exist ".next" (
    echo Building app for first time...
    echo This may take a few minutes...
    call npm run build
    echo Build complete!
)

REM Ensure SSL certificate exists and is trusted for current user
node generate-cert.js
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\trust-cert.ps1" -CertPath "%~dp0certs\cert.pem"
if %errorlevel% neq 0 (
    echo WARNING: Could not trust SSL certificate automatically.
    echo Camera may be blocked until cert is trusted manually.
)

REM Get local IP for display
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

echo.
echo ============================================
echo   PPA Attendance Server Running
echo ============================================
echo.
echo   Local:    https://localhost:3000
echo   Network:  https://%IP%:3000
echo.
echo   Share the Network URL with employees.
echo   Browser may show certificate warning.
echo   Click Advanced then Proceed.
echo   Server will auto-restart if it stops.
echo ============================================
echo.

:startserver
echo [%date% %time%] Starting server...
npm run start:https

REM If server stops, wait 5 seconds and restart
echo.
echo [%date% %time%] Server stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto startserver
