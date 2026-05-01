@echo off
echo Starting backend...
cd backend || exit
start /min cmd /k "npm start"

echo Starting frontend...
cd ../frontend || exit
start /min cmd /k "npm run dev"


@echo off
cd ..
for /f "delims=" %%A in (ascii-icon.txt) do echo(%%A
echo Opening browser...
timeout /t 5
