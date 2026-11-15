$ErrorActionPreference = 'Stop'
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    throw 'Create the environment first: python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt'
}
$promptedPassword = -not $env:COSMOMEDIC_PASSWORD
if ($promptedPassword) {
    $securePassword = Read-Host 'Choose the local care-team password' -AsSecureString
    $env:COSMOMEDIC_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
}
if (-not $env:COSMOMEDIC_PASSWORD) {
    throw 'A nonempty password is required.'
}
Write-Host 'Dashboard: http://127.0.0.1:8000 | API docs: http://127.0.0.1:8000/docs'
Write-Host 'Select Connect API and sign in with surgeon (or COSMOMEDIC_USERNAME) and the configured password.'
Push-Location $PSScriptRoot
try {
    & $python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
} finally {
    Pop-Location
    if ($promptedPassword) {
        Remove-Item Env:COSMOMEDIC_PASSWORD
    }
}
