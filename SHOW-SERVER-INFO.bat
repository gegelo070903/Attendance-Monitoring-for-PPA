@echo off
setlocal EnableDelayedExpansion
title PPA Attendance - Server Info

cd /d "%~dp0"

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

set "APP_URL="
set "VPN_URL="
if exist ".env.local" (
    for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"NEXTAUTH_URL=" .env.local') do set "APP_URL=%%B"
    for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"VPN_URL=" .env.local') do set "VPN_URL=%%B"
)

set "SERVER_STATUS=Not detected on port 3000"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
    set "SERVER_STATUS=Running (PID %%p listening on 3000)"
    goto :status_found
)
:status_found

echo.
echo ============================================
echo   PPA Attendance Server Info
echo ============================================
echo.
echo   Server:   !SERVER_STATUS!
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
echo   Note: Use HTTPS for camera/QR scanning.
echo ============================================
echo.

echo https://%IP%:3000| clip
echo [Network URL copied to clipboard]
echo.
pause
