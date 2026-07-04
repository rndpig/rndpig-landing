# Hands-Off Provisioning — Service Account + REST APIs

**Last updated:** 2026-07-03
**Status:** Reference / target design. The service account and roles are **not
yet created** — this documents the correct way to eliminate the two remaining
manual browser steps when provisioning a new `*.rndpig.com` app.
**Companion:** `SUBDOMAIN_SETUP.md` (the end-to-end playbook) and
`scripts/provision/` (the PowerShell scripts).

## Why this exists

Provisioning a new app is almost fully scripted (see `scripts/provision/`):
GitHub repo, Cloudflare DNS + tunnel ingress, Firebase project, dilger systemd.
Two steps historically required a human in the Firebase **console**:

1. Registering `<app>.rndpig.com` as a **Firebase Hosting custom domain**.
2. Adding `<app>.rndpig.com` + `<app>-rnp.web.app` to the **authorized domains**
   of the shared auth project `rndpig-admin`.

We tried to automate these by driving a browser (superpowers-chrome). That path
is a **dead end**: the automation browser launches with `--disable-extensions`,
so 1Password — and therefore 1Password-stored passkeys — cannot run in it, and
Google sign-in defaults to passkey-first. You cannot log the automation browser
into Google without the very credential manager the browser can't host.

The correct fix is to stop using a browser for config. Both steps have first-class
**REST APIs** that a **service account** can call headlessly — no passkey, no
interactive login, no human. That is the genuinely hands-off path.

## The two APIs

### 1. Firebase Hosting custom domain

- **Create:** `POST https://firebasehosting.googleapis.com/v1beta1/projects/{PROJECT}/sites/{SITE}/customDomains?customDomainId={DOMAIN}`
  - `{PROJECT}` and `{SITE}` are both the app's hosting project, e.g. `home-rnp`.
  - `{DOMAIN}` is the FQDN, e.g. `home.rndpig.com`.
  - Body (optional): a `CustomDomain` object. On the Spark (free) plan set
    `{"certPreference": "GROUPED"}`. `validateOnly=true` does a dry run.
  - Returns a long-running **operation**.
- **Poll the operation** until `done: true`, then **GET the domain**:
  `GET https://firebasehosting.googleapis.com/v1beta1/projects/{PROJECT}/sites/{SITE}/customDomains/{DOMAIN}`
  and read:
  - `requiredDnsUpdates` — the DNS records Firebase wants (desired vs. discovered).
    Apply each via the existing `10-dns.ps1`.
  - `ownershipState`, `hostState`, `cert.state` (`CERT_ACTIVE`, `PROPAGATING`, …),
    `issues[]`. Poll GET until `hostState` is active and `cert.state` is
    `CERT_ACTIVE`.
- Docs: [projects.sites.customDomains](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/projects.sites.customDomains)

> **Note on the deer/dinner pattern.** Existing frontends resolve via a *proxied
> Cloudflare CNAME* `→ <app>-rnp.web.app`. The custom-domain registration is what
> makes Firebase answer for that Host; the CNAME is what routes to it. With the
> API flow, create the custom domain first, satisfy any `requiredDnsUpdates`
> (usually a TXT ownership record + the A/CNAME target), then the proxied CNAME
> can stay as-is. Mirror a known-good domain (`deer.rndpig.com`) if in doubt.

### 2. Authorized domains (Firebase Auth on rndpig-admin)

Authorized domains live on the **shared auth project `rndpig-admin`**, not the
app's hosting project. The Config is read-modify-write (the PATCH replaces the
whole list), so GET first, append, then PATCH.

- **Read:** `GET https://identitytoolkit.googleapis.com/admin/v2/projects/rndpig-admin/config`
- **Write:** `PATCH https://identitytoolkit.googleapis.com/admin/v2/projects/rndpig-admin/config?updateMask=authorizedDomains`
  - Body: `{"authorizedDomains": ["localhost", "rndpig-admin.firebaseapp.com", …, "home.rndpig.com", "home-rnp.web.app"]}`
    — the **full** desired list (existing entries + the two new ones).
  - `updateMask=authorizedDomains` ensures nothing else in the auth config is touched.
- Scopes: one of `identitytoolkit`, `firebase`, `cloud-platform`.
- Docs: [projects.updateConfig](https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects/updateConfig)

## Service account setup (one-time)

Two projects are involved, so the cleanest model is **one service account per
concern**, or a single SA granted roles on both projects. Least privilege:

