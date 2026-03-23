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

REM Trust certificate for current Windows user to enable camera APIs on HTTPS
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\trust-cert.ps1" -CertPath "%~dp0certs\cert.pem"
if %errorlevel% neq 0 (
    echo WARNING: Failed to trust SSL certificate automatically.
    echo Browser may block camera until certificate is trusted manually.
)

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

set WAN_URL=
set VPN_URL=
if exist ".env.local" (
    for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"NEXTAUTH_URL=" .env.local') do (
        set WAN_URL=%%B
    )
    for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"VPN_URL=" .env.local') do (
        set VPN_URL=%%B
    )
)

echo.
echo ==========================================
echo   Server is running! (HTTPS)
echo ==========================================
echo.
echo   Local:    https://localhost:3000
echo   Network:  https://%IP%:3000
if defined WAN_URL (
echo   WAN:      %WAN_URL%
) else (
echo   WAN:      Set NEXTAUTH_URL in .env.local if using a public IP/domain
)
if defined VPN_URL (
echo   VPN:      %VPN_URL%
) else (
echo   VPN:      Set VPN_URL in .env.local if using VPN access
)
echo.
echo   Share the Network URL with employees
echo   on your company WiFi/network.
echo   For WAN, forward ports 3000 and 3001 on your router and allow them in Windows Firewall.
echo.
echo   NOTE: Users will see a security warning
echo   because the certificate is self-signed.
echo   A raw public IP with a self-signed certificate is not ideal for external users.
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
