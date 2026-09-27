#requires -version 5.1
<#
.SYNOPSIS
  Drops and recreates the local TicketPortal demo database, then reseeds it on next API start.

.DESCRIPTION
  RBAC Amendment v3 / Chunk 1 task 5. Two hard safety checks before anything is dropped:
    1. Refuses to run if ASPNETCORE_ENVIRONMENT is explicitly set to anything other than
       "Development" — this script is a demo/dev convenience, never a migration tool for a
       real environment.
    2. Refuses to run unless the configured connection string is a LocalDB connection
       (contains "(localdb)") — this can never be pointed at a shared or production database,
       even by an environment-variable override, without editing this script.
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiProject = Join-Path $repoRoot 'apps/api/TicketPortal.Api.csproj'
$appSettingsPath = Join-Path $repoRoot 'apps/api/appsettings.json'

$environment = $env:ASPNETCORE_ENVIRONMENT
if ($environment -and $environment -ne 'Development') {
    Write-Error "ASPNETCORE_ENVIRONMENT is '$environment' — this script only runs against Development. Aborting."
    exit 1
}

if (-not (Test-Path $appSettingsPath)) {
    Write-Error "Could not find $appSettingsPath — run this script from the repo (scripts/reset-demo-db.ps1)."
    exit 1
}

$settings = Get-Content $appSettingsPath -Raw | ConvertFrom-Json
$connectionString = $settings.ConnectionStrings.DefaultConnection

if (-not $connectionString -or $connectionString -notmatch '(?i)\(localdb\)') {
    Write-Error "DefaultConnection does not look like a LocalDB connection string. Refusing to drop a database that might not be your local demo copy."
    exit 1
}

Write-Host "Dropping database using connection: $connectionString"
Write-Host "(Press Ctrl+C now to cancel — this permanently deletes all local demo data.)"
Start-Sleep -Seconds 3

Push-Location (Join-Path $repoRoot 'apps/api')
try {
    dotnet ef database drop --force --project $apiProject --startup-project $apiProject
    if ($LASTEXITCODE -ne 0) {
        Write-Error "dotnet ef database drop failed (exit code $LASTEXITCODE)."
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Database dropped. Start the API ('npx nx run api:serve') — it will recreate the" -ForegroundColor Green
Write-Host "database, apply migrations, and reseed every demo account listed in DEMO_ACCOUNTS.md." -ForegroundColor Green
