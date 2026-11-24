# CI/CD and environments: dev and production

Two sites run on one server (`167.172.94.99`), each with its own database, uploaded images and secrets:

| | Branch | Address | Checkout on the server | Docker project |
|---|---|---|---|---|
| **Production** | `main` | https://topcollegepath.com | `/opt/career-platform` | `career-platform` |
| **Dev** | `dev` | https://dev.topcollegepath.com | `/opt/career-platform-dev` | `career-dev` |

## How a change reaches the site

```
feature branch ──PR──▶ dev ──PR──▶ main
                        │            │
                  checks pass   checks pass
                        ▼            ▼
              dev.topcollegepath.com   topcollegepath.com
```

1. Work on a branch and open a pull request **into `dev`**. The checks run (nothing is deployed).
2. Merge it. The checks run again, and if they pass, **dev.topcollegepath.com** is updated within a few minutes. Test it there.
3. When dev looks right, open a pull request **from `dev` into `main`**. (A pull request into `main` from any other branch is refused by the check "Only dev may be merged into main".)
4. Merge it. The checks run again, and if they pass, **topcollegepath.com** is updated.

The checks (`.github/workflows/ci.yml`):

- **Backend:** compiles, runs every migration on an empty database, seeds it, runs the tests, boots the API and calls it, builds the Docker image.
- **Frontend:** route types and TypeScript.
- **Deploy files:** the shell scripts parse, the compose files and the Caddyfile are valid.

The deploy step connects to the server over SSH and runs `deploy/deploy.sh`. It builds only what changed (`backend/` or `frontend/`), applies migrations, restarts the API, then the website, and checks that both answer. **If any step fails, it puts the previous version back**, so the site keeps running the last good commit. The workflow then calls the live address as a final smoke test.

## One-time setup

Do these once, in this order. Steps 1 to 4 need the server; 5 to 8 are on GitHub.

### 1. DNS (GoDaddy)

Add an **A record**: name `dev`, value `167.172.94.99`. The existing record for `topcollegepath.com` stays. Caddy gets a free HTTPS certificate for each name automatically once it resolves.

### 2. Server: bring the production checkout up to date

```bash
ssh root@167.172.94.99
cd /opt/career-platform && git pull origin main
```

The production database and uploads are kept: the volumes keep their names (`career-platform_pgdata`, `career-platform_uploads`). Check that `/opt/career-platform/deploy/.env` has `DOMAIN=topcollegepath.com` and `ACME_EMAIL=...` (see `deploy/.env.example`), and that `backend.env` has `CORS_ORIGINS=https://topcollegepath.com`.

### 3. Server: create the dev checkout

```bash
git clone git@github.com:qulacsi-Tech/career-exploration-lead.git /opt/career-platform-dev
cd /opt/career-platform-dev
git checkout dev                      # the dev branch must exist on GitHub first (step 5)
cp deploy/.env.example deploy/.env
cp deploy/backend.env.example deploy/backend.env
```

