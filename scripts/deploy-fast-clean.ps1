param(
  [Parameter(Mandatory=$false)]
  [string]$KuduHost = '',

  [Parameter(Mandatory=$false)]
  [string]$KuduUsername = '',

  [Parameter(Mandatory=$false)]
  [System.Management.Automation.PSCredential]$KuduCredential = $null,

  [Parameter(Mandatory=$false)]
  [string]$SiteHost = '',

  [Parameter(Mandatory=$false)]
  [int]$MaxAttempts = 4,

  [Parameter(Mandatory=$false)]
  [int]$RetryDelaySeconds = 20,

  [Parameter(Mandatory=$false)]
  [string]$Commitish = 'HEAD'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$zip = "deploy-fast-$ts.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

$gitAvailable = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitAvailable) {
  throw 'git is required for deploy-fast-clean.ps1 but was not found in PATH.'
}

git rev-parse --verify $Commitish | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Invalid commitish: $Commitish"
}

git archive --format=zip --output=$zip $Commitish
if ($LASTEXITCODE -ne 0) {
  throw "git archive failed for commitish: $Commitish"
}

Write-Host "ZIP_CREATED=$zip"

$attempt = 1
while ($attempt -le $MaxAttempts) {
  try {
    Write-Host "DEPLOY_ATTEMPT=$attempt/$MaxAttempts"
    & (Join-Path $PSScriptRoot 'deploy-zip.ps1') `
      -KuduHost $KuduHost `
      -KuduUsername $KuduUsername `
      -KuduCredential $KuduCredential `
      -SiteHost $SiteHost `
      -ZipPath $zip `
      -DeploymentTimeoutSec 1800 `
      -HealthTimeoutSec 600

    exit 0
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match 'SCM container restart' -and $attempt -lt $MaxAttempts) {
      Write-Warning "Deploy interrupted by SCM restart. Retrying in $RetryDelaySeconds seconds..."
      Start-Sleep -Seconds $RetryDelaySeconds
      $attempt++
      continue
    }

    throw
  }
}

throw "Deployment did not complete successfully after $MaxAttempts attempts"
