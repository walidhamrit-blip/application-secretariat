@echo off
setlocal
cd /d "%~dp0"
echo Installation locale gratuite - Internet requis pour les telechargements.
where node >nul 2>nul
if errorlevel 1 (
 echo Installez Node.js 22 LTS ou plus recent depuis https://nodejs.org puis relancez ce fichier.
 goto :fail
)
where ollama >nul 2>nul
if errorlevel 1 (
 echo Installez Ollama depuis https://ollama.com/download/windows puis relancez ce fichier.
 goto :fail
)
where py >nul 2>nul
if errorlevel 1 (
 echo Installez Python 3.11 ou 3.12 depuis https://www.python.org/downloads/windows/ avec le lanceur py.
 goto :fail
)
call npm ci
if errorlevel 1 goto :fail
if not exist .venv\Scripts\python.exe (
 py -3 -m venv .venv
 if errorlevel 1 goto :fail
)
.venv\Scripts\python.exe -m pip install -r requirements-local.txt
if errorlevel 1 goto :fail
echo Ollama doit etre ouvert. Telechargement du modele de conversation...
ollama pull qwen2.5:3b
if errorlevel 1 goto :fail
echo Telechargement du modele vocal multilingue Whisper...
.venv\Scripts\python.exe scripts\transcribe.py --download
if errorlevel 1 goto :fail
echo Installation terminee. Lancez demarrer-local.bat.
pause
exit /b 0
:fail
echo Installation incomplete. Corrigez le message ci-dessus, puis relancez installer-local.bat.
pause
exit /b 1
