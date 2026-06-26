param(
    [string] $HostName = "localhost",
    [int] $Port = 5432,
    [string] $Database = "Qrave",
    [string] $User = "postgres",
    [string] $Password = "",
    [string] $PsqlPath = "",
    [switch] $Seed
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$DatabaseName = $Database.ToLowerInvariant()
$env:PGPASSWORD = $Password
$script:PsqlExe = $null

function Resolve-Psql {
    if (-not [string]::IsNullOrWhiteSpace($PsqlPath)) {
        if (-not (Test-Path -LiteralPath $PsqlPath)) {
            throw "psql was not found at '$PsqlPath'."
        }

        return $PsqlPath
    }

    $command = Get-Command psql -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $standardInstall = Get-ChildItem -LiteralPath "$env:ProgramFiles\PostgreSQL" -Recurse -Filter psql.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like "*\bin\psql.exe" } |
        Sort-Object FullName -Descending |
        Select-Object -First 1

    if ($standardInstall) {
        return $standardInstall.FullName
    }

    throw "psql was not found. Install PostgreSQL command-line tools, pass -PsqlPath, or add psql to PATH."
}

function Invoke-Psql {
    param(
        [string] $Description,
        [string[]] $Arguments
    )

    Write-Host $Description
    & $script:PsqlExe @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "psql failed while running: $Description"
    }
}

function Invoke-PsqlFile {
    param([string] $Path)
    $relative = Resolve-Path $Path -Relative
    Invoke-Psql "Applying $relative..." @("-h", $HostName, "-p", "$Port", "-U", $User, "-d", $DatabaseName, "-v", "ON_ERROR_STOP=1", "-f", $Path)
}

$script:PsqlExe = Resolve-Psql

$exists = & $script:PsqlExe -h $HostName -p $Port -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$($DatabaseName.Replace("'", "''"))';"
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
    "database\postgres\007_menu_item_diet_type.sql",
    "database\postgres\003_functions.sql",
    "database\postgres\008_fix_menuitem_update_ambiguity.sql",
    "database\postgres\008_qr_visit_sessions.sql",
    "database\postgres\005_backfill_order_totals.sql",
    "database\postgres\009_super_admin.sql",
    "database\postgres\010_public_qr_suspend_guards.sql",
    "database\postgres\011_offer_promo_codes.sql",
    "database\postgres\012_customer_device_access.sql",
    "database\postgres\012_fix_feedback_public_functions.sql",
    "database\postgres\013_fix_cancelled_order_reports.sql",
    "database\postgres\014_admin_order_history_fields.sql",
    "database\postgres\015_order_item_cancellation.sql",
    "database\postgres\016_admin_notifications_target_url.sql",
    "database\postgres\017_fix_admin_order_cancelitem_ambiguity.sql",
    "database\postgres\018_order_item_cancellation_requests.sql",
    "database\postgres\019_fix_item_cancellation_request_ambiguity.sql",
    "database\postgres\019_order_tracking_access.sql",
    "database\postgres\020_active_order_items_everywhere.sql"
)

foreach ($script in $scripts) {
    Invoke-PsqlFile (Join-Path $root $script)
}

if ($Seed) {
    Invoke-PsqlFile (Join-Path $root "database\postgres\004_seed_demo.sql")
}

Write-Host "PostgreSQL database setup completed for '$DatabaseName' on '${HostName}:$Port'."
