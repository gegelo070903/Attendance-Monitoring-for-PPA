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

REM Enforce a single startup source to avoid duplicate launch loops
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\enforce-single-autostart.ps1" -ProjectDir "%PROJECT_DIR%" -PrimaryTaskName "%TASK_NAME%"

REM Remove existing task if present
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

REM Create the scheduled task to run at system startup
schtasks /create /tn "%TASK_NAME%" /tr "\"%PROJECT_DIR%AUTO-START.bat\"" /sc onstart /ru SYSTEM /rl HIGHEST /f
set "CREATE_TASK_EXIT=%errorlevel%"

if "%CREATE_TASK_EXIT%"=="0" (
    echo.
    echo SUCCESS! Auto-start was installed and duplicate startup entries were cleaned.
    echo The PPA Attendance Server will now:
    echo   - Start automatically when Windows boots
    echo   - Run in the background
    echo   - Use only Task Scheduler as the startup source
    echo   - Be available at https://localhost:3000
    echo.
    echo To access from other computers on your network,
    echo use your computer's IP address, for example: https://192.168.x.x:3000
    echo If browser shows certificate warning, click Advanced then Proceed.
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
