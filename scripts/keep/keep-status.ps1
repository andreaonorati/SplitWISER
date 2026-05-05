$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logDir = Join-Path $root 'logs_keep'

if (-not (Test-Path $logDir)) {
  Write-Host 'logs_keep not found'
  exit 1
}

$taskName = 'SplitWiserKeepWatchdog'

Write-Host '=== TASK ==='
try {
  schtasks /Query /TN $taskName /V /FO LIST
} catch {
  Write-Host "Task query failed: $($_.Exception.Message)"
}

Write-Host ''
Write-Host '=== MARKERS ==='
$okMarker = Join-Path $logDir 'last-ok.txt'
$failMarker = Join-Path $logDir 'last-fail.txt'
$redeployMarker = Join-Path $logDir 'last-redeploy.txt'
if (Test-Path $okMarker) {
  Write-Host ('last-ok:   ' + (Get-Content $okMarker -Raw).Trim())
} else {
  Write-Host 'last-ok:   not found'
}
if (Test-Path $failMarker) {
  Write-Host ('last-fail: ' + (Get-Content $failMarker -Raw).Trim())
} else {
  Write-Host 'last-fail: not found'
}
if (Test-Path $redeployMarker) {
  Write-Host ('last-redeploy: ' + (Get-Content $redeployMarker -Raw).Trim())
} else {
  Write-Host 'last-redeploy: not found'
}

Write-Host ''
Write-Host '=== LAST SMOKE JSON ==='
$lastSmokeJson = Join-Path $logDir 'last-smoke.json'
if (Test-Path $lastSmokeJson) {
  try {
    $smoke = Get-Content $lastSmokeJson -Raw | ConvertFrom-Json
    Write-Host ('timestamp: ' + $smoke.timestamp)
    Write-Host ('pass:      ' + $smoke.pass)
    Write-Host ('fail:      ' + $smoke.fail)
  } catch {
    Write-Host 'last-smoke.json present but unreadable'
  }
} else {
  Write-Host 'last-smoke.json: not found'
}

Write-Host ''
Write-Host '=== LAST 5 LOGS ==='
Get-ChildItem $logDir -Filter 'watchdog-*.log' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5 Name,LastWriteTime,Length |
  Format-Table -AutoSize

$last = Get-ChildItem $logDir -Filter 'watchdog-*.log' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($last) {
  Write-Host ''
  Write-Host ('=== LAST LOG CONTENT: ' + $last.Name + ' ===')
  Get-Content $last.FullName
}
