Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c start /min C:\Users\utente\sg-impianti\auto-restart.bat", 0, False
Set WshShell = Nothing

