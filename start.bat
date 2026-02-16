@echo off
title CCFM-Bot
echo.
echo   ╔═══════════════════════════════════════╗
echo   ║          CCFM-Bot Starting...         ║
echo   ╚═══════════════════════════════════════╝
echo.

:: Check .env
if not exist ".env" (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env
    echo [INFO] Please edit .env with your API keys, then restart.
    echo.
    notepad .env
    pause
    exit /b
)

:: Check node_modules
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call pnpm install
    echo.
)

:: Start server
echo [INFO] Starting CCFM-Bot...
echo.
call pnpm --filter @ccfm/core dev
pause
