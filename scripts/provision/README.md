# Provisioning scripts — new *.rndpig.com app

Run from PowerShell in this directory, in order. Each script is standalone
and re-runnable. Companion playbook: `../../docs/SUBDOMAIN_SETUP.md`.

| Script | What it does |
|---|---|
| 00-preflight.ps1 -Port NNNN | Verifies gh/firebase/cloudflare/ssh access + port free on dilger |
| 10-dns.ps1 -Name x -Type CNAME -Content y | Adds one DNS record to zone rndpig.com |
| 11-tunnel-ingress.ps1 -Hostname h -Service url | Adds an ingress rule to the dashboard-managed tunnel (with backup) |
| 20-firebase-custom-domain.ps1 -Project p -Domain d | Registers a Hosting custom domain via REST (**UNVERIFIED** — needs the provisioning service account) |
| 21-auth-authorized-domain.ps1 -Domains a,b | Adds authorized domains to rndpig-admin via REST (**UNVERIFIED** — needs the service account) |

## `backups/` is local-only — never commit it

`11-tunnel-ingress.ps1` snapshots the whole tunnel ingress config to `backups/`
before each PUT, so you can roll back. Those snapshots are the full
hostname → `localhost:PORT` map for every app on dilger.

**This repo is a public GitHub Pages site: anything committed here is served at
`rndpig.com/<path>` to anyone.** A backup committed 2026-07-03 was publicly
downloadable until 2026-08-12. `backups/` is now gitignored — keep it that way,
and keep the snapshots on the machine that made them.

Scripts 20–21 replace the two Firebase **console** steps that used to be manual.
They require a one-time service-account setup — see
`../../docs/PROVISIONING_API_AUTOMATION.md`. Until that SA exists and the scripts
are verified, those two steps are done in the owner's browser and logged in each
app's `docs/provisioning-log.md`.
