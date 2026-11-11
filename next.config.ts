import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 * Static (cache-friendly) policy. Next.js hydration requires inline scripts unless every
 * page is rendered dynamically with a per-request nonce; see docs/SECURITY.md for the
 * nonce-based upgrade path. Everything else is locked to the minimum origins Firebase
 * Auth / Firestore need.
 */
// Google AdSense + its consent (Funding Choices) message. Ads load only on /tools and /guides.
const ADS = {
  script: "https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.adtrafficquality.google https://www.googletagservices.com https://fundingchoicesmessages.google.com https://*.google.com",
  frame: "https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://*.adtrafficquality.google https://www.google.com https://fundingchoicesmessages.google.com",
  connect: "https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.adtrafficquality.google https://*.doubleclick.net https://*.google.com https://fundingchoicesmessages.google.com",
};

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://checkout.razorpay.com ${ADS.script}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://apis.google.com https://api.razorpay.com https://lumberjack.razorpay.com " + ADS.connect +
    (isDev ? " ws: http://localhost:* http://127.0.0.1:*" : ""),
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com https://api.razorpay.com https://checkout.razorpay.com " + ADS.frame,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://api.razorpay.com\"), usb=()" },
  // Google sign-in popups need to talk back to the opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  images: { formats: ["image/avif", "image/webp"] },
  serverExternalPackages: ["firebase-admin"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
