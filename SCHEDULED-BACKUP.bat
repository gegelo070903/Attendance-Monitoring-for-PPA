@echo off
setlocal enabledelayedexpansion
REM ========================================
REM   PPA Attendance - Silent Scheduled Backup
REM ========================================
REM
REM   This script runs silently (no prompts).
REM   Designed to be used with Windows Task Scheduler
REM   for automatic daily backups WITHOUT needing the
REM   server to be running.
REM
REM   HOW TO SET UP AUTOMATIC BACKUP (every 30 minutes):
REM
REM   1. Press Win+R, type "taskschd.msc", press Enter
REM   2. Click "Create Task" (not Basic Task) on the right
REM   3. General tab:
REM      - Name: "PPA Attendance Auto Backup"
REM      - Check "Run whether user is logged on or not"
REM   4. Triggers tab -> New:
REM      - Begin the task: On a schedule
REM      - Daily, Start: 12:00:00 AM
REM      - Check "Repeat task every: 30 minutes"
REM      - For a duration of: 1 day
REM      - Check "Enabled"
REM   5. Actions tab -> New:
REM      - Action: Start a Program
REM      - Program/script: Browse to this file (SCHEDULED-BACKUP.bat)
REM      - Start in: Enter the project folder path
REM        (e.g. C:\Users\Joshua\Documents\GitHub\Attendance-Monitoring-for-PPA)
REM   6. Click OK, enter your Windows password if prompted
REM
REM   This creates a backup every 30 minutes (48 per day).
REM   Keeps the latest 100 backups (~2 days of history).
REM   If data is lost, you lose at most 30 minutes of work.
REM
REM   Works even if the server is off.
REM ========================================

cd /d "%~dp0"

set DB_FILE=prisma\dev.db
set BACKUP_DIR=backups
set LOG_FILE=backups\backup-log.txt

REM Check if database exists
if not exist "%DB_FILE%" (
    echo [%date% %time%] ERROR: Database file not found >> "%LOG_FILE%"
    exit /b 1
)

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate timestamp
for /f "tokens=2 delims==" %%I in ('"wmic os get localdatetime /value"') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

set BACKUP_FILE=%BACKUP_DIR%\backup_%TIMESTAMP%.db

REM Create backup
copy /Y "%DB_FILE%" "%BACKUP_FILE%" >nul 2>&1

if !errorlevel! == 0 (
    for %%A in ("%BACKUP_FILE%") do set SIZE=%%~zA
    echo [%date% %time%] OK: %BACKUP_FILE% (!SIZE! bytes) >> "%LOG_FILE%"
) else (
    echo [%date% %time%] ERROR: Backup failed >> "%LOG_FILE%"
    exit /b 1
)

REM Auto-cleanup: keep only latest 100 backups (~2 days at every-30-min)
set COUNT=0
for %%F in (%BACKUP_DIR%\backup_*.db) do set /a COUNT+=1

if !COUNT! gtr 100 (
    for /f "skip=100 delims=" %%F in ('dir /b /o-d "%BACKUP_DIR%\backup_*.db"') do (
        del "%BACKUP_DIR%\%%F" >nul 2>&1
        echo [%date% %time%] CLEANUP: Deleted %%F >> "%LOG_FILE%"
    )
)

exit /b 0
