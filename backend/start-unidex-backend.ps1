param(
  [string]$ServiceName,
  [switch]$SkipServiceStart,
  [switch]$SkipDatabaseSetup,
  [switch]$SkipNpmStart
)

$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $backendRoot ".env"
$sqlFile = Join-Path $backendRoot "sql\setup-unidex-customer-db.sql"
$mysqlDevRoot = Join-Path $backendRoot "mysql-dev"
$mysqlDevDataDir = Join-Path $mysqlDevRoot "data"
$mysqlDevLogsDir = Join-Path $mysqlDevRoot "logs"
$mysqlDevConfigFile = Join-Path $mysqlDevRoot "my.ini"
$mysqlDevInitMarker = Join-Path $mysqlDevRoot ".initialized"

function Write-Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Read-EnvFile {
  param([string]$Path)

  $values = @{}

  foreach ($line in Get-Content -Path $Path) {
    $trimmed = $line.Trim()

    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    $parts = $trimmed -split "=", 2

    if ($parts.Count -ne 2) {
      continue
    }

    $values[$parts[0].Trim()] = $parts[1].Trim()
  }

  return $values
}

function Resolve-MySqlService {
  param([string]$PreferredServiceName)

  if ($PreferredServiceName) {
    return Get-Service -Name $PreferredServiceName -ErrorAction Stop
  }

  $services = Get-Service | Where-Object {
    $_.Name -match "mysql|maria" -or $_.DisplayName -match "MySQL|MariaDB"
  } | Sort-Object @{ Expression = { $_.Status -eq "Running" }; Descending = $true }, Name

  if ($services) {
    return $services[0]
  }

  return $null
}

function Resolve-MySqlClient {
  $command = Get-Command mysql.exe -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  $commonPaths = @(
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.3\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MariaDB 11.4\bin\mysql.exe",
    "C:\Program Files\MariaDB 11.3\bin\mysql.exe",
    "C:\Program Files\MariaDB 11.2\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe"
  )

  foreach ($path in $commonPaths) {
    if (Test-Path $path) {
      return $path
    }
  }

  if (Test-Path "C:\Program Files\MySQL") {
    $discovered = Get-ChildItem -Path "C:\Program Files\MySQL" -Filter mysql.exe -Recurse -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty FullName

    if ($discovered) {
      return $discovered
    }
  }

  return $null
}

function Resolve-MySqlServerBinary {
  $command = Get-Command mysqld.exe -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  $commonPaths = @(
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysqld.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe",
    "C:\Program Files\MySQL\MySQL Server 8.3\bin\mysqld.exe",
    "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysqld.exe",
    "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysqld.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe",
    "C:\Program Files\MariaDB 11.4\bin\mysqld.exe",
    "C:\Program Files\MariaDB 11.3\bin\mysqld.exe",
    "C:\Program Files\MariaDB 11.2\bin\mysqld.exe",
    "C:\xampp\mysql\bin\mysqld.exe"
  )

  foreach ($path in $commonPaths) {
    if (Test-Path $path) {
      return $path
    }
  }

  if (Test-Path "C:\Program Files\MySQL") {
    $discovered = Get-ChildItem -Path "C:\Program Files\MySQL" -Filter mysqld.exe -Recurse -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty FullName

    if ($discovered) {
      return $discovered
    }
  }

  return $null
}

