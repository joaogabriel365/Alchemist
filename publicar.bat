@echo off
chcp 65001 >nul
REM ============================================================
REM  Coloca o site no ar com um link publico temporario.
REM  - Servidor de producao (waitress) na porta 8000
REM  - Tunel gratis do localhost.run (funciona na rede da FIAP)
REM  O site fica no ar enquanto as duas janelas estiverem abertas.
REM  O link publico aparece na janela "Tunel" (termina em .lhr.life)
REM ============================================================
cd /d "%~dp0"

start "Servidor ALCHEMIST (waitress)" cmd /k ".venv\Scripts\waitress-serve.exe --listen=127.0.0.1:8000 wsgi:app"

timeout /t 3 /nobreak >nul

start "Tunel (link publico)" cmd /k "ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -R 80:127.0.0.1:8000 nokey@localhost.run"

echo.
echo Duas janelas foram abertas:
echo   1) Servidor ALCHEMIST (waitress)
echo   2) Tunel - procure o link que termina em .lhr.life
echo.
echo Para tirar o site do ar, feche as duas janelas.
echo.
pause
