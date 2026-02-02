/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "@supabase/supabase-js"],
  
  // 1. SATISFACER A TURBOPACK (Next.js 16)
  // Esto quita el ERROR de la terminal y permite convivir con reglas de webpack
  turbopack: {}, 

  // 2. MANTENER WEBPACK (Para builds de producción o si desactivas turbopack)
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = config.watchOptions ?? {};
      const prev = config.watchOptions.ignored;
      const ignored = Array.isArray(prev) ? prev : prev != null ? [prev] : [];
      config.watchOptions.ignored = [...ignored, '**/.cursor/**'];
    }
    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'bgtapcutchryzhzooony.supabase.co' },
      { protocol: 'https', hostname: 'fhwfdwrrnwkbnwxabkcq.supabase.co' },
      { protocol: 'https', hostname: 'zen.pro' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google OAuth avatars
    ],
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "250mb",
    },
    proxyClientMaxBodySize: "250mb",
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;