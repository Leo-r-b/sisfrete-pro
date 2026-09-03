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
echo.
echo ========================================================
echo        CONCLUIDO! O CODIGO JA ESTA NO GITHUB!
echo ========================================================
pause
