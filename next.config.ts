import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Invoices (PDF/photo) are uploaded through a server action. Vercel caps a request at 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
