@echo off
REM This script runs at Windows startup to start the PPA Attendance server in the background

cd /d "c:\Users\johna\Documents\PPA ATTENDANCE\Attendance Monitoring for PPA"
start /min cmd /c "npm run start"
