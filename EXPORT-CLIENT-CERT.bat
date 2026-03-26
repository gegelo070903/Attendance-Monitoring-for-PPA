@echo off
title Export PPA Client Certificate

echo ========================================
echo   Export Client Certificate (.cer)
echo ========================================
echo.

cd /d "%~dp0"

set "SOURCE=certs\cert.pem"
set "OUTPUT=certs\PPA-Attendance-Client-Trust.cer"

if not exist "%SOURCE%" (
    echo ERROR: Certificate file not found at %SOURCE%
    echo Run START-SERVER.bat once on the server PC first.
    echo.
    pause
    exit /b 1
)

certutil -decode "%SOURCE%" "%OUTPUT%" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Failed to export .cer file from %SOURCE%
    echo.
    pause
    exit /b 1
)

echo Success: Exported client certificate file:
echo   %OUTPUT%
echo.
echo Share this .cer file to client devices, then install it as trusted root.
echo.
pause
