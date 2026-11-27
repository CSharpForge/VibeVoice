import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next.js emits inline bootstrap scripts, so script-src needs 'unsafe-inline'
// (a nonce-based CSP would force every page to be dynamic). Everything else
// is locked down. connect-src allows wss:/https: because the LiveKit server
// URL is a runtime setting that is not known at build time.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: mediastream:",
  `connect-src 'self' wss: https:${isDev ? " ws:" : ""}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  // The app needs the mic and screen capture for itself; nothing else.
  {
    key: "Permissions-Policy",
    value:
      "microphone=(self), display-capture=(self), camera=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
