param(
  [Parameter(Mandatory=$true)]
  [string]$Version
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'versions\snapshots'
if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipName = "splitwiser-$Version-$ts.zip"
$zipPath = Join-Path $outDir $zipName

$items = Get-ChildItem -Path $root -Force | Where-Object {
  $_.Name -notin @('.git', 'node_modules', '.next', 'dist', '.vscode', 'deploy_staging', '.deploy_runtime', 'versions') -and
  $_.Name -notlike 'logs_*' -and
  $_.Name -notlike 'webapp-logs-*' -and
  $_.Name -notlike 'deploy-runtime-*.zip' -and
  $_.Name -notlike 'deploy*.zip'
}

Compress-Archive -Path ($items | ForEach-Object { $_.FullName }) -DestinationPath $zipPath -CompressionLevel Optimal -Force
Write-Output "Snapshot created: $zipPath"
