# Preflight checks before provisioning a new *.rndpig.com app.
# Usage: .\00-preflight.ps1 -Port 8006
param([Parameter(Mandatory)][int]$Port)
$ErrorActionPreference = 'Stop'
$fail = @()

Write-Host "--- gh CLI auth"
gh auth status
if ($LASTEXITCODE -ne 0) { $fail += 'gh' }

Write-Host "--- Firebase CLI auth"
# Firebase CLI writes a progress spinner to stderr; under PS 5.1 that becomes a
# terminating NativeCommandError. Run via cmd /c so its stderr never enters the
# PowerShell error stream; rely solely on the exit code.
cmd /c "firebase projects:list >nul 2>nul"
if ($LASTEXITCODE -ne 0) { $fail += 'firebase' }

Write-Host "--- Cloudflare API token (zone read)"
$token = (Get-Content "$HOME/.cloudflare-token" -Raw).Trim()
$h = @{ Authorization = "Bearer $token" }
$zone = (Invoke-RestMethod -Headers $h 'https://api.cloudflare.com/client/v4/zones?name=rndpig.com').result[0]
if ($null -eq $zone) { $fail += 'cloudflare' } else { Write-Host "zone rndpig.com id: $($zone.id)" }

Write-Host "--- SSH to dilger"
ssh -n -T dilger "echo dilger-ok"
if ($LASTEXITCODE -ne 0) { $fail += 'ssh' }

Write-Host "--- Port $Port free on dilger"
ssh -n -T dilger "bash -c 'ss -tln | grep :$Port || echo PORT-FREE'"

if ($fail.Count -gt 0) { throw "Preflight failures: $($fail -join ', ')" }
Write-Host "PREFLIGHT OK (verify PORT-FREE appeared above)"
