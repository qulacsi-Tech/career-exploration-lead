> **Superseded.** For the Cloudflare Tunnel setup, use `docs/Career-Platform-Deployment-Guide.pdf` (step-by-step for beginners) and `docs/cloudflare-tunnel.md`. The Caddy/Let's Encrypt steps below apply only if you stop using the tunnel.

# Deployment guide: AWS EC2 (Ubuntu) with career.qualcsi.com

This deploys the whole platform on one EC2 server:

- **Frontend** (Next.js) at `https://career.qualcsi.com`, the public site and admin panel
- **API** (FastAPI) at `https://career.qualcsi.com/api/v1`, on the same domain
- **Database** (PostgreSQL 16) inside the server, not reachable from the internet
- **Caddy** in front, which issues and renews the TLS certificate automatically

Estimated time: 1.5 to 2 hours the first time. Commands marked **(server)** run on the EC2 machine. Commands marked **(laptop)** run on your own computer.

---

## Part 0. Before you start

You need:

- An AWS account with permission to create EC2 instances and Elastic IPs
- Control of DNS for `qualcsi.com` (Route 53, or wherever the domain is managed)
- Read access to the GitHub repository `qulacsi-Tech/career-exploration-lead`
- A strong password manager entry for the demo admin account

Decide now:

| Question | Recommendation for a demo |
|---|---|
| Where is the database? | Inside the server (this guide). Move to Amazon RDS later for production. |
| Instance size | `t3.medium` (2 vCPU, 4 GB). The Next.js build needs the memory, plus swap (step 6). |
| Demo data | The seeded content is sample data. Say so to viewers. Real enquiries should not go through the demo. |

Cost: a `t3.medium` in `ap-south-1` (Mumbai) is roughly US$30 a month, plus about US$4 a month for the Elastic IP and storage. Stop the instance when it is not needed for a demo.

---

## Part 1. Create the server (AWS console)

1. **Region:** choose `ap-south-1` (Mumbai) or another region close to your users. Keep it the same for every resource below.
2. **EC2 → Key pairs → Create key pair.** Name it `career-demo`, type `ED25519`, format `.pem`. Download it and keep it private.
3. **EC2 → Security groups → Create security group** named `career-web`:
   - Inbound: **SSH (22)** from **My IP** only
   - Inbound: **HTTP (80)** from `0.0.0.0/0`
   - Inbound: **HTTPS (443)** from `0.0.0.0/0`
   - Outbound: all traffic (default)
4. **EC2 → Instances → Launch instance:**
   - Name: `career-demo`
   - AMI: **Ubuntu Server 24.04 LTS** (64-bit x86)
   - Instance type: **t3.medium**
   - Key pair: `career-demo`
   - Network settings: select `career-web`
   - Storage: **30 GiB gp3**
   - Launch.
5. **EC2 → Elastic IPs → Allocate Elastic IP address**, then **Associate** it with `career-demo`. Note the address (example below: `13.201.10.25`). Use this Elastic IP everywhere below, not the instance's temporary public address, which changes when the instance restarts.

---

## Part 2. Point the domain at the server (DNS)

1. In your DNS provider, create an **A record**:
   - Name: `career` (the full name is `career.qualcsi.com`)
   - Value: the Elastic IP, for example `13.201.10.25`
   - TTL: 300
2. Wait a few minutes, then check from your laptop **(laptop)**:

   ```bash
   nslookup career.qualcsi.com
   ```

   It must return the Elastic IP. Do not continue until it does. Caddy cannot get a certificate before the name resolves.

---

## Part 3. Connect and prepare Ubuntu

1. Connect **(laptop)**. On Windows, use PowerShell; the `.pem` file must be readable only by you:

   ```bash
   ssh -i career-demo.pem ubuntu@13.201.10.25
   ```

2. Update the system **(server)**:

   ```bash
   sudo apt update && sudo apt -y full-upgrade
   sudo apt -y install ca-certificates curl git ufw fail2ban unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades   # choose Yes
   ```

3. Add swap, so the frontend build does not run out of memory **(server)**:

   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   free -h    # Swap should show 4.0G
   ```

4. Firewall **(server)**. Allow only SSH, HTTP and HTTPS:

   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw --force enable
   sudo ufw status verbose
   ```

5. Harden SSH **(server)**. Make sure your key works in a second terminal first, then:

   ```bash
   sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
   sudo systemctl restart ssh
   ```

---

## Part 4. Install Docker

Use Docker's official repository **(server)**:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and back in so the group change applies, then check **(server)**:

```bash
docker version
docker compose version
docker run --rm hello-world
```

---

## Part 5. Get the code

The repository is private, so use a read-only **deploy key** **(server)**:

