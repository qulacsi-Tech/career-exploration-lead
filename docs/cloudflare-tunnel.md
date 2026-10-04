# Cloudflare Tunnel for career.qualcsi.com

This replaces the public ports, the DNS A record and the Let's Encrypt step in
`docs/deployment-guide.md`. Cloudflare serves HTTPS to visitors, and a small
connector on the server pulls traffic in over an outbound connection. The
server then needs **no inbound web ports at all**, only SSH.

Use it for testing now. It works the same for a production launch.

## What changes from the main guide

| Main guide | With the tunnel |
|---|---|
| Security group: HTTP 80 and HTTPS 443 open | Close both. Keep SSH from your IP only. |
| UFW: `allow 80/tcp`, `allow 443/tcp` | Skip those two lines. Keep `OpenSSH`. |
| DNS: A record `career` → Elastic IP | Created by the tunnel's public hostname (step T3). |
| Part 9: `up -d caddy`, check certificate in logs | `up -d caddy cloudflared`, check the tunnel is connected (step T5). |
| `ACME_EMAIL` in `.env` | Replaced by `CLOUDFLARE_TUNNEL_TOKEN`. |

Everything else in the guide still applies.

## Before you start

- `qualcsi.com` must be managed by Cloudflare DNS. In Cloudflare, *Add a site* →
  `qualcsi.com` → change the nameservers at your registrar to the two Cloudflare
  gives you. Cloudflare sets up the hostname automatically once this is active.
  If you cannot move the domain, see the note at the end of step T3.
- A free Cloudflare account is enough.

## T1. Create the tunnel (Cloudflare dashboard)

1. Go to **one.dash.cloudflare.com** and choose your account.
2. **Networks → Connectors → Cloudflare Tunnels → Create a tunnel**.
3. Connector type: **Cloudflared**. Name: `career-demo`. **Save tunnel**.
4. On the *Install and run a connector* screen, choose **Docker**. Copy only the
   token: the long value that starts with `eyJ` after `--token`. Do **not** run
   the install command. The compose file already runs the connector.
5. Keep this page open for step T3.

## T2. Put the token on the server

On the server:

```bash
cd /opt/career-platform/deploy
nano .env
```

Set the line (replace the placeholder with the token you copied):

```
CLOUDFLARE_TUNNEL_TOKEN=eyJ...your-token...
```

Remove or ignore the old `ACME_EMAIL` line. Save and exit, then:

```bash
chmod 600 .env
```

## T3. Add the public hostname

Back on the tunnel page, **Public hostname → Add a public hostname**:

- Subdomain: `career`
- Domain: `qualcsi.com`
- Path: leave empty
- Service type: **HTTP**
- URL: **`caddy:80`**

Save. Cloudflare creates the DNS record automatically.

*If the domain is not on Cloudflare DNS:* create a **CNAME** record instead,
name `career`, target `<tunnel-id>.cfargotunnel.com` (the tunnel ID is shown on
the tunnel page), with the proxy turned on (orange cloud).

## T4. Close the public web ports on AWS and on the server

These are the security wins. Do them after the tunnel works, or you will lose
access while testing.

- **AWS:** EC2 → Security Groups → `career-web` → delete the HTTP 80 and HTTPS 443
  rules. Keep SSH from **My IP**.
- **Server:**
  ```bash
  sudo ufw delete allow 80/tcp
  sudo ufw delete allow 443/tcp
  sudo ufw status verbose    # only OpenSSH should be allowed
  ```

## T5. Start the proxy and the connector (on the server)

```bash
cd /opt/career-platform/deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build db backend caddy cloudflared
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=30 cloudflared
```

Check: the `cloudflared` log contains `Registered tunnel connection` (four lines
are normal). On the dashboard, the tunnel shows status **Healthy**.

Then check the API through the public address, from the server:

```bash
curl -s https://career.qualcsi.com/api/ping
```

Check: `{"status":"ok"}`.

## T6. Build and start the website

The frontend build fetches pages from the public API, so the tunnel must be up
first (step T5).

```bash
cd /opt/career-platform/deploy
docker compose -f docker-compose.prod.yml --env-file .env build frontend
docker compose -f docker-compose.prod.yml --env-file .env up -d frontend
docker compose -f docker-compose.prod.yml ps
```

Check: every service shows `Up`.

## T7. Test it

From your laptop, check each address:

- `https://career.qualcsi.com` — home page, padlock from Cloudflare
- `https://career.qualcsi.com/api/v1/home` — JSON with `"success": true`
- `https://career.qualcsi.com/courses`, `/compare`, `/search?q=mba`, `/sitemap.xml`
- `https://career.qualcsi.com/exams/cat/practice` — open a paper and submit it
- `https://career.qualcsi.com/admin` — redirects to login; log in with the demo admin

Then run the same checks from a phone on mobile data, which is a different network.

## T8. Optional: keep the demo private while testing

Cloudflare Access puts a login screen in front of the whole site, so only the
people you list can see it.

1. Zero Trust → **Access → Applications → Add an application → Self-hosted**.
2. Application domain: `career.qualcsi.com`. Session duration: 24 hours.
3. Policy: name `testers`, action **Allow**, Include → **Emails** → the testers' addresses.
4. Save. Visitors enter their email and receive a one-time code.

Remove the application when you want the site public.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `cloudflared` keeps restarting, log says `token` | The token is wrong or has spaces. Re-copy it into `.env`, then `up -d cloudflared`. |
| Tunnel shows **Down** or **Inactive** | `docker compose ... logs cloudflared`. Usually the token is for a different tunnel. |
| Domain shows Cloudflare error 1033 or 502 | `caddy` or `frontend` is not running: `docker compose ... ps`. |
| Page loads but API calls fail | The public hostname service must be `http://caddy:80`, not the frontend or backend. Check in the tunnel's Public hostname settings. |
| Login works, then logs out after a while | Expected after `ACCESS_TOKEN_EXPIRE_MINUTES` (480 minutes in the template). |
