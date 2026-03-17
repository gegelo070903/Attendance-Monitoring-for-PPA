@echo off
setlocal ENABLEDELAYEDEXPANSION
title PPA Attendance WAN Setup
cd /d "%~dp0"

echo ========================================
echo   PPA Attendance WAN Setup
echo ========================================
echo.

set WAN_IP=119.93.234.50
set WAN_URL=https://%WAN_IP%:3000
set LAN_IP=

for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet' } | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set LAN_IP=%%i
if "%LAN_IP%"=="" set LAN_IP=192.168.1.74

echo [1/4] Preparing .env.local for WAN...
if not exist ".env.local" (
  (
    echo NEXTAUTH_URL=%WAN_URL%
    echo PUBLIC_IP=%WAN_IP%
    echo NEXTAUTH_SECRET=replace-with-strong-secret
  ) > .env.local
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$path='.env.local'; $content=Get-Content -Raw -Path $path; if ($content -notmatch '(?m)^NEXTAUTH_URL=') { Add-Content -Path $path -Value 'NEXTAUTH_URL=%WAN_URL%' }; if ($content -notmatch '(?m)^PUBLIC_IP=') { Add-Content -Path $path -Value 'PUBLIC_IP=%WAN_IP%' }"
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
echo Next: start server with START-SERVER.bat then test from mobile data.
echo.

:end
pause
endlocal
