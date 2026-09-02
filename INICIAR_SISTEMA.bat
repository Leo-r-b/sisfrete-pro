@echo off
title SisFrete PRO - Servidor Local
color 0A
echo ========================================================
echo        SISFRETE PRO - INICIALIZADOR DO SISTEMA LOCAL
echo ========================================================
echo.
echo [1/3] Verificando conexao e banco de dados SQLite local...
cd /d "%~dp0backend"
if not exist "sisfrete.db" (
    echo Criando banco de dados inicial...
    node -e "require('./src/config/database');"
)

echo [2/3] Iniciando Backend API na porta 3001...
start "SisFrete Backend API" cmd /k "npm start"

echo [3/3] Iniciando Frontend React na porta 5173...
cd /d "%~dp0frontend"
start "SisFrete Frontend" cmd /k "npm run dev"

echo.
echo Aguardando inicializacao dos servicos...
timeout /t 3 /nobreak >nul

echo Abrindo SisFrete PRO no seu navegador...
start http://localhost:5173

echo.
echo ========================================================
echo   SISTEMA OPERANDO 100%% LOCAL COM VELOCIDADE MAXIMA!
echo   Acesse: http://localhost:5173
echo   Banco de dados local: backend\sisfrete.db
echo ========================================================
echo.
echo Para encerrar o sistema, basta fechar as janelas pretas que foram abertas.
pause
