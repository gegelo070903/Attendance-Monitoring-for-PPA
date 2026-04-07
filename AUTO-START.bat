@echo off
setlocal EnableDelayedExpansion
if /i "%~1"=="--monitor-status" goto monitor_status
REM ============================================
REM  PPA Attendance Server - Auto Start Script
REM ============================================
REM  This script starts the server and auto-restarts
REM  if it crashes. Run at Windows startup for 24/7 operation.
REM ============================================

title PPA Attendance Server

cd /d "%~dp0"

set "STATUS_DIR=%~dp0logs"
set "STATUS_FILE=%STATUS_DIR%\auto-start-status.txt"
if not exist "%STATUS_DIR%" mkdir "%STATUS_DIR%" >nul 2>&1
>"%STATUS_FILE%" echo [%date% %time%] INITIALIZING - startup checks are running

REM Prevent multiple AUTO-START instances from fighting over ports
set "LOCK_ROOT=%ProgramData%\PPA-Attendance"
set "LOCK_DIR=%LOCK_ROOT%\auto-start.lock"
if not exist "%LOCK_ROOT%" mkdir "%LOCK_ROOT%" >nul 2>&1
2>nul mkdir "%LOCK_DIR%"
if errorlevel 1 (
    set "INFO_ONLY=1"
)

REM Recover stale lock folders left after abrupt shutdowns.
if defined INFO_ONLY (
    set "ACTIVE_AUTO_START=0"
    for /f %%A in ('powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \"Name = 'cmd.exe' and CommandLine like '%%AUTO-START.bat%%' and CommandLine not like '%%--monitor-status%%'\").Count"') do set "ACTIVE_AUTO_START=%%A"
    if not defined ACTIVE_AUTO_START set "ACTIVE_AUTO_START=1"
    if !ACTIVE_AUTO_START! LEQ 1 (
        rmdir "%LOCK_DIR%" >nul 2>&1
        2>nul mkdir "%LOCK_DIR%"
        if !errorlevel! equ 0 (
            set "INFO_ONLY="
            >"%STATUS_FILE%" echo [%date% %time%] STARTING - stale lock recovered automatically
            echo Stale auto-start lock was detected and recovered.
        )
    )
)

REM Verify required runtime tools are available before entering restart loop
where node >nul 2>&1
if %errorlevel% neq 0 (
    >"%STATUS_FILE%" echo [%date% %time%] ERROR - Node.js not found in PATH
    echo ERROR: Node.js is not installed or not in PATH.
    echo Install Node.js 18+ from https://nodejs.org and restart Windows.
    goto cleanup_error
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    >"%STATUS_FILE%" echo [%date% %time%] ERROR - npm not found in PATH
    echo ERROR: npm is not available in PATH.
    echo Reinstall Node.js and restart Windows.
    goto cleanup_error
)

REM Production start requires .next\BUILD_ID (a plain .next folder is not enough)
if not exist ".next\BUILD_ID" (
    >"%STATUS_FILE%" echo [%date% %time%] STARTING - production build is being created
    echo Production build not found - building app...
    echo This may take a few minutes...
    call npm run build
    if %errorlevel% neq 0 (
        >"%STATUS_FILE%" echo [%date% %time%] ERROR - npm run build failed
        echo ERROR: Build failed. Auto-start cannot continue.
        goto cleanup_error
    )
    >"%STATUS_FILE%" echo [%date% %time%] STARTING - build complete, continuing startup
    echo Build complete!
)

REM Ensure SSL certificate exists and is trusted for current user
node generate-cert.js
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\trust-cert.ps1" -CertPath "%~dp0certs\cert.pem"
if %errorlevel% neq 0 (
    echo WARNING: Could not trust SSL certificate automatically.
    echo Camera may be blocked until cert is trusted manually.
)

:prepare_info
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
echo ============================================
echo   PPA Attendance Server Starting
echo ============================================
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
echo   Share the Network URL with employees.
echo   The system is accessible only after this line appears:
echo   ^> HTTPS server ready on https://0.0.0.0:3000
echo   Expected warm-up after startup/restart: 1-3 minutes.
echo   Live startup status file:
echo   %STATUS_FILE%
echo   Browser may show certificate warning.
echo   Click Advanced then Proceed.
echo   Server will auto-restart if it stops.
echo ============================================
echo.

if defined INFO_ONLY (
    echo Another AUTO-START instance is already running.
    echo This window is info-only and will not start a second server.
    echo Check current status here:
    echo   %STATUS_FILE%
    echo.
    echo If the server is not really running, remove this lock folder and relaunch:
    echo   %LOCK_DIR%
    echo.
    pause
    exit /b 0
)

start "PPA Startup Status" /min cmd /c ""%~f0" --monitor-status"

:startserver
>"%STATUS_FILE%" echo [%date% %time%] STARTING - launching server process
echo [%date% %time%] Starting server...
call npm run ports:free
if %errorlevel% neq 0 (
    >"%STATUS_FILE%" echo [%date% %time%] WARNING - could not free ports 3000/3001
    echo [%date% %time%] WARNING: Could not free ports 3000/3001.
    echo Another Node.js service may be using the ports.
)

set NODE_ENV=production
node server.js
set "SERVER_EXIT=%errorlevel%"

REM If server stops, wait 5 seconds and restart
>"%STATUS_FILE%" echo [%date% %time%] STOPPED - server process exited with code %SERVER_EXIT%
echo.
echo [%date% %time%] node server.js exited with code %SERVER_EXIT%.
echo [%date% %time%] Server stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto startserver

:cleanup_error
rmdir "%LOCK_DIR%" >nul 2>&1
exit /b 1

:monitor_status
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set "STATUS_DIR=%~dp0logs"
set "STATUS_FILE=%STATUS_DIR%\auto-start-status.txt"
if not exist "%STATUS_DIR%" mkdir "%STATUS_DIR%" >nul 2>&1

:monitor_loop
set "HEALTH_STATE=NOT READY"
set "HTTP_STATUS="

where curl >nul 2>&1
if !errorlevel! equ 0 (
    for /f %%H in ('curl.exe -k -s -o nul -w "%%{http_code}" https://localhost:3000/api/health') do set "HTTP_STATUS=%%H"
    if "!HTTP_STATUS!"=="200" set "HEALTH_STATE=READY"
) else (
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
        set "HEALTH_STATE=STARTING"
        goto monitor_write
    )
)

:monitor_write
if "!HEALTH_STATE!"=="READY" >"%STATUS_FILE%" echo [%date% %time%] READY - site is reachable at https://localhost:3000
if "!HEALTH_STATE!"=="STARTING" >"%STATUS_FILE%" echo [%date% %time%] STARTING - port 3000 is listening, app warm-up still in progress
if "!HEALTH_STATE!"=="NOT READY" >"%STATUS_FILE%" echo [%date% %time%] NOT READY - site cannot be reached yet

timeout /t 10 /nobreak >nul
goto monitor_loop
