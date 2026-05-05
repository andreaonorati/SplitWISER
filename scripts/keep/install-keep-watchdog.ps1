param(
  [Parameter(Mandatory=$false)]
  [string]$KuduHost = 'splitwiser-app.scm.azurewebsites.net',

  [Parameter(Mandatory=$false)]
  [string]$KuduUsername = '',

  [Parameter(Mandatory=$false)]
  [string]$TaskName = 'SplitWiserKeepWatchdog'
)

$ErrorActionPreference = 'Stop'

$watchdogScript = Join-Path $PSScriptRoot 'keep-watchdog.ps1'

$wrapperPath = Join-Path $PSScriptRoot 'run-watchdog.cmd'
$wrapperContent = @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$watchdogScript" -KuduHost "$KuduHost" -KuduUsername "$KuduUsername"
"@
Set-Content -Path $wrapperPath -Value $wrapperContent -Encoding Ascii

# Replace existing task if present (ignore if missing).
cmd /c "schtasks /Delete /TN `"$TaskName`" /F >nul 2>&1" | Out-Null

$createCmd = "schtasks /Create /TN `"$TaskName`" /SC MINUTE /MO 5 /TR `"$wrapperPath`" /F"
cmd /c $createCmd | Out-Null
cmd /c "schtasks /Run /TN `"$TaskName`"" | Out-Null

Write-Host "Installed and started task: $TaskName"
Write-Host "Wrapper: $wrapperPath"
