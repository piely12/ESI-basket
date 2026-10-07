import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Anti-clickjacking, anti-injection de <base>, formulaires uniquement vers ce site.
];

const supabaseHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname;
  } catch {
    return '*.supabase.co';
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: supabaseHostname,
      pathname: '/storage/v1/object/public/**',
    }],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/login", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }] },
      { source: "/premiere-connexion", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
