@echo off
chcp 65001 > nul
title Song Khoe Moi Ngay Cung Hong Thinh - Khoi Dong Website

echo ======================================================================
echo      WEBSITE: SONG KHOE MOI NGAY CUNG HONG THINH
echo ======================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] May tinh chua cai dat Node.js.
    echo Vui long tai va cai dat Node.js LTS tai: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Dang cai dat cac goi thu vien can thiet lan dau...
    call npm install
)

if not exist ".env" (
    copy ".env.example" ".env" > nul
    echo Da tao file .env tu .env.example. Hay mo file .env de dien GEMINI_API_KEY neu muon bat Tro ly AI.
)

echo.
echo Dang khoi dong may chu website tai http://localhost:3000 ...
start "" "http://localhost:3000"
node server.js
pause
