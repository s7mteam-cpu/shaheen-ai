import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Invoices (PDF/photo) are uploaded through a server action. Vercel caps a request at 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  poweredByHeader: false,
  // Security headers on every page: no framing (clickjacking), no MIME sniffing, HTTPS only, minimal referrer, no unused device access.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(self), microphone=(self)" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      ],
    }];
  },
};

export default nextConfig;
