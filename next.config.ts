import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Origin the browser talks to directly (multi-stage login + presigned uploads).
const apiOrigin =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

/**
 * Content-Security-Policy.
 * 'unsafe-inline' scripts/styles are required — Next emits inline hydration
 * chunks (and the inline theme script) without nonces. 'unsafe-eval' is only
 * needed by React Refresh in dev. Uploads may live on the API origin or an
 * arbitrary S3/R2 host, hence https: for img/media/connect.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "frame-src 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: https: ${apiOrigin}`,
  `media-src 'self' blob: https: ${apiOrigin}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' ${apiOrigin} https:${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking backstop for older browsers (frame-ancestors covers modern).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // QR attendance check-in needs the camera; everything else stays off.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework to scanners.
  poweredByHeader: false,

  // lucide-react ships ~4k icon modules behind a single barrel file —
  // let the compiler rewrite `import { X } from "lucide-react"` to
  // direct imports so dev pages don't compile thousands of modules.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
