# ============================================================================
# UNVERIFIED — requires the provisioning service account from
# docs/PROVISIONING_API_AUTOMATION.md (roles/firebaseauth.admin on rndpig-admin).
# Run once with -DryRun and confirm the merged list before PATCHing for real.
# Remove this banner once run successfully.
# ============================================================================
#
# Add authorized domains to the shared auth project (rndpig-admin) via REST.
# The PATCH replaces the whole authorizedDomains list, so this GETs the current
# list, appends, and PATCHes the union.
# Usage:
#   .\21-auth-authorized-domain.ps1 -Domains home.rndpig.com,home-rnp.web.app [-DryRun]
param(
    [Parameter(Mandatory)][string[]]$Domains,
    [string]$Project = 'rndpig-admin',
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'

# Access token: pipe straight from gcloud (SA activated for rndpig-admin).
$token = & gcloud auth print-access-token
$h = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$cfgUrl = "https://identitytoolkit.googleapis.com/admin/v2/projects/$Project/config"

# --- GET current config, compute the union. ---
$cfg = Invoke-RestMethod -Headers $h $cfgUrl
$current = @($cfg.authorizedDomains)
Write-Host "Current authorizedDomains:"; $current | ForEach-Object { Write-Host "  $_" }
$merged = @($current)
foreach ($d in $Domains) { if ($merged -notcontains $d) { $merged += $d } }
$toAdd = $merged | Where-Object { $current -notcontains $_ }
if (-not $toAdd) { Write-Host "All requested domains already authorized; nothing to do."; return }
Write-Host "Adding:"; $toAdd | ForEach-Object { Write-Host "  $_" }
if ($DryRun) { Write-Host "DryRun — not patching."; return }

# --- PATCH only authorizedDomains. ---
$patchUrl = "$cfgUrl`?updateMask=authorizedDomains"
$body = @{ authorizedDomains = $merged } | ConvertTo-Json
$r = Invoke-RestMethod -Method Patch -Headers $h -Body $body $patchUrl
Write-Host "authorizedDomains now:"; $r.authorizedDomains | ForEach-Object { Write-Host "  $_" }
