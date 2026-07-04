# Add an ingress rule to the dashboard-managed tunnel (id starts 89d90e76).
# Backs up the current config to .\backups\ first. PUT replaces the WHOLE
# config, so this script always round-trips GET -> insert -> PUT.
# Usage: .\11-tunnel-ingress.ps1 -Hostname home-api.rndpig.com -Service http://localhost:8006
param(
    [Parameter(Mandatory)][string]$Hostname,
    [Parameter(Mandatory)][string]$Service
)
$ErrorActionPreference = 'Stop'
$token = (Get-Content "$HOME/.cloudflare-token" -Raw).Trim()
$h = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$api = 'https://api.cloudflare.com/client/v4'
$zone = (Invoke-RestMethod -Headers $h "$api/zones?name=rndpig.com").result[0]
$acct = $zone.account.id
$tunnels = (Invoke-RestMethod -Headers $h "$api/accounts/$acct/cfd_tunnel?is_deleted=false").result
$tunnel = $tunnels | Where-Object { $_.id -like '89d90e76*' }
if ($null -eq $tunnel) { throw "Tunnel 89d90e76* not found. Found: $($tunnels | ForEach-Object { $_.id })" }

$cfg = (Invoke-RestMethod -Headers $h "$api/accounts/$acct/cfd_tunnel/$($tunnel.id)/configurations").result.config
$backupDir = Join-Path $PSScriptRoot 'backups'
New-Item -ItemType Directory -Force $backupDir | Out-Null
$backupFile = Join-Path $backupDir ("tunnel-config-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".json")
$cfg | ConvertTo-Json -Depth 20 | Out-File -Encoding utf8 $backupFile
Write-Host "Backup: $backupFile"

if (@($cfg.ingress | Where-Object { $_.hostname -eq $Hostname }).Count -gt 0) { Write-Host "$Hostname already routed; nothing to do"; exit 0 }
$rules = @($cfg.ingress)
$newRule = [pscustomobject]@{ hostname = $Hostname; service = $Service }
# insert before the trailing catch-all (last element, no hostname)
$cfg.ingress = @($rules[0..($rules.Count - 2)]) + @($newRule) + @($rules[-1])
$body = @{ config = $cfg } | ConvertTo-Json -Depth 20
$r = Invoke-RestMethod -Method Put -Headers $h -Body $body "$api/accounts/$acct/cfd_tunnel/$($tunnel.id)/configurations"
if (-not $r.success) { throw ($r.errors | ConvertTo-Json) }
Write-Host "Ingress now:" ; $r.result.config.ingress | ForEach-Object { Write-Host "  $($_.hostname) -> $($_.service)" }
Write-Host "ROLLBACK: PUT the backup file's contents wrapped as { config: ... } to the same endpoint."
