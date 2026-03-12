@echo off
setlocal enabledelayedexpansion
title PPA Attendance - Restore Database
echo ========================================
echo   PPA Attendance - Database Restore
echo ========================================
echo.
echo   This tool works even if the server is
echo   NOT running. No internet required.
echo.
echo   WARNING: Restoring will REPLACE the
echo   current database with the backup copy.
echo.

cd /d "%~dp0"

set DB_FILE=prisma\dev.db
set BACKUP_DIR=backups

REM ========================================
echo   Where is the backup file?
echo.
echo   [1] From the backups folder (local)
echo   [2] From a USB drive / external path
echo.
set /p SOURCE="   Enter choice (1 or 2): "

if "%SOURCE%"=="1" (
    echo.

    if not exist "%BACKUP_DIR%\*.db" (
        echo   No backup files found in %BACKUP_DIR%\
        echo.
        pause
        exit /b 1
    )

    echo   Available backups:
    echo   ----------------------------------------
    set N=0
    for /f "delims=" %%F in ('dir /b /o-d "%BACKUP_DIR%\*.db"') do (
        set /a N+=1
        set "BFILE_!N!=%%F"
        for %%A in ("%BACKUP_DIR%\%%F") do (
            set FSIZE=%%~zA
        )
        echo   [!N!] %%F  (!FSIZE! bytes^)
    )
    echo   ----------------------------------------
    echo.
    set /p PICK="   Enter number to restore: "

    if not defined PICK (
        echo   No selection made. Cancelled.
        pause
        exit /b 0
    )

    set "RESTORE_FILE=%BACKUP_DIR%\!BFILE_%PICK%!"

    if not exist "!RESTORE_FILE!" (
        echo   Invalid selection. File not found.
        pause
        exit /b 1
    )
) else if "%SOURCE%"=="2" (
    echo.
    echo   Enter the full path to the backup file.
    echo   Example: D:\PPA-Backups\backup_2026-03-12_10-30-00.db
    echo.
    set /p RESTORE_FILE="   Path: "

    if not defined RESTORE_FILE (
        echo   No path entered. Cancelled.
        pause
        exit /b 0
    )

    if not exist "!RESTORE_FILE!" (
        echo.
        echo   ERROR: File not found: !RESTORE_FILE!
        echo   Make sure the drive is connected and the path is correct.
        pause
        exit /b 1
    )
) else (
    echo   Invalid choice. Cancelled.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   CONFIRM RESTORE
echo ========================================
echo.
echo   Restore from: !RESTORE_FILE!
echo.
echo   This will REPLACE the current database.
echo   A safety backup of the current database
echo   will be created first.
echo.
set /p CONFIRM="   Type YES to confirm: "

if /i not "%CONFIRM%"=="YES" (
    echo.
    echo   Restore cancelled.
    pause
    exit /b 0
)

REM Create safety backup first
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

if exist "%DB_FILE%" (
    for /f "tokens=2 delims==" %%I in ('"wmic os get localdatetime /value"') do set datetime=%%I
    set SAFESTAMP=!datetime:~0,4!-!datetime:~4,2!-!datetime:~6,2!_!datetime:~8,2!-!datetime:~10,2!-!datetime:~12,2!
    set SAFETY=%BACKUP_DIR%\pre-restore_!SAFESTAMP!.db
    copy /Y "%DB_FILE%" "!SAFETY!" >nul
    echo.
    echo   Safety backup saved: !SAFETY!
)

REM Restore
copy /Y "!RESTORE_FILE!" "%DB_FILE%" >nul

if !errorlevel! == 0 (
    echo.
    echo ========================================
    echo   Database restored successfully!
    echo ========================================
    echo.
    echo   If the server is running, restart it
    echo   for changes to take effect.
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR: Restore failed!
    echo ========================================
    echo   The safety backup is still available.
)

pause
