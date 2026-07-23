param(
  [Parameter(Mandatory = $true)]
  [string] $OutputFile
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL must be set. No credentials are stored in this script."
}

pg_dump --format=custom --no-owner --no-privileges --file $OutputFile $env:DATABASE_URL
Write-Host "Backup written to $OutputFile"

