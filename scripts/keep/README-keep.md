# Keep Mode

This folder contains unattended watchdog automation for production.

## What It Does

- Runs a smoke test on a schedule.
- If smoke fails, triggers auto-redeploy.
- Runs smoke again after redeploy.
- Writes run logs into logs_keep.
- Maintains markers:
  - logs_keep/last-ok.txt
  - logs_keep/last-fail.txt
  - logs_keep/last-redeploy.txt
  - logs_keep/last-smoke.json
- Uses redeploy cooldown (default 30 minutes) to avoid repeated redeploy loops.

## Install / Reinstall

$cred = Get-Credential -Message "Azure Kudu credentials"
powershell -ExecutionPolicy Bypass -File .\scripts\keep\install-keep-watchdog.ps1 -KuduHost splitwiser-app.scm.azurewebsites.net -KuduCredential $cred

## Manual One-Off Run

powershell -ExecutionPolicy Bypass -File .\scripts\keep\keep-watchdog.ps1 -KuduHost splitwiser-app.scm.azurewebsites.net -KuduCredential $cred

## Status

powershell -ExecutionPolicy Bypass -File .\scripts\keep\keep-status.ps1
