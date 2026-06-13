param(
    [string] $HostName = "localhost",
    [int] $Port = 5432,
    [string] $Database = "Qrave",
    [string] $User = "postgres",
    [string] $Password = "",
    [switch] $Seed
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$DatabaseName = $Database.ToLowerInvariant()
$env:PGPASSWORD = $Password

function Test-Psql {
    $command = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "psql was not found. Install PostgreSQL command-line tools, then rerun this script."
    }
}

function Invoke-Psql {
    param(
        [string] $Description,
        [string[]] $Arguments
    )

    Write-Host $Description
    & psql @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "psql failed while running: $Description"
    }
}

function Invoke-PsqlFile {
    param([string] $Path)
    $relative = Resolve-Path $Path -Relative
    Invoke-Psql "Applying $relative..." @("-h", $HostName, "-p", "$Port", "-U", $User, "-d", $DatabaseName, "-v", "ON_ERROR_STOP=1", "-f", $Path)
}

Test-Psql

$exists = & psql -h $HostName -p $Port -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$($DatabaseName.Replace("'", "''"))';"
if ($LASTEXITCODE -ne 0) {
    throw "Unable to connect to PostgreSQL server '${HostName}:$Port'."
}

if ([string]::IsNullOrWhiteSpace($exists) -or $exists.Trim() -ne "1") {
    $escapedDatabaseName = $DatabaseName.Replace("""", """""")
    Invoke-Psql "Creating database '$DatabaseName'..." @("-h", $HostName, "-p", "$Port", "-U", $User, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "CREATE DATABASE ""$escapedDatabaseName"";")
}

$scripts = @(
    "database\postgres\001_schema.sql",
    "database\postgres\002_indexes.sql",
    "database\postgres\006_ist_timezone.sql",
    "database\postgres\003_functions.sql",
    "database\postgres\005_backfill_order_totals.sql"
)

foreach ($script in $scripts) {
    Invoke-PsqlFile (Join-Path $root $script)
}

if ($Seed) {
    Invoke-PsqlFile (Join-Path $root "database\postgres\004_seed_demo.sql")
}

Write-Host "PostgreSQL database setup completed for '$DatabaseName' on '${HostName}:$Port'."