| Capability | Project | IAM role |
|---|---|---|
| Create/read Hosting custom domains | the app's hosting project (e.g. `home-rnp`) | `roles/firebasehosting.admin` |
| Read/patch authorized domains | `rndpig-admin` | `roles/firebaseauth.admin` (or `roles/identityplatform.admin`) |

The Hosting role is per-app (granted on each new hosting project). The auth role
is granted **once** on `rndpig-admin` and reused by every app.

```bash
# Create a provisioning service account (do this in a project you control, e.g. rndpig-admin)
gcloud iam service-accounts create rndpig-provisioner \
  --project=rndpig-admin \
  --display-name="rndpig app provisioner"

SA="rndpig-provisioner@rndpig-admin.iam.gserviceaccount.com"

# Auth-config role on the shared auth project (once)
gcloud projects add-iam-policy-binding rndpig-admin \
  --member="serviceAccount:$SA" --role="roles/firebaseauth.admin"

# Hosting-admin role on each app's hosting project (per app)
gcloud projects add-iam-policy-binding home-rnp \
  --member="serviceAccount:$SA" --role="roles/firebasehosting.admin"

# Key — store on dilger only, NEVER in the repo
gcloud iam service-accounts keys create rndpig-provisioner.json --iam-account="$SA"
```

Store `rndpig-provisioner.json` on dilger (e.g. `/home/rndpig/.secrets/`),
`chmod 600`, referenced by path via an env var. Treat it like any other secret:
never commit it, never paste it into chat. Rotate per the portfolio key-rotation
policy.

## Getting an access token in PowerShell

Two options:

- **gcloud (simplest for a dev-machine run):**
  ```powershell
  gcloud auth activate-service-account --key-file="$env:RNDPIG_SA_KEY"
  $token = & gcloud auth print-access-token   # pipe directly into the call; avoid long-lived vars
  ```
- **Signed JWT → token exchange (no gcloud dependency):** build a JWT from the
  key's `client_email`/`private_key` with `aud=https://oauth2.googleapis.com/token`
  and the needed scope, POST it to the token endpoint. Use a small helper (the
  `google-auth` Python lib does this in three lines) rather than hand-rolling JWT
  signing in PowerShell.

> On the dev machine, minting a raw token into a variable can trip credential
> guards. Prefer running these scripts on **dilger** (where the SA key lives and
> where the deploy already happens), or pipe the token straight into the request
> without materializing it.

## End-to-end flow for a new app

1. `00-preflight.ps1`, `10-dns.ps1` (frontend + api CNAMEs), `11-tunnel-ingress.ps1`
   — as today.
2. `firebase projects:create <app>-rnp` + first `firebase deploy` — as today.
3. **`20-firebase-custom-domain.ps1 -Project <app>-rnp -Domain <app>.rndpig.com`**
   — create custom domain, poll, apply any `requiredDnsUpdates` via `10-dns.ps1`,
   poll to `CERT_ACTIVE`.
4. **`21-auth-authorized-domain.ps1 -Domains <app>.rndpig.com,<app>-rnp.web.app`**
   — GET rndpig-admin config, append, PATCH.
5. dilger backend deploy + smoke test — as today.

With steps 3–4 scripted, **zero** browser/console steps remain. The only
human-in-the-loop is the final "sign in and eyeball the app" acceptance check,
which is a *verification*, not a provisioning action.

## What this buys

The manual console steps were the single remaining hands-off gap in app creation
(see `home-maintenance/docs/provisioning-log.md`). Closing it via the API is what
makes the "create a new app end to end" workflow genuinely one-command. The
browser-automation detour proved a useful negative result: **don't fight an
interactive auth wall — go around it with a service account.**

## Stub scripts

`scripts/provision/20-firebase-custom-domain.ps1` and
`scripts/provision/21-auth-authorized-domain.ps1` implement the two flows. They
are **unverified pending the service-account creation above** — run them with
`-WhatIf`/`validateOnly` first, confirm the request/response shapes against the
live API, then remove the "UNVERIFIED" banner.

## Sources

- [Firebase Hosting REST — projects.sites.customDomains](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/projects.sites.customDomains)
- [Firebase Hosting customDomains (python-api-client reference)](https://googleapis.github.io/google-api-client/docs/dyn/firebasehosting_v1beta1.projects.sites.customDomains.html)
- [Identity Platform — projects.updateConfig](https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects/updateConfig)
