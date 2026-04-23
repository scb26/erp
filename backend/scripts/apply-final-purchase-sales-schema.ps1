param(
    [string]$MySqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    [string]$Database = "unidex_customer_db",
    [string]$User = "root",
    [string]$Password
)

$scriptPath = Join-Path $PSScriptRoot "..\sql\final-purchase-sales-schema.sql"
$resolvedScriptPath = (Resolve-Path $scriptPath).Path

if (-not (Test-Path $MySqlPath)) {
    Write-Error "MySQL client not found at: $MySqlPath"
    exit 1
}

if (-not (Test-Path $resolvedScriptPath)) {
    Write-Error "Schema file not found at: $resolvedScriptPath"
    exit 1
}

if ($null -eq $Password) {
    $securePassword = Read-Host "Enter MySQL password for user '$User'" -AsSecureString
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
    }
}

$command = "`"$MySqlPath`" -u $User -p`"$Password`" $Database < `"$resolvedScriptPath`""

Write-Host "Applying final purchase-sales schema to database '$Database'..." -ForegroundColor Cyan
cmd /c $command

if ($LASTEXITCODE -ne 0) {
    Write-Error "Schema apply failed."
    exit $LASTEXITCODE
}

Write-Host "Schema applied successfully." -ForegroundColor Green
