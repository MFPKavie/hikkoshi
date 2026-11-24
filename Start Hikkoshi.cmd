@echo off
cd /d "%~dp0"
"%~dp0node.exe" "%~dp0server.mjs" --open
if errorlevel 1 pause
