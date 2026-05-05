param(
  [Parameter(Mandatory=$true)]
  [string]$PublishSettingsPath,

  [Parameter(Mandatory=$false)]
  [switch]$DeleteSourceFile
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $PublishSettingsPath)) {
  throw "Publish settings file not found: $PublishSettingsPath"
}

[xml]$xml = Get-Content -Raw -Path $PublishSettingsPath
$profile = $xml.publishData.publishProfile | Where-Object { $_.publishMethod -eq 'ZipDeploy' } | Select-Object -First 1

if (-not $profile) {
  throw 'ZipDeploy profile not found in publish settings file.'
}

$kuduHost = ($profile.publishUrl -replace '^https?://', '' -split ':')[0]
if (-not $kuduHost) {
  throw 'Unable to resolve Kudu host from publish settings.'
}

$siteHost = $kuduHost -replace '\.scm\.', '.'

$env:SPLITWISER_KUDU_HOST = $kuduHost
$env:SPLITWISER_KUDU_USERNAME = $profile.userName
$env:SPLITWISER_KUDU_PASSWORD = $profile.userPWD
$env:SPLITWISER_SITE_HOST = $siteHost

Write-Host 'Kudu credentials imported into process environment variables:'
Write-Host '  SPLITWISER_KUDU_HOST'
Write-Host '  SPLITWISER_KUDU_USERNAME'
Write-Host '  SPLITWISER_KUDU_PASSWORD'
Write-Host '  SPLITWISER_SITE_HOST'
Write-Host ''
Write-Host 'You can now run deploy/smoke scripts in this same terminal without passing PublishSettings.'

if ($DeleteSourceFile) {
  Remove-Item -Path $PublishSettingsPath -Force
  Write-Host "Deleted source file: $PublishSettingsPath"
}
