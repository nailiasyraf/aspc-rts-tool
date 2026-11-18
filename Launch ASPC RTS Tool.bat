@echo off
setlocal
title ASPC RTS Tool - Local Server
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-tool.ps1"
if errorlevel 1 (
    echo.
    echo The tool could not start. Review the message above.
    pause
)
