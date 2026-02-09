@echo off
REM ============================================
REM  PPA Attendance Server - Install Auto-Start
REM ============================================
REM  This script creates a Windows Scheduled Task
REM  that runs the server at Windows startup.
REM ============================================

echo.
echo ============================================
echo  PPA Attendance Server - Install Auto-Start
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

set "PROJECT_DIR=%~dp0"
set "TASK_NAME=PPA_Attendance_Server"

REM Remove existing task if present
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

REM Create the scheduled task to run at system startup
schtasks /create /tn "%TASK_NAME%" /tr "\"%PROJECT_DIR%AUTO-START.bat\"" /sc onstart /ru SYSTEM /rl HIGHEST /f

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! The PPA Attendance Server will now:
    echo   - Start automatically when Windows boots
    echo   - Run in the background
    echo   - Be available at http://localhost:3000
    echo.
    echo To access from other computers on your network,
    echo use your computer's IP address (e.g., http://192.168.x.x:3000)
    echo.
    echo To REMOVE auto-start, run: UNINSTALL-AUTO-START.bat
    echo.
) else (
    echo.
    echo ERROR: Failed to create scheduled task.
    echo Please try running this script as Administrator.
    echo.
)

pause
