$ErrorActionPreference = 'Stop'
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    throw 'Create the environment first: python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt'
}
Write-Host 'Dashboard: http://127.0.0.1:8000 | API docs: http://127.0.0.1:8000/docs'
Write-Host 'Select Connect API to load the bundled fictional data. No local account is required.'
Push-Location $PSScriptRoot
try {
    & $python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
} finally {
    Pop-Location
}
