param(
  [Parameter(Mandatory=$false)]
  [string]$KuduHost = '',

  [Parameter(Mandatory=$false)]
  [string]$KuduUsername = '',

  [Parameter(Mandatory=$false)]
  [string]$BaseUrl = 'https://splitwiser-app.azurewebsites.net',

  [Parameter(Mandatory=$false)]
  [int]$RedeployCooldownMinutes = 30
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logDir = Join-Path $root 'logs_keep'
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

# Keep only the latest 200 watchdog logs.
Get-ChildItem -Path $logDir -Filter 'watchdog-*.log' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 200 |
  Remove-Item -Force -ErrorAction SilentlyContinue

$lockPath = Join-Path $logDir 'watchdog.lock'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDir ("watchdog-$stamp.log")
$okMarker = Join-Path $logDir 'last-ok.txt'
$failMarker = Join-Path $logDir 'last-fail.txt'
$redeployMarker = Join-Path $logDir 'last-redeploy.txt'
$lastSmokeJson = Join-Path $logDir 'last-smoke.json'

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $logPath -Value $line
}

# Avoid overlap between scheduled runs.
if (Test-Path $lockPath) {
  $ageMin = ((Get-Date) - (Get-Item $lockPath).LastWriteTime).TotalMinutes
  if ($ageMin -lt 20) {
    exit 0
  }
}

Set-Content -Path $lockPath -Value $stamp

try {
  Write-Log 'START watchdog run'

  $smokeScript = Join-Path $root 'scripts\smoke-prod.ps1'
  $deployScript = Join-Path $root 'scripts\deploy-now.ps1'

  & powershell -NoProfile -ExecutionPolicy Bypass -File $smokeScript -BaseUrl $BaseUrl -KuduHost $KuduHost -KuduUsername $KuduUsername -OutputJsonPath $lastSmokeJson *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Log 'Smoke PASS. No action required.'
    Set-Content -Path $okMarker -Value (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    if (Test-Path $failMarker) { Remove-Item -Force $failMarker }
    exit 0
  }

  if (Test-Path $redeployMarker) {
    $lastRedeploy = Get-Date (Get-Content $redeployMarker -Raw).Trim()
    $minsSinceRedeploy = ((Get-Date) - $lastRedeploy).TotalMinutes
    if ($minsSinceRedeploy -lt $RedeployCooldownMinutes) {
      Write-Log ("Smoke FAIL. Redeploy skipped due to cooldown ({0}m < {1}m)." -f [int]$minsSinceRedeploy, $RedeployCooldownMinutes)
      Set-Content -Path $failMarker -Value (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
      exit 1
    }
  }

  Write-Log 'Smoke FAIL. Triggering auto-redeploy.'
  & powershell -NoProfile -ExecutionPolicy Bypass -File $deployScript -KuduHost $KuduHost -KuduUsername $KuduUsername *> $null
  Set-Content -Path $redeployMarker -Value (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
  Write-Log 'Auto-redeploy command executed.'

  & powershell -NoProfile -ExecutionPolicy Bypass -File $smokeScript -BaseUrl $BaseUrl -KuduHost $KuduHost -KuduUsername $KuduUsername -OutputJsonPath $lastSmokeJson *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Log 'Post-redeploy smoke PASS.'
    Set-Content -Path $okMarker -Value (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    if (Test-Path $failMarker) { Remove-Item -Force $failMarker }
    exit 0
  }

  Write-Log 'Post-redeploy smoke FAIL. Manual intervention needed.'
  Set-Content -Path $failMarker -Value (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
  exit 1
}
catch {
  Write-Log ("ERROR: " + $_.Exception.Message)
  Set-Content -Path $failMarker -Value (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
  exit 1
}
finally {
  if (Test-Path $lockPath) {
    Remove-Item -Force $lockPath
  }
  Write-Log 'END watchdog run'
}
