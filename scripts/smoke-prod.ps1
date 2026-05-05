param(
  [Parameter(Mandatory=$false)]
  [string]$BaseUrl = 'https://splitwiser-app.azurewebsites.net',

  [Parameter(Mandatory=$false)]
  [string]$KuduHost = '',

  [Parameter(Mandatory=$false)]
  [string]$KuduUsername = '',

  [Parameter(Mandatory=$false)]
  [System.Management.Automation.PSCredential]$KuduCredential = $null,

  [Parameter(Mandatory=$false)]
  [int]$RetryCount = 2,

  [Parameter(Mandatory=$false)]
  [int]$RetryDelaySeconds = 3,

  [Parameter(Mandatory=$false)]
  [string]$OutputJsonPath = ''
)

$ErrorActionPreference = 'Stop'

function Invoke-WithRetry {
  param(
    [Parameter(Mandatory=$true)][scriptblock]$Action,
    [Parameter(Mandatory=$true)][int]$MaxRetries,
    [Parameter(Mandatory=$true)][int]$DelaySeconds
  )

  $attempt = 0
  while ($true) {
    try {
      return & $Action
    } catch {
      if ($attempt -ge $MaxRetries) {
        throw
      }
      Start-Sleep -Seconds $DelaySeconds
      $attempt++
    }
  }
}

function Invoke-Check {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][scriptblock]$Action
  )

  try {
    $start = Get-Date
    Invoke-WithRetry -Action $Action -MaxRetries $RetryCount -DelaySeconds $RetryDelaySeconds | Out-Null
    $durationMs = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
    [pscustomobject]@{ Check = $Name; Status = 'PASS'; Details = ''; DurationMs = $durationMs }
  } catch {
    [pscustomobject]@{ Check = $Name; Status = 'FAIL'; Details = $_.Exception.Message; DurationMs = $null }
  }
}

$results = @()

$results += Invoke-Check -Name 'GET /api/health responds with status ok' -Action {
  $res = Invoke-RestMethod -Uri ($BaseUrl.TrimEnd('/') + '/api/health') -Method Get -TimeoutSec 30
  if ($res.status -ne 'ok') {
    throw "Unexpected health status: $($res.status)"
  }
}

$results += Invoke-Check -Name 'GET / returns 200/302' -Action {
  $res = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/') -Method Get -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
  if ($null -eq $res) {
    throw 'No response from root page'
  }
  if (@(200, 301, 302) -notcontains [int]$res.StatusCode) {
    throw "Unexpected status code: $($res.StatusCode)"
  }
}

$results += Invoke-Check -Name 'GET /login returns 200/302' -Action {
  $res = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/login') -Method Get -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
  if ($null -eq $res) {
    throw 'No response from login page'
  }
  if (@(200, 301, 302) -notcontains [int]$res.StatusCode) {
    throw "Unexpected status code: $($res.StatusCode)"
  }
}

function Get-KuduAuthHeader {
  if ($KuduCredential) {
    $user = $KuduCredential.UserName
    $pass = $KuduCredential.GetNetworkCredential().Password
  } else {
    $user = if ($KuduUsername) { $KuduUsername } elseif ($env:SPLITWISER_KUDU_USERNAME) { $env:SPLITWISER_KUDU_USERNAME } else { '' }
    $pass = if ($env:SPLITWISER_KUDU_PASSWORD) { $env:SPLITWISER_KUDU_PASSWORD } else { '' }
  }

  if (-not $user -or -not $pass) {
    throw 'Kudu credentials missing. Provide -PublishProfilePath or Kudu params/env (SPLITWISER_KUDU_USERNAME, SPLITWISER_KUDU_PASSWORD).'
  }

  $pair = "$user`:$pass"
  $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  return @{ Authorization = "Basic $auth" }
}

$kuduHostResolved = if ($KuduHost) { $KuduHost } elseif ($env:SPLITWISER_KUDU_HOST) { $env:SPLITWISER_KUDU_HOST } else { 'splitwiser-app.scm.azurewebsites.net' }

if ($KuduCredential -or $KuduUsername -or $env:SPLITWISER_KUDU_USERNAME -or $env:SPLITWISER_KUDU_PASSWORD) {
  $results += Invoke-Check -Name 'Kudu latest deployment is complete' -Action {
    $headers = Get-KuduAuthHeader
    $kuduUrl = "https://$kuduHostResolved/api/deployments/latest"
    $dep = Invoke-RestMethod -Uri $kuduUrl -Headers $headers -Method Get -TimeoutSec 30

    if (-not $dep.complete) {
      throw 'Latest deployment is not complete'
    }
    if ([int]$dep.status -ne 3) {
      throw "Latest deployment status is not success (status=$($dep.status))"
    }
  }
}

$passCount = ($results | Where-Object { $_.Status -eq 'PASS' }).Count
$failCount = ($results | Where-Object { $_.Status -eq 'FAIL' }).Count

Write-Host ''
Write-Host '=== PRODUCTION SMOKE TEST ==='
$results | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "Summary: PASS=$passCount FAIL=$failCount"

if ($OutputJsonPath) {
  $payload = [pscustomobject]@{
    timestamp = (Get-Date).ToString('s')
    baseUrl = $BaseUrl
    pass = $passCount
    fail = $failCount
    checks = $results
  }
  $payload | ConvertTo-Json -Depth 4 | Set-Content -Path $OutputJsonPath -Encoding UTF8
}

if ($failCount -gt 0) {
  exit 1
}

exit 0
