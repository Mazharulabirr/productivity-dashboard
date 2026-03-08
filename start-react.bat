@echo off
cd /d "%~dp0react-app"
echo Starting React Dashboard...
echo Opening http://localhost:5173 ...
start "" "http://localhost:5173"
timeout /t 2 /nobreak >nul
npm run dev -- --port 5173
pause
