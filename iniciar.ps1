$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\services\logs-api'; php artisan serve --port=8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\services\analyzer-api'; .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\services\tasks-api'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; py -3 -m http.server 5173"

Write-Host "Frontend: http://localhost:5173"
