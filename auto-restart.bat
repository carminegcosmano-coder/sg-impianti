@echo off
cd "C:\Users\utente\sg-impianti"

:LOOP
echo Controllo se SG Impianti e' acceso...
ping localhost -n 2 >nul
netstat -ano | find "3000" >nul
if errorlevel 1 (
  echo Server spento. Lo accendo...
  start /min cmd /c "npm start"
  timeout /t 20 >nul
)
timeout /t 10 >nul
goto LOOP
