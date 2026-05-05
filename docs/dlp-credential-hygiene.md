# DLP Credential Hygiene

## Why alerts happen

Organization DLP scans can flag files containing login credentials.
Azure publish profile files (*.PublishSettings) contain credentials in plain text (`userName` + `userPWD`).

## Goal

Use deployment credentials without keeping credential files in synced or monitored folders.

## Recommended workflow

1. Download publish profile only when needed.
2. Import credentials for one session.
3. Delete the source file immediately.
4. Use deploy/smoke scripts with environment variables.

## One-time import + delete

Run in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\security\import-publishsettings-once.ps1 -PublishSettingsPath "C:\path\to\splitwiser-app.PublishSettings" -DeleteSourceFile
```

Then, in the same terminal session:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-now.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-prod.ps1
```

## No-file workflow (preferred for recurring usage)

Use interactive prompt (credentials stay only in memory for current terminal session):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\security\set-kudu-env-interactive.ps1
```

Then run deploy/smoke as above.

## Incident response for exposed publish profile

If a publish profile was saved in a monitored location and triggered DLP:

1. Delete all local copies of the publish profile.
2. Reset publishing credentials in Azure App Service.
3. Re-download a fresh publish profile only if strictly needed.
4. Switch to interactive/session-based credential workflow.

## Notes

- `.gitignore` already excludes publish profile files.
- Never commit publish profile files or credential dumps.
- Avoid embedding credentials in scripts, CMD wrappers, or logs.
