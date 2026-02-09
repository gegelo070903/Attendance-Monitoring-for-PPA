@echo off
REM ============================================
REM  PPA Attendance Server - Remove Auto-Start
REM ============================================

echo.
echo ============================================
echo  PPA Attendance Server - Remove Auto-Start
echo ============================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Please right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

set "TASK_NAME=PPA_Attendance_Server"

REM Delete the scheduled task
schtasks /delete /tn "%TASK_NAME%" /f

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! Auto-start has been removed.
    echo The server will no longer start automatically.
    echo.
    echo You can still start it manually using START-SERVER.bat
    echo.
) else (
    echo.
    echo NOTE: Auto-start task was not found or already removed.
    echo.
)

pause