```bash
ssh-keygen -t ed25519 -C "career-demo-server" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
```

Copy the printed public key. In GitHub: **repository → Settings → Deploy keys → Add deploy key**, paste it, leave *Allow write access* unticked. Then:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
sudo mkdir -p /opt/career-platform && sudo chown ubuntu:ubuntu /opt/career-platform
git clone git@github.com:qulacsi-Tech/career-exploration-lead.git /opt/career-platform
cd /opt/career-platform
git log --oneline -3
```

From now on, all paths are relative to `/opt/career-platform`.

---

## Part 6. Write the configuration (secrets stay on the server)

1. Generate secrets **(server)**:

   ```bash
   openssl rand -hex 24    # use for POSTGRES_PASSWORD (hex: safe inside a database URL)
   openssl rand -hex 16    # use for the demo admin password
   openssl rand -hex 32    # use for SECRET_KEY
   ```

   Save them in your password manager. Do not commit them.

2. Create the compose environment file **(server)**:

   ```bash
   cd /opt/career-platform/deploy
   cp .env.example .env
   nano .env
   ```

   Set `ACME_EMAIL` to a mailbox you read, `POSTGRES_PASSWORD` and `ADMIN_PASSWORD` to the generated values. `DOMAIN` stays `career.qualcsi.com`.

3. Create the backend file **(server)**:

   ```bash
   cp backend.env.example backend.env
   nano backend.env
   ```

   Replace `CHANGE_ME_SAME_AS_POSTGRES_PASSWORD` with the **same** `POSTGRES_PASSWORD`, and `change-me-to-a-long-random-string` with the generated `SECRET_KEY`. The two passwords must match, or the backend cannot reach the database.

4. Lock the files down **(server)**:

   ```bash
   chmod 600 .env backend.env
   ```

---

## Part 7. Start the database and the API

```bash
cd /opt/career-platform/deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build db backend
docker compose -f docker-compose.prod.yml ps
```

Wait until `db` shows `(healthy)`. Then check the API **(server)**:

```bash
docker compose -f docker-compose.prod.yml logs --tail=30 backend
docker compose -f docker-compose.prod.yml exec backend python -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8000/api/ping').read())"
```

Expected: `{"status":"ok"}`.

---

## Part 8. Create the tables and the demo data (first deploy only)

Seeding writes the sample colleges, exams, courses and content. **Run it once, on an empty database.** Running it again adds duplicate colleges. To start over later, see Part 12.

```bash
cd /opt/career-platform/deploy
set -a; . ./.env; set +a

# 1. Create the tables
docker compose -f docker-compose.prod.yml --env-file .env run --rm backend alembic upgrade head

# 2. Load the sample content and create the demo admin
docker compose -f docker-compose.prod.yml --env-file .env run --rm \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" -e ADMIN_PASSWORD="$ADMIN_PASSWORD" -e ADMIN_NAME="$ADMIN_NAME" \
  backend python seed.py
```

The output should end with `Seed complete.` and show the admin account being created.

---

## Part 9. Build the frontend and start the public site

Start the proxy first. It gets the certificate, and it is needed during the frontend build (see the note in `docker-compose.prod.yml`):

```bash
cd /opt/career-platform/deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d caddy
docker compose -f docker-compose.prod.yml logs --tail=40 caddy
```

Look for `certificate obtained successfully`. If you see errors about the challenge, go back to Part 2 (DNS) and Part 1 (ports 80 and 443 must be open).

Check the API is reachable through the proxy, the same way the build will reach it **(server)**:

```bash
curl -s https://career.qualcsi.com/api/ping
```

Expected: `{"status":"ok"}`. Only continue when this works.

Build and start the frontend. The build takes several minutes on a `t3.medium`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env build frontend
docker compose -f docker-compose.prod.yml --env-file .env up -d frontend
docker compose -f docker-compose.prod.yml ps
```

---

## Part 10. Verify the deployment

From your laptop **(laptop)** check each item. Use a private browser window for the admin checks.

| Check | How | Expected |
|---|---|---|
| HTTPS works | `https://career.qualcsi.com` | Home page, padlock shown |
| Plain HTTP redirects | `http://career.qualcsi.com` | Redirects to HTTPS |
| API works | `https://career.qualcsi.com/api/v1/home` | JSON with `"success": true` |
| Courses | `https://career.qualcsi.com/courses` | Course list |
| Compare | `https://career.qualcsi.com/compare` | Comparison list |
| Search | `https://career.qualcsi.com/search?q=mba` | Matching colleges |
| Practice | `https://career.qualcsi.com/exams/cat/practice` | Test cards; open one and submit a paper |
| Sitemap | `https://career.qualcsi.com/sitemap.xml` | XML with URLs |
| Admin locked | `https://career.qualcsi.com/admin` | Redirects to login |
| Admin login | `/login` with the demo admin email and password | Opens the admin panel |
| Admin edit | Content → Study Abroad, change a word, save, reload | Change shows; change it back |

