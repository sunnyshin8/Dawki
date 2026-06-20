@echo off
REM ── Dawki Platform Startup Script (Windows) ──────────────────────────────────
REM Starts FastAPI backend and Next.js frontend in separate windows.
REM Run from the Phase2 root directory.

echo.
echo  ██████╗  █████╗ ██╗    ██╗██╗  ██╗██╗
echo  ██╔══██╗██╔══██╗██║    ██║██║ ██╔╝██║
echo  ██║  ██║███████║██║ █╗ ██║█████╔╝ ██║
echo  ██║  ██║██╔══██║██║███╗██║██╔═██╗ ██║
echo  ██████╔╝██║  ██║╚███╔███╔╝██║  ██╗██║
echo  ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝
echo.
echo  Traffic Intelligence Platform
echo  ─────────────────────────────────────────────
echo.

REM ─── Load .env variables ──────────────────────────────────────────────────
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if not "%%A"=="" if not "%%A:~0,1%"=="#" (
            set "%%A=%%B"
        )
    )
    echo  [OK] .env loaded
) else (
    echo  [WARN] .env not found : copy .env.example to .env and fill in keys
)

echo.
echo  Starting Backend  ^(FastAPI on port 8001^)...
start "Dawki Backend" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn backend.app:app --host 0.0.0.0 --port 8001 --reload"

echo  Waiting 4 seconds for backend to initialize...
timeout /t 4 /nobreak

echo  Starting Frontend ^(Next.js on port 3000^)...
start "Dawki Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  ─────────────────────────────────────────────
echo  Backend  : http://localhost:8001
echo  API Docs  : http://localhost:8001/docs
echo  Frontend  : http://localhost:3000
echo  ─────────────────────────────────────────────
echo.
echo  Press any key to close this launcher window.
echo  (Backend and Frontend windows will keep running.)
pause
