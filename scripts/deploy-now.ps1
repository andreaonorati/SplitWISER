param(
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
$zip = Get-ChildItem -Path $root -Filter 'deploy-runtime-*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $zip) {
  throw 'No deploy-runtime zip found in project root. Build one first.'
}

& (Join-Path $PSScriptRoot 'deploy-zip.ps1') `
  -KuduHost $KuduHost `
  -KuduUsername $KuduUsername `
  -KuduCredential $KuduCredential `
  -SiteHost $SiteHost `
  -ZipPath $zip.FullName