If a check fails, see the logs:

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 frontend
docker compose -f docker-compose.prod.yml logs --tail=100 backend
docker compose -f docker-compose.prod.yml logs --tail=100 caddy
```

---

## Part 11. Keep it running

**Backups.** Daily at 02:30, keeping 14 copies **(server)**:

```bash
chmod +x /opt/career-platform/deploy/backup.sh
(crontab -l 2>/dev/null; echo '30 2 * * * /opt/career-platform/deploy/backup.sh >> /opt/career-platform/deploy/backups/backup.log 2>&1') | crontab -
/opt/career-platform/deploy/backup.sh     # run once now to test
ls -lh /opt/career-platform/deploy/backups/
```

Copy backups off the server regularly. Either use `aws s3 cp` to a private bucket, or download them to your laptop.

**Updating to a new version** **(server)**:

```bash
cd /opt/career-platform && git pull
cd deploy
docker compose -f docker-compose.prod.yml --env-file .env run --rm backend alembic upgrade head
docker compose -f docker-compose.prod.yml --env-file .env up -d --build backend frontend
```

**Rolling back.** Check out the previous commit and rebuild the same way:

```bash
cd /opt/career-platform && git log --oneline -5
git checkout <previous-commit-hash>
cd deploy && docker compose -f docker-compose.prod.yml --env-file .env up -d --build backend frontend
```

Database migrations are not reversed automatically. If a migration went wrong, restore the database from the last backup (Part 12).

**Restarting after a reboot.** The containers have `restart: unless-stopped`, so they come back on their own. Check after a reboot with `docker compose ... ps`.

**Stopping the demo to save money.** Stop the instance in the EC2 console. The Elastic IP stays attached, so the domain keeps working when you start it again. Stopped instances are not billed for compute, but the Elastic IP is billed while detached.

**Watching disk space.** `df -h` and `docker system df`. Clean old images with `docker image prune -f` after updates.

---

## Part 12. Troubleshooting and reset

| Symptom | Likely cause and fix |
|---|---|
| `certificate` errors in Caddy | DNS not pointing at the Elastic IP yet, or ports 80/443 closed. Fix, then `docker compose ... restart caddy`. |
| Frontend build fails with `fetch failed` | The API was not reachable through the proxy during the build. Run Part 9's `curl` check first. |
| Backend exits with a database error | `POSTGRES_PASSWORD` in `.env` and the password in `backend.env` differ. |
| Login says "Could not sign in" | Wrong admin password, or seeding never ran. Check Part 8. |
| Site shows 502 | The frontend container is down: `docker compose ... logs frontend`. |
| Out of memory during build | Check swap with `free -h`. Add more swap, or temporarily use a larger instance type. |

**Full reset (deletes all data):**

```bash
cd /opt/career-platform/deploy
docker compose -f docker-compose.prod.yml --env-file .env down
docker volume rm career-platform_pgdata
# then repeat Part 8 (migrate and seed)
```

---

## Part 13. Security checklist

- [ ] SSH is key-only, from your IP only (Parts 1 and 3)
- [ ] The database has no published port (`docker-compose.prod.yml`, `db` service)
- [ ] The backend has no published port; only Caddy is public
- [ ] `.env` and `backend.env` are `chmod 600` and never committed (both are in `.gitignore`)
- [ ] `SECRET_KEY`, `POSTGRES_PASSWORD` and the admin password are long random values, not the examples
- [ ] Backups run, and copies exist outside the server
- [ ] Unattended security updates are on (Part 3)

**Known limits for a demo:**

- One server. If it fails, the site is down until it is restarted. There is no failover.
- The API documentation at `/api/docs` is public. For a private demo, you may block `/api/docs` and `/api/redoc` in the `Caddyfile`.
- Public students have no accounts yet, so the site has no sign-in for visitors. Only the admin panel has a login.
- Search uses the database. Meilisearch is not part of this stack.
- Five collections point at ranking lists that do not exist. Visitors see those collections in the editor's fallback order (see the progress document).
- Enquiry forms store real phone numbers. Use test numbers on the demo, or turn the enquiry form off before opening the demo to the public.

---

## Quick reference

```bash
# status and logs
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=100 backend

# restart one service
docker compose -f docker-compose.prod.yml restart frontend

# database shell
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d leadgendb

# backup now
/opt/career-platform/deploy/backup.sh
```