function Test-TcpPort {
  param(
    [string]$HostName,
    [int]$Port,
    [int]$TimeoutMs = 1000
  )

  $client = New-Object System.Net.Sockets.TcpClient

  try {
    $asyncResult = $client.BeginConnect($HostName, $Port, $null, $null)

    if (-not $asyncResult.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      return $false
    }

    $client.EndConnect($asyncResult) | Out-Null
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Ensure-Directory {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Convert-ToMySqlPath {
  param([string]$Path)

  return $Path.Replace("\", "/")
}

function Ensure-MySqlDevConfig {
  param([string]$MySqlBaseDir)

  Ensure-Directory -Path $mysqlDevRoot
  Ensure-Directory -Path $mysqlDevDataDir
  Ensure-Directory -Path $mysqlDevLogsDir

  $configContent = @"
[mysqld]
basedir=$(Convert-ToMySqlPath $MySqlBaseDir)
datadir=$(Convert-ToMySqlPath $mysqlDevDataDir)
port=$dbPort
bind-address=127.0.0.1
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
log-error=$(Convert-ToMySqlPath (Join-Path $mysqlDevLogsDir "mysql-error.log"))
general_log=0

[client]
protocol=TCP
port=$dbPort
"@

  Set-Content -Path $mysqlDevConfigFile -Value $configContent -Encoding ASCII
}

function Initialize-MySqlDevInstance {
  param([string]$MysqldPath)

  $systemSchemaPath = Join-Path $mysqlDevDataDir "mysql"
  $existingEntries = Get-ChildItem -Path $mysqlDevDataDir -Force -ErrorAction SilentlyContinue

  if ((Test-Path $systemSchemaPath) -and (Test-Path $mysqlDevInitMarker)) {
    return
  }

  if ($existingEntries) {
    Write-Host "Cleaning incomplete MySQL data directory before initialization..." -ForegroundColor Yellow
    Remove-Item -Path (Join-Path $mysqlDevDataDir "*") -Recurse -Force -ErrorAction SilentlyContinue
  }

  Write-Host "Initializing local MySQL data directory..." -ForegroundColor Yellow

  & $MysqldPath "--defaults-file=$mysqlDevConfigFile" "--initialize-insecure" "--console"

  if ($LASTEXITCODE -ne 0) {
    throw "MySQL initialization failed."
  }

  Set-Content -Path $mysqlDevInitMarker -Value (Get-Date).ToString("s") -Encoding ASCII
  Write-Host "Local MySQL data directory initialized." -ForegroundColor Green
}

function Start-MySqlDevInstance {
  param([string]$MysqldPath)

  $probeHost = if ($dbHost -eq "localhost") { "127.0.0.1" } else { $dbHost }

  if (Test-TcpPort -HostName $probeHost -Port ([int]$dbPort)) {
    Write-Host "MySQL port $dbPort is already accepting connections." -ForegroundColor Green
    return
  }

  Write-Host "Starting local MySQL development instance..." -ForegroundColor Yellow

  $startCommand = "& '$MysqldPath' --defaults-file='$mysqlDevConfigFile' --console"
  $process = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    $startCommand
  ) -PassThru

  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1

    if (Test-TcpPort -HostName $probeHost -Port ([int]$dbPort)) {
      Write-Host "Local MySQL development instance is running." -ForegroundColor Green
      return
    }

    if ($process.HasExited) {
      break
    }
  }

  throw "MySQL started process $($process.Id) but port $dbPort never became ready."
}

if (-not (Test-Path $envFile)) {
  throw "Missing .env file at $envFile"
}

$settings = Read-EnvFile -Path $envFile
$dbHost = if ($settings.ContainsKey("DB_HOST")) { $settings["DB_HOST"] } else { "localhost" }
$dbPort = if ($settings.ContainsKey("DB_PORT")) { $settings["DB_PORT"] } else { "3306" }
$dbUser = if ($settings.ContainsKey("DB_USER")) { $settings["DB_USER"] } else { "root" }
$dbPassword = if ($settings.ContainsKey("DB_PASSWORD")) { $settings["DB_PASSWORD"] } else { "" }
$dbName = if ($settings.ContainsKey("DB_NAME")) { $settings["DB_NAME"] } else { "unidex_customer_db" }
$dbPasswordWasPlaceholder = $dbPassword -eq "CHANGE_THIS_TO_YOUR_MYSQL_ROOT_PASSWORD" -or $dbPassword -eq "your_mysql_password"

if (-not $SkipDatabaseSetup -and -not (Test-Path $sqlFile)) {
  throw "Missing SQL setup file at $sqlFile"
}

if ($dbPasswordWasPlaceholder) {
  Write-Host "DB_PASSWORD placeholder detected; using blank password for local development." -ForegroundColor Yellow
  $dbPassword = ""
}

if (-not $SkipServiceStart) {
  Write-Step "Checking MySQL service"
  $service = Resolve-MySqlService -PreferredServiceName $ServiceName

  if ($null -eq $service) {
    Write-Host "No MySQL/MariaDB Windows service was found automatically." -ForegroundColor Yellow
    Write-Host "Skipping service start. If MySQL is already running, setup can still continue." -ForegroundColor Yellow
  } elseif ($service.Status -ne "Running") {
    Write-Host "Starting service: $($service.Name)" -ForegroundColor Yellow
    Start-Service -Name $service.Name
    $service.WaitForStatus("Running", (New-TimeSpan -Seconds 20))
    Write-Host "Service is running." -ForegroundColor Green
  } else {
    Write-Host "Service already running: $($service.Name)" -ForegroundColor Green
  }

  if ($null -eq $service) {
    $mysqldPath = Resolve-MySqlServerBinary

    if (-not $mysqldPath) {
      throw "mysqld.exe was not found. Install MySQL Server first."
    }

    Ensure-MySqlDevConfig -MySqlBaseDir (Split-Path -Parent (Split-Path -Parent $mysqldPath))
    Initialize-MySqlDevInstance -MysqldPath $mysqldPath
    Start-MySqlDevInstance -MysqldPath $mysqldPath
  }
}

if (-not $SkipDatabaseSetup) {
  Write-Step "Setting up database"
  $mysqlClient = Resolve-MySqlClient

  if (-not $mysqlClient) {
    throw "mysql.exe was not found. Install MySQL Server client tools or add mysql.exe to PATH."
  }

  $mysqlArgs = @(
    "--protocol=TCP",
    "--host=$dbHost",
    "--port=$dbPort",
    "--user=$dbUser",
    "--default-character-set=utf8mb4"
  )

  if ($dbPassword) {
    $mysqlArgs += "--password=$dbPassword"
  }

  Get-Content -Path $sqlFile -Raw | & $mysqlClient @mysqlArgs

  if ($LASTEXITCODE -ne 0) {
    throw "MySQL setup failed while applying $sqlFile"
  }

  Write-Host "Database ready: $dbName" -ForegroundColor Green
}

if (-not $SkipNpmStart) {
  Write-Step "Starting Unidex backend"
  Set-Location $backendRoot
  & npm.cmd run dev
}
