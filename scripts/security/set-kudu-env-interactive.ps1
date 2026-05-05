param(
  [Parameter(Mandatory=$false)]
  [string]$KuduHost = 'splitwiser-app.scm.azurewebsites.net'
)

$ErrorActionPreference = 'Stop'

if (-not $KuduHost) {
  throw 'KuduHost is required.'
}

$kuduUsername = Read-Host 'Kudu username'
$securePwd = Read-Host 'Kudu password' -AsSecureString

if (-not $kuduUsername) {
  throw 'Kudu username cannot be empty.'
}

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
try {
  $kuduPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

$env:SPLITWISER_KUDU_HOST = $KuduHost
$env:SPLITWISER_KUDU_USERNAME = $kuduUsername
$env:SPLITWISER_KUDU_PASSWORD = $kuduPassword
$env:SPLITWISER_SITE_HOST = $KuduHost -replace '\.scm\.', '.'

Write-Host 'Kudu credentials set in process environment for current terminal only.'
Write-Host 'Run deploy with: powershell -ExecutionPolicy Bypass -File .\\scripts\\deploy-now.ps1'
Write-Host 'Run smoke with: powershell -ExecutionPolicy Bypass -File .\\scripts\\smoke-prod.ps1'
