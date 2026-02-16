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

:: Build web UI if not built
if not exist "packages\web\dist\index.html" (
    echo [INFO] Building web UI...
    call pnpm --filter @ccfm/web build
    echo.
)

:: Start server
echo [INFO] Starting CCFM-Bot...
echo [INFO] Web UI: http://127.0.0.1:18790/ui
echo.
call pnpm --filter @ccfm/core dev
pause
