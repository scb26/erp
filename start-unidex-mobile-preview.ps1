param(
  [string]$BackendServiceName,
  [int]$FrontendPort = 8080,
  [switch]$SkipBackendSetup
)

$ErrorActionPreference = "Stop"

$erpRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $erpRoot "backend"
$backendScript = Join-Path $backendRoot "start-unidex-backend.ps1"

function Resolve-LocalIp {
  $addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
    $_.IPAddress -ne "127.0.0.1" -and
    $_.IPAddress -notlike "169.254*" -and
    $_.PrefixOrigin -ne "WellKnown"
  }

  if ($addresses) {
    return ($addresses | Select-Object -First 1 -ExpandProperty IPAddress)
  }

  return "localhost"
}

function Resolve-PythonCommand {
  if (Get-Command python -ErrorAction SilentlyContinue) {
    return "python"
  }

  if (Get-Command py -ErrorAction SilentlyContinue) {
    return "py"
  }

  return $null
}

if (-not (Test-Path $backendScript)) {
  throw "Missing backend launcher: $backendScript"
}

$pythonCommand = Resolve-PythonCommand

if (-not $pythonCommand) {
  throw "Python was not found. Install Python first to run the frontend HTTP server."
}

$localIp = Resolve-LocalIp

Write-Host ""
Write-Host "Launching Unidex mobile preview..." -ForegroundColor Cyan

$backendCommand = if ($SkipBackendSetup) {
  "Set-Location -LiteralPath '$backendRoot'; npm run dev"
} elseif ($BackendServiceName) {
  "Set-Location -LiteralPath '$backendRoot'; powershell -ExecutionPolicy Bypass -File '.\start-unidex-backend.ps1' -ServiceName '$BackendServiceName'"
} else {
  "Set-Location -LiteralPath '$backendRoot'; powershell -ExecutionPolicy Bypass -File '.\start-unidex-backend.ps1'"
}

$frontendCommand = "Set-Location -LiteralPath '$erpRoot'; $pythonCommand -m http.server $FrontendPort --bind 0.0.0.0"

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", $backendCommand
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", $frontendCommand
)

Write-Host ""
Write-Host "Backend window started." -ForegroundColor Green
Write-Host "Frontend window started." -ForegroundColor Green
Write-Host ""
Write-Host "Open on this PC: http://localhost:$FrontendPort/" -ForegroundColor Yellow
Write-Host "Open on your phone: http://$localIp`:$FrontendPort/" -ForegroundColor Yellow
Write-Host "Backend health: http://$localIp`:4000/health" -ForegroundColor Yellow
