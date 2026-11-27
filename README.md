# VibeVoice

Private, ephemeral voice rooms for a self-hosted LiveKit OSS deployment.

## Privacy Model

- No accounts.
- No database.
- No stored rooms.
- No stored text messages.
- No audio, screen-share, or call recording in the app.
- Text chat is sent through LiveKit data packets and only lives in connected browser memory.

A public notice lives at `/privacy`. Set `PRIVACY_CONTACT` (an email address) in `deploy/.env` to show a contact line on it. Nginx Proxy Manager's default logrotate keeps access logs about 5 weeks and error logs about 10 weeks, which is what the notice states (change the notice if you change that); LiveKit logs at `warn` and container logs are size-capped in `deploy/docker-compose.yml`.

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
