param(
    [string]$PushAt = "03:00"
)

$ErrorActionPreference = 'Stop'

$RepoDir  = Split-Path -Parent $PSScriptRoot
$Collect  = Join-Path $RepoDir 'src\collect.mjs'
$TaskName = 'CATokenTelemetry-Collect'

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "node not found; install Node.js first." }
if (-not (Test-Path $Collect)) { throw "Cannot find $Collect" }

Write-Host "Node: $node"
Write-Host "Repo: $RepoDir"

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Already exists, recreating: $TaskName"
}

$action  = New-ScheduledTaskAction -Execute $node -Argument "`"$Collect`"" -WorkingDirectory $RepoDir
$trigger = New-ScheduledTaskTrigger -Daily -At $PushAt
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description "CA Token Telemetry collect & push (daily at $PushAt)" | Out-Null

Write-Host "Created: $TaskName (daily at $PushAt)" -ForegroundColor Green
Write-Host ""
Write-Host "Run immediately: Start-ScheduledTask -TaskName $TaskName"
Write-Host "Uninstall:       .\init\uninstall-schedule-windows.ps1"
