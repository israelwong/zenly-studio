/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "@supabase/supabase-js"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bgtapcutchryzhzooony.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'fhwfdwrrnwkbnwxabkcq.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'zen.pro',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Aumentar límite de tamaño para Server Actions (subida de archivos)
  // Necesario para videos de hasta 200MB
  experimental: {
    serverActions: {
      bodySizeLimit: "250mb",
    },
    // Límite para proxy/middleware (Next.js 16+ usa proxyClientMaxBodySize)
    proxyClientMaxBodySize: "250mb",
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
