# VibeVoice

Private, ephemeral voice rooms for a self-hosted LiveKit OSS deployment.

## Privacy Model

- No accounts.
- No database.
- No stored rooms.
- No stored text messages.
- No audio, screen-share, or call recording in the app.
- Text chat is sent through LiveKit data packets and only lives in connected browser memory.

A public notice lives at `/privacy`. Set `PRIVACY_CONTACT` (an email address) in `/opt/vibevoice/.env` on the server to show a contact line on it. Nginx Proxy Manager's default logrotate keeps access logs about 5 weeks and error logs about 10 weeks, which is what the notice states (change the notice if you change that); LiveKit logs at `warn` and container logs are size-capped in `deploy/docker-compose.yml`.

The app still depends on your infrastructure. Disable or minimize ingress, proxy, and LiveKit logs if IP addresses and timestamps are also considered sensitive in your threat model.

## Required Services

Run LiveKit OSS separately on your infrastructure. This app only creates short-lived room tokens and connects browsers to your LiveKit server.

Do not use LiveKit Cloud for this project if the requirement is that no data or metadata leaves your servers. Also make sure your LiveKit deployment uses your own ICE/STUN/TURN configuration. Avoid public STUN services such as Google STUN, and prefer LiveKit's self-hosted TURN setup or your own coturn instance.

The web app does not load remote fonts, CDNs, analytics, or third-party runtime assets.

## Environment

Copy `.env.example` to `.env.local` for local development and set:

- `APP_SECRET`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

## Server setup that `deploy/deploy.sh` does not do

`deploy.sh` ships the app image, `docker-compose.yml` and `livekit.yaml`. These steps live only on the server, so repeat them on a new machine (all as root, on the Docker host).

**1. UDP receive buffer.** LiveKit asks for a 5 MB UDP buffer; Linux defaults to about 0.2 MB and LiveKit logs "UDP receive buffer is too small".

```bash
printf '# LiveKit recommends a 5 MB UDP receive buffer\nnet.core.rmem_max=5000000\n' > /etc/sysctl.d/99-livekit.conf
sysctl --system
```

**2. Certificate for TURN/TLS.** Add these to `/opt/vibevoice/.env` (never committed). Only the one certificate named here is mounted into LiveKit; other domains' keys stay hidden.

```
NPM_LETSENCRYPT_DIR=<folder NPM mounts at /etc/letsencrypt>
NPM_CERT_ID=<lk.agiledeck.org folder under live/, e.g. npm-8>
```

Find the folder with `openssl x509 -in <dir>/live/npm-N/fullchain.pem -noout -ext subjectAltName`, and use the same `npm-N` in the `turn:` paths of `deploy/livekit.yaml`. Without these two lines the compose file mounts an empty placeholder and TURN/TLS has no certificate.

**3. Router/firewall.** Forward `3478/udp` and `5349/tcp` to the server (media ports 7881/tcp and 7882/udp as before).

**4. After each certificate renewal** (about every 60 days) LiveKit must be restarted, because it reads the certificate only at startup:

```bash
cd /opt/vibevoice && docker compose restart livekit
```

## Development

```bash
npm install
npm run dev
```

## ARM64 Docker Build

```bash
docker buildx build --platform linux/arm64 -t vibevoice:arm64 .
```

Run the image with the required environment variables and expose port `3000`.
