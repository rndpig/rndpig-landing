# ============================================================================
# UNVERIFIED — requires the provisioning service account from
# docs/PROVISIONING_API_AUTOMATION.md (roles/firebasehosting.admin on the app's
# hosting project). Run with -ValidateOnly first and confirm request/response
# shapes against the live API before trusting it. Remove this banner once run
# successfully end-to-end.
# ============================================================================
#
# Register a Firebase Hosting custom domain via REST (no console, no browser).
# Usage:
#   .\20-firebase-custom-domain.ps1 -Project home-rnp -Domain home.rndpig.com [-ValidateOnly]
#
# After it prints requiredDnsUpdates, add those records with 10-dns.ps1, then
# re-run without -ValidateOnly (or just poll) until cert.state = CERT_ACTIVE.
param(
    [Parameter(Mandatory)][string]$Project,
    [Parameter(Mandatory)][string]$Domain,
    [switch]$ValidateOnly
)
$ErrorActionPreference = 'Stop'

# Access token: pipe straight from gcloud (SA activated via
# `gcloud auth activate-service-account --key-file=$env:RNDPIG_SA_KEY`).
# Prefer running on dilger where the SA key lives; avoid long-lived token vars.
$token = & gcloud auth print-access-token
$h = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$base = "https://firebasehosting.googleapis.com/v1beta1/projects/$Project/sites/$Project/customDomains"

# --- Create (Spark plan → GROUPED cert). Returns a long-running operation. ---
$createUrl = "$base`?customDomainId=$Domain"
if ($ValidateOnly) { $createUrl += "&validateOnly=true" }
$body = @{ certPreference = 'GROUPED' } | ConvertTo-Json
try {
    $op = Invoke-RestMethod -Method Post -Headers $h -Body $body $createUrl
    Write-Host "Create requested. Operation:" $op.name
} catch {
    # 409 ALREADY_EXISTS is fine — fall through to GET/poll.
    if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
    Write-Host "Custom domain already exists; polling current state."
}
if ($ValidateOnly) { Write-Host "validateOnly — nothing created."; return }

# --- Poll the domain resource for DNS requirements + cert state. ---
$getUrl = "$base/$Domain"
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 6
    $cd = Invoke-RestMethod -Headers $h $getUrl
    $cert = $cd.cert.state; $hostState = $cd.hostState; $own = $cd.ownershipState
    Write-Host "host=$hostState ownership=$own cert=$cert"
    if ($cd.requiredDnsUpdates) {
        Write-Host "--- requiredDnsUpdates (apply via 10-dns.ps1) ---"
        $cd.requiredDnsUpdates | ConvertTo-Json -Depth 12 | Write-Host
    }
    if ($cert -eq 'CERT_ACTIVE' -and $hostState -match 'ACTIVE') { Write-Host "DONE — custom domain active."; return }
    if ($cd.issues) { Write-Host "issues:"; $cd.issues | ConvertTo-Json -Depth 8 | Write-Host }
}
Write-Host "Still reconciling — apply any requiredDnsUpdates above and re-run to keep polling."
