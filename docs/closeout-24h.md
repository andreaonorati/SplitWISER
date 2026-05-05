# SplitWISER - 24h Closeout Plan

Goal: ship a stable, usable release within 24 hours with clear PASS/FAIL gates.

## Scope Freeze (P0 only)

Include only release-critical items:
- Multi-file import + bulk approve flow.
- Expense confirmation + history + restore behavior.
- Group balance transparency modal and pending indicators.
- New expense draft autosave and leave protection.
- Production deployment and health checks.

Defer to next wave (P1/P2):
- Full offline-first sync with conflict resolution.
- Full notification center with granular server-side preferences.
- Payment-to-expense linking.
- Multi-currency complete flow.

## Hard Release Gates

A release is considered done only if all checks pass:
1. Deployment gate:
- Latest Kudu deployment is complete and successful.
- /api/health returns status=ok.

2. Smoke gate:
- /, /login, and /api/health return expected HTTP responses.
- No blocking UI error at startup.

3. Functional gate (manual quick pass):
- Create expense in a group.
- Confirm modified/new expense from another user account.
- Open expense history and verify entries are present.
- Soft-delete and restore an expense with correct permissions.
- Open group balance popup and verify details render.

4. Regression gate:
- Multi-file import still works.
- Bulk approve still creates expenses correctly.

## Execution Sequence (24h)

Hour 0-2:
- Run smoke checks against production.
- Verify deployment metadata and health endpoint.
- Fix only P0 blockers.

Hour 2-8:
- Manual functional checks of P0 flows.
- Apply hotfixes for any failed gate.

Hour 8-16:
- Repeat smoke + functional checks after each hotfix.
- Prepare final release notes with known limitations.

Hour 16-24:
- Final pass of all gates.
- Tag release candidate and handoff with checklist.

## Commands

Run production smoke test:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-prod.ps1
```

Run production smoke test including Kudu deployment validation:

```powershell
$cred = Get-Credential -Message "Azure Kudu credentials"
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-prod.ps1 -KuduHost splitwiser-app.scm.azurewebsites.net -KuduCredential $cred
```

## Definition of Done

Project is closed for this cycle when:
- All hard release gates are PASS.
- No P0 bug is open.
- Known limitations list exists for deferred P1/P2 work.
