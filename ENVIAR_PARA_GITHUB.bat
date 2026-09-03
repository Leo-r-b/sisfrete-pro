@echo off
title Enviando SisFrete PRO para o GitHub
color 0B
echo ========================================================
echo        ENVIANDO CODIGO PARA O GITHUB (Leo-r-b)
echo ========================================================
echo.
cd /d "%~dp0"
git branch -M main
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo        SUCESSO! O CODIGO JA ESTA NO SEU GITHUB!
    echo ========================================================
    echo Agora o Render vai compilar e subir automaticamente!
) else (
    echo.
    echo ========================================================
    echo        ATENCAO: O REPOSITORIO NAO FOI ENCONTRADO NO GITHUB!
    echo ========================================================
    echo 1. Abra o link: https://github.com/new
    echo 2. Crie um repositorio chamado: sisfrete-pro
    echo 3. Depois de criar, execute este arquivo novamente!
    echo ========================================================
)
echo.
pause
