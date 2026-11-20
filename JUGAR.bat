@echo off
chcp 65001 >nul
cd /d "%~dp0"
title El Gabinete del Eclipse — Escape Room 3D

echo ============================================================
echo    EL GABINETE DEL ECLIPSE — Escape Room 3D
echo ============================================================
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    echo Iniciando servidor local con Python...
    python server.py
    goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
    echo Iniciando servidor local con Python Launcher...
    py -3 server.py
    goto :eof
)

echo Python no detectado. Abriendo el juego directamente en el navegador...
start "" "index.html"
