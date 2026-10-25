@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto :missing
if not exist node_modules goto :missing
echo Ouvrez Ollama et laissez cette fenetre ouverte.
echo Le site sera disponible sur http://localhost:3000
echo Si le navigateur s'ouvre trop tot, attendez puis actualisez.
start "" http://localhost:3000
call npm start
pause
exit /b
:missing
echo Lancez d'abord installer-local.bat. Node.js est requis.
pause
exit /b 1
