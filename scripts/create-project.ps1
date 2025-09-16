param(
  [Parameter(Mandatory=$true)][string]$Owner,
  [Parameter(Mandatory=$true)][string]$Repo,
  [Parameter(Mandatory=$true)][string]$ProjectName
)

function Require-GHCLI {
  try {
    gh --version | Out-Null
  } catch {
    Write-Error "GitHub CLI (gh) is not installed. Install from https://cli.github.com/ and run 'gh auth login'."
    exit 1
  }
}

function Require-GHAuth {
  $status = & gh auth status 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "GitHub CLI is not authenticated. Run 'gh auth login' and try again."
    exit 1
  }
}

Require-GHCLI
Require-GHAuth

Write-Host "Ensuring project '$ProjectName' exists for owner '$Owner'..."

# Try to find an existing project by title
$projectsJson = & gh project list --owner $Owner --format json 2>$null
$project = $null
if ($projectsJson) {
  $project = ($projectsJson | ConvertFrom-Json) | Where-Object { $_.title -eq $ProjectName } | Select-Object -First 1
}

if (-not $project) {
  Write-Host "Creating project '$ProjectName'..."
  $createdJson = & gh project create --owner $Owner --title $ProjectName --format json
  if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create project"; exit 1 }
  $project = $createdJson | ConvertFrom-Json
}

# Prefer 'number' for item-add
$projectNumber = $project.number
if (-not $projectNumber) {
  # Fallback: try view by title to get number
  $all = $projectsJson | ConvertFrom-Json
  $projectNumber = ($all | Where-Object { $_.title -eq $ProjectName } | Select-Object -ExpandProperty number -First 1)
}

if (-not $projectNumber) {
  Write-Error "Could not resolve project number for '$ProjectName'"
  exit 1
}

Write-Host "Using project number: $projectNumber"

$repoSlug = "$Owner/$Repo"

# Define items to create as issues and add to project
$items = @(
  @{ Title = "WebSocket expiry notifications"; Label = "enhancement"; Body = @"
When the key expiry job deactivates keys, emit WebSocket events to subscribed clients (scoped by city).
Acceptance:
- [ ] Server broadcasts `key.expired` with keyId, userId, cityId, expiresAt
- [ ] Client listens and updates dashboard KPIs in near real-time
"@ },
  @{ Title = "Validate RFID assign/revoke requests"; Label = "enhancement"; Body = @"
Add express-validator rules for `/api/rfid/assign` and `/api/rfid/revoke` and wire them in routes.
Acceptance:
- [ ] 400 on invalid `cardId`/`userId`/`expiresAt` or missing `id|cardId` on revoke
"@ },
  @{ Title = "Dashboard per-location KPIs"; Label = "enhancement"; Body = @"
Extend `/api/dashboard` to return per-location breakdowns and update UI to render cards per location.
Acceptance:
- [ ] API returns `locations: [{ id, name, activeUsers, onlineLocks, activeKeys }]`
"@ },
  @{ Title = "Backend integration tests: city-aware auth + RFID"; Label = "test"; Body = @"
Add tests for login with `cityId`, and `/api/rfid/assign` + `/api/rfid/revoke` happy and error paths.
Acceptance:
- [ ] Jest + Supertest covering success and validation failures
"@ },
  @{ Title = "Add indexes on hot columns (userId, keyId, cityId)"; Label = "performance"; Body = @"
Create migrations to add indexes on frequently filtered columns to speed up queries.
"@ },
  @{ Title = "Cache dashboard KPIs"; Label = "performance"; Body = @"
Add in-memory or Redis-based caching for dashboard summaries with short TTL.
"@ },
  @{ Title = "Log storage strategy"; Label = "documentation"; Body = @"
Document and plan log retention, partitions, or a separate analytics DB for long-term storage.
"@ },
  @{ Title = "Optimize key expiry job for scale"; Label = "performance"; Body = @"
Batch updates and use indexed queries to avoid scanning large tables; add metrics.
"@ },
  @{ Title = "Future multi-region support"; Label = "design"; Body = @"
Draft a plan for multi-city/multi-country toggles and data isolation.
"@ }
)

$created = @()
foreach ($it in $items) {
  Write-Host "Creating issue: $($it.Title)"
  $issueJson = & gh issue create --repo $repoSlug --title $it.Title --body $it.Body --label $it.Label --json number,url,title 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $issueJson) {
    Write-Warning "Failed to create issue '$($it.Title)'. Skipping add to project."
    continue
  }
  $issue = $issueJson | ConvertFrom-Json
  $created += $issue

  Write-Host "Adding to project #$projectNumber: $($issue.url)"
  & gh project item-add --owner $Owner --number $projectNumber --url $issue.url | Out-Null
}

Write-Host "\nCreated and added $($created.Count) items to project '$ProjectName'."
