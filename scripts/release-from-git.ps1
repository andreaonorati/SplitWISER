param(
  [Parameter(Mandatory=$false)]
  [string]$Commitish = 'HEAD',

  [Parameter(Mandatory=$false)]
  [switch]$SkipBuild,

  [Parameter(Mandatory=$false)]
  [string]$BaseUrl = 'https://splitwiser-app.azurewebsites.net',

  [Parameter(Mandatory=$false)]
  [string]$KuduHost = '',

  [Parameter(Mandatory=$false)]
  [string]$KuduUsername = '',

  [Parameter(Mandatory=$false)]
  [System.Management.Automation.PSCredential]$KuduCredential = $null,

  [Parameter(Mandatory=$false)]
  [string]$SiteHost = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "STEP=verify-commit COMMIT=$Commitish"
git rev-parse --verify $Commitish | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Invalid commitish: $Commitish"
}

if (-not $SkipBuild) {
  Write-Host 'STEP=build START'
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw 'Build failed. Deploy aborted.'
  }
  Write-Host 'STEP=build DONE'
} else {
  Write-Host 'STEP=build SKIPPED'
}

Write-Host "STEP=deploy START COMMIT=$Commitish"
& (Join-Path $PSScriptRoot 'deploy-fast-clean.ps1') `
  -Commitish $Commitish `
  -KuduHost $KuduHost `
  -KuduUsername $KuduUsername `
  -KuduCredential $KuduCredential `
  -SiteHost $SiteHost

Write-Host 'STEP=smoke START'
& (Join-Path $PSScriptRoot 'smoke-prod.ps1') `
  -BaseUrl $BaseUrl `
  -KuduHost $KuduHost `
  -KuduUsername $KuduUsername `
  -KuduCredential $KuduCredential

Write-Host 'STEP=release DONE'
