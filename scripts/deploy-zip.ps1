param(
  [Parameter(Mandatory=$false)]
  [string]$KuduHost = '',

  [Parameter(Mandatory=$false)]
  [string]$KuduUsername = '',

  [Parameter(Mandatory=$false)]
  [System.Management.Automation.PSCredential]$KuduCredential = $null,

  [Parameter(Mandatory=$false)]
  [string]$SiteHost = '',

  [Parameter(Mandatory=$true)]
  [string]$ZipPath,

  [Parameter(Mandatory=$false)]
  [int]$DeploymentTimeoutSec = 900,

  [Parameter(Mandatory=$false)]
  [int]$HealthTimeoutSec = 300
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path $ZipPath)) {
  throw "Zip file not found: $ZipPath"
}

$user = ''
$pass = ''
$kuduHostResolved = ''
$siteHostResolved = ''

if ($KuduCredential) {
  $user = $KuduCredential.UserName
  $pass = $KuduCredential.GetNetworkCredential().Password
} else {
  $user = if ($KuduUsername) { $KuduUsername } elseif ($env:SPLITWISER_KUDU_USERNAME) { $env:SPLITWISER_KUDU_USERNAME } else { '' }
  $pass = if ($env:SPLITWISER_KUDU_PASSWORD) { $env:SPLITWISER_KUDU_PASSWORD } else { '' }
}

$kuduHostResolved = if ($KuduHost) { $KuduHost } elseif ($env:SPLITWISER_KUDU_HOST) { $env:SPLITWISER_KUDU_HOST } else { '' }
if (-not $kuduHostResolved -or -not $user -or -not $pass) {
  throw 'Missing auth parameters. Set Kudu params/env (SPLITWISER_KUDU_HOST, SPLITWISER_KUDU_USERNAME, SPLITWISER_KUDU_PASSWORD) or pass -KuduCredential.'
}

$siteHostResolved = if ($SiteHost) { $SiteHost } elseif ($env:SPLITWISER_SITE_HOST) { $env:SPLITWISER_SITE_HOST } else { ($kuduHostResolved -replace '\.scm\.', '.') }

$kuduHost = $kuduHostResolved
$kuduZipDeploy = "https://$kuduHost/api/zipdeploy?isAsync=true"

$pair = "$user`:$pass"
$basicAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $basicAuth" }

function Wait-KuduDeployment {
  param(
    [Parameter(Mandatory=$true)][string]$KuduApiUrl,
    [Parameter(Mandatory=$true)][hashtable]$Headers,
    [Parameter(Mandatory=$true)][int]$TimeoutSec
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $lastErr = ''
  while ((Get-Date) -lt $deadline) {
    try {
      $dep = Invoke-RestMethod -Uri $KuduApiUrl -Headers $Headers -Method Get -TimeoutSec 120
    } catch {
      $lastErr = $_.Exception.Message
      Write-Warning "Transient Kudu polling error: $lastErr"
      Start-Sleep -Seconds 5
      continue
    }

    if ($dep.complete) {
      if ($dep.status_text -match 'stopped due to SCM container restart') {
        throw "Kudu deployment interrupted by SCM restart: $($dep.status_text)"
      }

      if ([int]$dep.status -eq 3) {
        return $dep
      }

      # App Service can occasionally report status=4 even when ZipDeploy finished successfully.
      if ([int]$dep.status -eq 4 -and $dep.log_url) {
        try {
          $logs = Invoke-RestMethod -Uri $dep.log_url -Headers $Headers -Method Get -TimeoutSec 120
          $hasSuccessLog = $false
          foreach ($entry in $logs) {
            if ($entry.message -match 'Deployment successful') {
              $hasSuccessLog = $true
              break
            }
          }

          if ($hasSuccessLog) {
            Write-Warning 'Kudu reported status=4 but deployment log confirms success. Continuing.'
            return $dep
          }
        } catch {
          Write-Warning "Unable to verify status=4 via deployment logs: $($_.Exception.Message)"
        }
      }

      $statusText = if ($dep.status_text) { $dep.status_text } else { "status=$($dep.status)" }
      throw "Kudu deployment completed but not successful: $statusText"
    }
    Start-Sleep -Seconds 5
  }

  if ($lastErr) {
    throw "Timed out waiting for Kudu deployment completion after $TimeoutSec seconds. Last error: $lastErr"
  }

  throw "Timed out waiting for Kudu deployment completion after $TimeoutSec seconds"
}

function Wait-Health {
  param(
    [Parameter(Mandatory=$true)][string]$HealthUrl,
    [Parameter(Mandatory=$true)][int]$TimeoutSec
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $lastErr = ''
  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 30
      if ($health.status -eq 'ok') {
        return $health
      }
      $lastErr = "health.status=$($health.status)"
    } catch {
      $lastErr = $_.Exception.Message
    }
    Start-Sleep -Seconds 5
  }

  throw "Timed out waiting for health endpoint: $lastErr"
}

function Invoke-ZipDeployUpload {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$ZipFile,
    [Parameter(Mandatory=$true)][hashtable]$Headers,
    [Parameter(Mandatory=$false)][int]$MaxAttempts = 4,
    [Parameter(Mandatory=$false)][int]$DelaySeconds = 20
  )

  $attempt = 1
  while ($attempt -le $MaxAttempts) {
    try {
      Invoke-RestMethod -Uri $Url -Method Post -InFile $ZipFile -ContentType 'application/zip' -Headers $Headers -TimeoutSec 300 | Out-Null
      return
    } catch {
      $msg = $_.Exception.Message

      if ($msg -match '504|timed out|expected to be kept alive was closed by the server|temporarily unavailable|connection.*closed') {
        if ($attempt -lt $MaxAttempts) {
          Write-Warning "Transient ZipDeploy upload failure (attempt $attempt/$MaxAttempts): $msg"
          Write-Warning "Retrying upload in $DelaySeconds seconds..."
          Start-Sleep -Seconds $DelaySeconds
          $attempt++
          continue
        }

        if ($msg -match '504') {
          Write-Warning 'ZipDeploy returned 504 Gateway Timeout on final attempt. Continuing with verification because deployment may still be applied.'
          return
        }
      }

      throw
    }
  }
}

Write-Host "Uploading $ZipPath to $kuduZipDeploy ..."
Invoke-ZipDeployUpload -Url $kuduZipDeploy -ZipFile $ZipPath -Headers $headers

$kuduLatest = "https://$kuduHost/api/deployments/latest"
Write-Host "Waiting for Kudu deployment completion..."
$dep = Wait-KuduDeployment -KuduApiUrl $kuduLatest -Headers $headers -TimeoutSec $DeploymentTimeoutSec
Write-Host "Deployment complete: id=$($dep.id) status=$($dep.status)"

$healthUrl = "https://$siteHostResolved/api/health"

Write-Host "Deployment request submitted. Checking health: $healthUrl"
$health = Wait-Health -HealthUrl $healthUrl -TimeoutSec $HealthTimeoutSec
Write-Host "Health OK:" ($health | ConvertTo-Json -Compress)

Write-Host 'Done.'
