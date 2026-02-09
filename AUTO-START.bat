@echo off
REM ============================================
REM  PPA Attendance Server - Auto Start Script
REM ============================================
REM  This script starts the server and auto-restarts
REM  if it crashes. Run at Windows startup for 24/7 operation.
REM ============================================

title PPA Attendance Server

cd /d "c:\Users\johna\Documents\PPA ATTENDANCE\Attendance Monitoring for PPA"

REM Check if .next folder exists (means already built)
if not exist ".next" (
    echo Building app for first time...
    echo This may take a few minutes...
    call npm run build
    echo Build complete!
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
echo   Local:    http://localhost:3000
echo   Network:  http://%IP%:3000
echo.
echo   Share the Network URL with employees.
echo   Server will auto-restart if it stops.
echo ============================================
echo.

:startserver
echo [%date% %time%] Starting server...
npm run start

REM If server stops, wait 5 seconds and restart
echo.
echo [%date% %time%] Server stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto startserver
