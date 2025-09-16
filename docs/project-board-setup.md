# GitHub Project Board Setup

Create a GitHub Project (Projects v2) with columns: Backlog, Next, In Progress, Done, and add key roadmap items.

## Option A — Web UI (simple)
1) Create Project
- Go to your GitHub profile or org (e.g., https://github.com/MadihDev) → Projects → New Project
- Name: RFID Access Control Roadmap
- Visibility: Private or Public

2) Configure Columns
- Project Settings → Fields → Status
- Edit options to include exactly: Backlog, Next, In Progress, Done (remove defaults if you like)

3) Add Items
- Add draft items (or convert from issues) using the titles below and set Status per the suggested column

Suggested Items and Columns
- Backlog
  - Add indexes for hot columns (userId, keyId, cityId)
  - Cache dashboard KPIs (Redis or in-memory)
  - Log storage strategy (retention/partitions or separate analytics DB)
  - Optimize key expiry job for scale
  - Future multi-region support (multi-city/country)
- Next
  - WebSocket expiry notifications (emit key.expired)
  - Validate RFID assign/revoke requests (express-validator)
  - Dashboard per-location KPIs (API + UI)
  - Backend integration tests (city-aware auth + RFID)
- In Progress
  - (Add here as you start work)
- Done
  - (Move completed items here)

Item details
- See `docs/issues-seed.md` for ready-to-paste bodies and acceptance criteria.

## Option B — GitHub CLI (scripted)
Requirements: Install GitHub CLI (https://cli.github.com/) and run `gh auth login`.

1) Run the helper script

```powershell
# From repo root
# Verify GH CLI
# gh --version ; gh auth status

# Create project, issues, and add them to the project
./scripts/create-project.ps1 -Owner "MadihDev" -Repo "asset-access-control" -ProjectName "RFID Access Control Roadmap"
```

2) (Optional) Configure Status field values
- In the Project UI, set Status options to: Backlog, Next, In Progress, Done
- Drag items to the desired column; the script adds items but won’t set Status automatically.

Notes
- The script creates GitHub issues first, then adds each to the Project.
- Re-running may create duplicates (by title); prefer running once and managing in the UI.

## Automation: Auto-add new issues/PRs to the Project

This repo includes a workflow `.github/workflows/project-auto-add.yml` that adds opened issues/PRs to your Project automatically using the GitHub CLI. To enable it:

1) Get your Project number
- Open the Project in GitHub → the URL ends with `/projects/<number>` or use `gh project list --owner <Owner> --format json`.

2) Set repo variable
- In GitHub: Settings → Secrets and variables → Variables → New repository variable
- Name: `PROJECT_NUMBER`, Value: your project number (e.g., `3`)

That’s it—new issues/PRs will be auto-added to the Project.
