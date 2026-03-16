@echo off
title Trust PPA SSL Certificate

echo ========================================
echo   Trust PPA SSL Certificate (Client PC)
echo ========================================
echo.

cd /d "%~dp0"

if not exist "certs\cert.pem" (
    echo ERROR: Certificate file not found at certs\cert.pem
    echo Run START-SERVER.bat once on the server folder first.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\trust-cert.ps1" -CertPath "%~dp0certs\cert.pem"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Could not trust the certificate automatically.
    echo Try running this file as Administrator.
    echo.
    pause
    exit /b 1
)

echo.
echo Success: Certificate is trusted for this Windows user.
echo You can now open the scanner using HTTPS and allow camera access.
echo.
pause
