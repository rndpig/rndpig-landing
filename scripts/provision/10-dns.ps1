# Add one DNS record to zone rndpig.com.
# Usage: .\10-dns.ps1 -Name home-api -Type CNAME -Content <target> [-Proxied:$false]
param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][ValidateSet('CNAME','A','TXT')][string]$Type,
    [Parameter(Mandatory)][string]$Content,
    [bool]$Proxied = $true
)
$ErrorActionPreference = 'Stop'
if ($Type -eq 'TXT') { $Proxied = $false }   # TXT records cannot be proxied
$token = (Get-Content "$HOME/.cloudflare-token" -Raw).Trim()
$h = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$api = 'https://api.cloudflare.com/client/v4'
$zone = (Invoke-RestMethod -Headers $h "$api/zones?name=rndpig.com").result[0]
$existing = (Invoke-RestMethod -Headers $h "$api/zones/$($zone.id)/dns_records?name=$Name.rndpig.com").result
if ($existing.Count -gt 0) { Write-Host "Record $Name.rndpig.com already exists:"; $existing | ForEach-Object { Write-Host "  $($_.type) -> $($_.content)" }; exit 0 }
$body = @{ type = $Type; name = $Name; content = $Content; proxied = $Proxied; ttl = 1 } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Headers $h -Body $body "$api/zones/$($zone.id)/dns_records"
if (-not $r.success) { throw ($r.errors | ConvertTo-Json) }
Write-Host "Created $Type $Name.rndpig.com -> $Content (proxied=$Proxied)"
