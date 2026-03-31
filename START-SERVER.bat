@echo off
setlocal EnableDelayedExpansion
title PPA Attendance Monitoring System
echo ========================================
echo   PPA Attendance Monitoring System
echo ========================================
echo.
cd /d "%~dp0"

REM Production start requires .next\BUILD_ID (a plain .next folder is not enough)
if not exist ".next\BUILD_ID" (
    echo Production build not found - building the application...
    echo This may take a few minutes...
    echo.
    call npm run build
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Build failed. Server will not start.
        pause
        exit /b 1
    )
    echo.
    echo Build complete!
    echo.
)

echo Starting server (HTTPS for camera support)...
echo.

REM Generate SSL certificate if needed
node generate-cert.js

REM Trust certificate for current Windows user to enable camera APIs on HTTPS
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\trust-cert.ps1" -CertPath "%~dp0certs\cert.pem"
if %errorlevel% neq 0 (
    echo WARNING: Failed to trust SSL certificate automatically.
    echo Browser may block camera until certificate is trusted manually.
)

REM Prefer LAN IPv4 for display (avoid VPN/overlay adapters when possible)
set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "CANDIDATE=%%a"
    set "CANDIDATE=!CANDIDATE: =!"
    if "!CANDIDATE:~0,8!"=="192.168." (
        set "IP=!CANDIDATE!"
        goto :ip_found
    )
    if "!CANDIDATE:~0,3!"=="10." (
        set "IP=!CANDIDATE!"
        goto :ip_found
    )
)

if not defined IP (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        set "CANDIDATE=%%a"
        set "CANDIDATE=!CANDIDATE: =!"
        for /f "tokens=1,2 delims=." %%i in ("!CANDIDATE!") do (
            if "%%i"=="172" if %%j GEQ 16 if %%j LEQ 31 (
                set "IP=!CANDIDATE!"
                goto :ip_found
            )
        )
    )
)

if not defined IP (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        set "IP=%%a"
        set "IP=!IP: =!"
        goto :ip_found
    )
)

:ip_found
if not defined IP set "IP=localhost"

set APP_URL=
set VPN_URL=
if exist ".env.local" (
    for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"NEXTAUTH_URL=" .env.local') do (
        set APP_URL=%%B
    )
    for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"VPN_URL=" .env.local') do (
        set VPN_URL=%%B
    )
)

echo.
echo ==========================================
echo   Starting HTTPS server...
echo ==========================================
echo.
echo   Local:    https://localhost:3000
echo   Network:  https://%IP%:3000
if defined APP_URL (
echo   URL:      %APP_URL%
) else (
echo   URL:      Set NEXTAUTH_URL in .env.local
)
if defined VPN_URL (
echo   VPN:      %VPN_URL%
) else (
echo   VPN:      Set VPN_URL in .env.local if using VPN access
)
echo.
echo   Share the Network URL with employees
echo   on your company WiFi/network.
echo   The system is accessible only after the console shows:
echo   ^> HTTPS server ready on https://0.0.0.0:3000
echo.
echo   If this is first startup or after updates,
echo   warm-up can take 1-3 minutes.
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
echo   Press any key to start the server now...
echo   (Press Ctrl+C to stop the server later)
echo.
pause >nul

call npm run ports:free
if %errorlevel% neq 0 (
    echo ERROR: Could not free ports 3000/3001.
    echo Close other Node.js servers and try again.
    pause
    exit /b 1
)

set NODE_ENV=production
node server.js
pause
