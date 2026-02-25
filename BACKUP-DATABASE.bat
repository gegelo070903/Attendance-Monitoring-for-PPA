@echo off
title PPA Attendance - Database Backup
echo ========================================
echo   PPA Attendance - Database Backup
echo ========================================
echo.

cd /d "%~dp0"

set DB_FILE=prisma\dev.db
set BACKUP_DIR=backups

REM Check if database exists
if not exist "%DB_FILE%" (
    echo ERROR: Database file not found at %DB_FILE%
    echo Make sure you are running this from the project folder.
    pause
    exit /b 1
)

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo Created backup directory: %BACKUP_DIR%
)

REM Generate timestamp for filename
for /f "tokens=2 delims==" %%I in ('"wmic os get localdatetime /value"') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

set BACKUP_FILE=%BACKUP_DIR%\backup_%TIMESTAMP%.db

echo Creating backup...
echo   Source: %DB_FILE%
echo   Target: %BACKUP_FILE%
echo.

copy /Y "%DB_FILE%" "%BACKUP_FILE%" >nul

if %errorlevel% == 0 (
    echo ========================================
    echo   Backup created successfully!
    echo ========================================
    echo.
    echo   File: %BACKUP_FILE%
    
    REM Show file size
    for %%A in ("%BACKUP_FILE%") do (
        set SIZE=%%~zA
    )
    echo   Size: %SIZE% bytes
    echo.
    
    REM Count total backups
    set COUNT=0
    for %%F in (%BACKUP_DIR%\backup_*.db) do set /a COUNT+=1
    echo   Total backups: %COUNT%
    echo.
    
    REM Auto-cleanup: keep only latest 20 backups
    if %COUNT% gtr 20 (
        echo Cleaning up old backups (keeping latest 20^)...
        set /a TO_DELETE=%COUNT%-20
        for /f "skip=20 delims=" %%F in ('dir /b /o-d "%BACKUP_DIR%\backup_*.db"') do (
            del "%BACKUP_DIR%\%%F"
            echo   Deleted: %%F
        )
        echo.
    )
    
    echo ========================================
    echo   Done! Your data is safe.
    echo ========================================
) else (
    echo ========================================
    echo   ERROR: Backup failed!
    echo ========================================
    echo   Please check disk space and permissions.
)

echo.
pause
