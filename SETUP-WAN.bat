@echo off
setlocal ENABLEDELAYEDEXPANSION
title PPA Attendance WAN Setup
cd /d "%~dp0"

echo ========================================
echo   PPA Attendance WAN Setup
echo ========================================
echo.

REM Update WAN_IP to your real static public IP (or domain if you adapt this script)
set WAN_IP=119.93.234.50
set WAN_URL=https://%WAN_IP%:3000
set LAN_IP=

if /I "%WAN_IP%"=="REPLACE_WITH_PUBLIC_IP" (
  echo ERROR: Please edit SETUP-WAN.bat and set WAN_IP first.
  echo Example: set WAN_IP=203.0.113.10
  echo.
  goto :end
)

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo WARNING: Not running as Administrator.
  echo Firewall rule creation may fail. Right-click this file and Run as administrator.
  echo.
)

for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet' } | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set LAN_IP=%%i
if "%LAN_IP%"=="" (
  echo ERROR: Could not detect server LAN IP automatically.
  echo Ensure the server is connected to your router, then run this script again.
  echo You can also set LAN_IP manually in this file before running.
  echo.
  goto :end
)

echo [1/4] Preparing .env.local for WAN...
if not exist ".env.local" (
  (
    echo NEXTAUTH_URL=%WAN_URL%
    echo PUBLIC_IP=%WAN_IP%
    echo NEXTAUTH_SECRET=replace-with-strong-secret
  ) > .env.local
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$path='.env.local'; $lines=@(); if (Test-Path $path) { $lines=Get-Content -Path $path }; function SetOrAdd([string]$key,[string]$value){ $script:lines=@($script:lines | Where-Object { $_ -notmatch ('^' + [regex]::Escape($key) + '=') }); $script:lines += ($key + '=' + $value) }; SetOrAdd 'NEXTAUTH_URL' '%WAN_URL%'; SetOrAdd 'PUBLIC_IP' '%WAN_IP%'; if (-not ($lines | Where-Object { $_ -match '^NEXTAUTH_SECRET=' })) { $lines += 'NEXTAUTH_SECRET=replace-with-strong-secret' }; Set-Content -Path $path -Value $lines"
)
echo Done.
echo.

echo [2/4] Regenerating SSL certificate for WAN host...
node generate-cert.js --force
if %errorlevel% neq 0 (
  echo ERROR: Certificate generation failed.
  echo Install OpenSSL for Windows then run this script again.
  echo https://slproweb.com/products/Win32OpenSSL.html
  goto :end
)
echo Done.
echo.

echo [3/4] Ensuring Windows Firewall allows ports 3000 and 3001...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$rules=@('PPA Attendance HTTPS 3000','PPA Attendance HTTP Redirect 3001'); foreach ($r in $rules) { $exists=Get-NetFirewallRule -DisplayName $r -ErrorAction SilentlyContinue; if (-not $exists) { if ($r -like '*3000') { New-NetFirewallRule -DisplayName $r -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null } else { New-NetFirewallRule -DisplayName $r -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow | Out-Null } } }; Get-NetFirewallRule -DisplayName 'PPA Attendance HTTPS 3000','PPA Attendance HTTP Redirect 3001' | Select-Object DisplayName,Enabled,Direction,Action"
if %errorlevel% neq 0 (
  echo WARNING: Could not apply firewall rules automatically.
  echo Run this script as Administrator.
)
echo.

echo [4/4] Router values to configure manually
echo   Forward TCP 3000 -^> %LAN_IP%:3000
echo   Forward TCP 3001 -^> %LAN_IP%:3001
echo.
echo WAN URL: %WAN_URL%
echo.
echo Next: start server with START-SERVER.bat then test from mobile data/WAN.
echo.

:end
pause
endlocal
