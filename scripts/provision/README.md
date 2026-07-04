# Provisioning scripts — new *.rndpig.com app

Run from PowerShell in this directory, in order. Each script is standalone
and re-runnable. Companion playbook: `../../docs/SUBDOMAIN_SETUP.md`.

| Script | What it does |
|---|---|
| 00-preflight.ps1 -Port NNNN | Verifies gh/firebase/cloudflare/ssh access + port free on dilger |
| 10-dns.ps1 -Name x -Type CNAME -Content y | Adds one DNS record to zone rndpig.com |
| 11-tunnel-ingress.ps1 -Hostname h -Service url | Adds an ingress rule to the dashboard-managed tunnel (with backup) |

Steps that stay manual (browser) are listed in each app's
`docs/provisioning-log.md` and summarized in SUBDOMAIN_SETUP.md.