(If the clone is refused, use the same deploy key as the production checkout: `GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy'`, or copy that checkout's `git config core.sshCommand`.)

Edit both files for dev. **Use different passwords and secrets than production:**

- `deploy/.env`: `DOMAIN=dev.topcollegepath.com`, a new `POSTGRES_PASSWORD` (letters and digits only), optionally `BACKEND_WORKERS=1`.
- `deploy/backend.env`: `DATABASE_URL` with that password, a new `SECRET_KEY` (`openssl rand -hex 32`), `CORS_ORIGINS=https://dev.topcollegepath.com`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the dev admin.

Generate secrets with `openssl rand -hex 32`.

### 4. Server: let CI in, and only for deploying

On your laptop, create a key used for nothing else:

```bash
ssh-keygen -t ed25519 -f career-ci-deploy -C github-actions-deploy -N ""
```

Add this **one line** to `/root/.ssh/authorized_keys` on the server (the public key is the contents of `career-ci-deploy.pub`):

```
restrict,command="/opt/career-platform/deploy/ci-entry.sh" ssh-ed25519 AAAA...your-public-key... github-actions-deploy
```

`restrict` and `command=` mean this key can run exactly one thing, `deploy prod|dev <commit>`, and cannot open a shell. Then also get the server's host key:

```bash
ssh-keyscan -t ed25519 167.172.94.99
```

### 5. GitHub: the `dev` branch and protection

- Create the branch: `git push origin main:dev` (or create `dev` in the GitHub UI from `main`).
- *Settings > Branches*: protect **`main`** and **`dev`**. For each: require a pull request, and require these status checks to pass: **Backend (migrate, seed, boot)**, **Frontend (typecheck)**, **Deploy files (scripts, compose, Caddy)**. For `main`, also require **Only dev may be merged into main**. Do not allow direct pushes.

### 6. GitHub: secrets

*Settings > Secrets and variables > Actions > New repository secret*:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `167.172.94.99` |
| `DEPLOY_SSH_KEY` | the contents of `career-ci-deploy` (the **private** key file) |
| `DEPLOY_HOST_KEY` | the line printed by `ssh-keyscan` in step 4 |
| `DEPLOY_USER` | optional, defaults to `root` |

Then delete the private key file from your laptop, or keep it in a password manager.

### 7. GitHub: optional approval gate for production

*Settings > Environments > production > Required reviewers*. The deploy to topcollegepath.com then waits for someone to click Approve. The `development` environment needs no gate.

### 8. First deploys, and demo data for dev

Merge this change into `dev` (deploys dev), then from `dev` into `main` (deploys production). **Deploy production first if you can**: it starts Caddy, which dev needs for its HTTPS certificate. The first dev deploy takes a few minutes because it builds everything.

After the first dev deploy, fill the dev database with the sample content once:

```bash
cd /opt/career-platform-dev/deploy
docker compose -p career-dev -f docker-compose.app.yml --env-file .env exec backend python seed.py
```

**Sign in with Google:** in Google Cloud, add `https://dev.topcollegepath.com` to the OAuth client's *Authorized JavaScript origins*.

## Day to day

| I want to... | Do this |
|---|---|
| Ship a change to the dev site | PR into `dev`, merge. |
| Ship to production | PR from `dev` into `main`, merge. |
| See what is running | `cat /opt/career-platform/deploy/last-deploy.txt` (and the dev checkout's) |
| Follow a deploy | The **Actions** tab on GitHub shows the whole run. |
| Roll production back | Re-run the last good *CI/CD* workflow run on `main` from the Actions tab (*Re-run all jobs*). Or revert the merge on `main`. |
| Check the containers | `cd /opt/career-platform/deploy && docker compose -p career-platform -f docker-compose.app.yml --env-file .env ps` (use `-p career-dev` and the dev checkout for dev) |
| Read logs | the same command with `logs --tail=100 backend` (or `frontend`); Caddy: `docker compose -p career-edge -f docker-compose.edge.yml --env-file .env logs --tail=100 caddy` |
| Back up | `deploy/backup.sh` (prod) or `deploy/backup.sh dev`. Add a cron line, see the header of the script. |

## Good to know

- **Memory.** Two environments plus Caddy need about 4 GB of RAM at least, and building the website needs more while it runs. A 2 GB droplet is not enough for both; resize to 4 GB (or 8 GB, as the cost plan recommends). Until then, run dev with `BACKEND_WORKERS=1`.
- **Dev can slow production** because they share one machine. For heavy testing, move dev to its own droplet: the scripts do not change, only the host in `DEPLOY_HOST` for the dev job.
- **Migrations are not undone on rollback.** A failed deploy restores the previous code, but a migration that already ran stays. Write migrations so the previous code still works with them (add columns, do not drop them in the same release).
- **A few seconds of downtime** when the website container restarts. The API restarts the same way.
- **dev is hidden from search engines** (`X-Robots-Tag: noindex` in `deploy/caddy/Caddyfile`). It is public; add basic auth in the Caddyfile if it must be private.
- **The old auto-deploy timer was removed.** If anyone installed it on the server, disable it: `systemctl disable --now career-deploy.timer`. Two deployers would fight.
- **Changing the Caddyfile** goes out with the next production deploy (Caddy reloads without dropping connections, and a faulty file is refused and rolled back).
