param(
  [Parameter(Mandatory = $true)]
  [string] $InputFile
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL must be set. No credentials are stored in this script."
}

if (-not (Test-Path -LiteralPath $InputFile)) {
  throw "Backup file not found: $InputFile"
}

pg_restore --clean --if-exists --no-owner --no-privileges --dbname $env:DATABASE_URL $InputFile
Write-Host "Restore completed from $InputFile"

