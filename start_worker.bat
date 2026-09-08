@echo off
title IntIm Worker Node
echo ======================================================
echo           IntIm Worker Node Join Script
echo ======================================================
set /p MASTER_IP="Enter Master IP:Port (Press ENTER for localhost:8080): "
if "%MASTER_IP%"=="" set MASTER_IP=localhost:8080

echo Connecting to http://%MASTER_IP%...
python worker.py %MASTER_IP%
pause
