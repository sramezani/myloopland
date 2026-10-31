# Deploy: one server, Docker Compose, Cloudflare

myloopland runs on one Ubuntu or Debian server: the app, Postgres and a backup helper in Docker Compose, behind a shared Caddy proxy, behind Cloudflare. `deploy/setup.sh` sets a server up in one command from your Mac; GitHub Actions deploys every merge to `main`. Several sites set up this way **can share one server** (see "Several sites on one server").

The hosted myloopland runs at `https://myloopland.com`, and this page uses that domain. To run your own copy, put your own domain wherever `myloopland.com` appears; nothing in the code names it, since everything follows `APP_URL`.

## Before the first run (once)

**1. A domain on Cloudflare.** Add `myloopland.com` to Cloudflare, then:

- SSL/TLS → Overview: **Full (strict)**.
- SSL/TLS → Origin Server → Create Certificate for `myloopland.com` and `*.myloopland.com`, 15 years. Keep the certificate and the private key; setup asks for both (the key is shown only once).
- Security → WAF → Custom rules: a rule that **skips** the managed rules and bot protection for paths starting with `/mcp`, `/api/auth/` and `/.well-known/`. Claude connects from Anthropic's servers (`160.79.104.0/21`), and a bot check would block it.
- Optional: an API token with "Edit zone DNS" for the zone, so setup points the DNS itself.

**2. Google sign-in.** Google Cloud → APIs & Services:

- OAuth consent screen: app name myloopland, the support email, `https://myloopland.com` as the home page, `https://myloopland.com/privacy` as the privacy policy, and `myloopland.com` as an authorised domain. A logo is optional (`public/logo-120.png`), but uploading one means Google checks the brand first, which takes a few days. Scopes: only `openid`, `email` and `profile`. Set **Publishing status: In production**, so anyone can sign in. Basic scopes need no review.
- Credentials → Create OAuth client → Web application. Redirect URIs: `https://myloopland.com/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for development).

**3. R2 for backups (optional).** Cloudflare → R2: create a bucket, an API token with Object Read & Write for it, and a lifecycle rule that deletes objects after 30 days (the privacy page promises it). Put the four `R2_*` values in `deploy/secrets/app.env` when setup creates it. Without them there are no backups (setup warns).

**4. A server.** Ubuntu 24.04 or Debian 12, 1 GB RAM or more, SSH on port 22, ports 80 and 443 open in the cloud firewall. Or a server that already runs another site set up the same way.

## Run the setup (one command)

```bash
deploy/setup.sh azureuser@<server-ip>
deploy/setup.sh -i ~/path/to/key.pem azureuser@<server-ip>   # with a key file
```

In order, it:

1. Creates `deploy/secrets/app.env` from `.env.example`, with new random secrets.
2. Asks for `APP_URL` (`https://myloopland.com`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and the Cloudflare Origin certificate.
3. Prepares the server: system updates, Docker, firewall, fail2ban, swap, and a `myloopland` user whose SSH key can only deploy.
4. Starts Postgres, the backup helper and the shared proxy. The proxy is created only if it isn't there yet.
5. Restores the newest R2 backup into an empty database.
6. Tells GitHub where to deploy: it sets the secrets `DEPLOY_HOST`, `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS`, and the variables `DEPLOY_PLATFORM` and `APP_URL`. Then it runs the first deploy.
7. With a Cloudflare token, points the DNS.

It is safe to run again. **Keep `deploy/secrets/` in your password manager:** a new server needs it.

Then add the connector in Claude: `https://myloopland.com/mcp` (`docs/mcp.md`).

`https://www.myloopland.com` redirects to `https://myloopland.com` (`deploy/caddy/site.caddy`, with the domain filled in from `APP_URL`).

## Every deploy (automatic)

A merge to `main`:

1. Runs `npm run check`.
2. Builds the image (standalone Next.js on Node 24) with `APP_URL` written in.
3. Sends it to the server over SSH.
4. `myloopland deploy` loads it, runs the migrations on start, and waits for `/api/health`. It goes back to the previous image if the new one isn't healthy.

## On the server

```bash
sudo myloopland status            # containers and health
sudo myloopland logs [app|db|backup|proxy|jobs]
sudo myloopland backup            # back up to R2 now
sudo myloopland restore [--force] # restore the newest backup
sudo myloopland cleanup           # delete expired sessions and Claude tokens now
sudo myloopland stop | start      # the app (Postgres keeps running)
```

Cron (UTC): the backup at 02:00 and the cleanup at 03:30. Backups leave out sessions, Claude's tokens and the token signing keys: after a restore, users sign in and reconnect Claude once.

## Moving to a new server

```bash
deploy/setup.sh azureuser@NEW_IP --from azureuser@OLD_IP
```

The old app stops and backs up; the new server restores it. Point the DNS (or let setup do it), then delete the old server.

## Several sites on one server

Everything myloopland owns is named `myloopland`, so it sits next to other sites:

- the folder `/opt/myloopland`;
- the user `myloopland`;
- the compose project `myloopland`;
- the command `/usr/local/bin/myloopland`;
- the name `myloopland-app` on the shared `web` network;
- its site block `/opt/proxy/etc/sites/myloopland.caddy`;
- its certificate in `/opt/proxy/certs/myloopland/`.

Only the proxy in `/opt/proxy` and the `web` network are shared, and they are created once. A site block the proxy rejects is put back the way it was, so one site never takes the other down.

## Local production image

```bash
docker compose --profile app up --build   # the production image on http://localhost:3000
```

It needs `.env`. The app's database there is the compose `db`.
