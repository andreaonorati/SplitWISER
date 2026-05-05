# SplitWISER Versions

This folder stores local source snapshots for iterative UI experiments.

## Current snapshots

- `v1` -> `snapshots/splitwiser-v1-20260412-113729.zip`

## Version URLs (same domain, different paths)

- Hub: `/versions`
- V1 base: `/v1`
- V2 base: `/v2`
- Group page pattern: `/v1/groups/{id}`, `/v2/groups/{id}`, `/v3/groups/{id}`, ...

This keeps one production domain while making each UI version independently testable.

## Convention for next iterations

- `v2` -> after first UI redesign batch
- `v3` -> after second UI redesign batch
- `vn` -> each major visual/UX variation

Each snapshot should be created from the current workspace source excluding generated artifacts (`node_modules`, `.next`, logs, deployment zips).

## Quick command for next versions

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\version-snapshot.ps1 -Version v2
```

Replace `v2` with `v3`, `v4`, etc.
