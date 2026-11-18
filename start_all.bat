@echo off
chcp 65001 >nul
title Kinich Solar - Inicio Integral del Sistema

echo ========================================================
echo               KINICH SOLAR - INICIO COMPLETO
echo ========================================================
echo.

:: 1. Detectar IP local Wi-Fi
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0 ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
)

echo [1/3] IP local detectada: %LOCAL_IP%
echo       API escuchando en: http://0.0.0.0:8000
echo.

:: 2. Iniciar Backend FastAPI en ventana independiente
echo [2/3] Levantando Servidor FastAPI (Python)...
start "Kinich Solar - Backend FastAPI" cmd /k "chcp 65001 >nul & title FastAPI Backend & python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: Pausa breve para arranque de BD y API
timeout /t 3 >nul

:: 3. Iniciar Bot de Telegram en ventana independiente
echo [3/3] Conectando Bot de Telegram (@KinichSolarBot)...
start "Kinich Solar - Bot Telegram" cmd /k "chcp 65001 >nul & title Telegram Bot & python -m bot.telegram_bot"

:: 4. Iniciar Expo Bundler para la App Móvil
echo.
echo ========================================================
echo       Iniciando Servidor Metro Expo para Movil...
echo ========================================================
echo Escanea el codigo QR que aparecera a continuacion con Expo Go:
echo.

cd mobile\kinich-solar
npx expo start -c

pause
