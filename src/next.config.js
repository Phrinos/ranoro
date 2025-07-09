/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  dev: {
    // This allows connections from the cloud workstation that hosts the IDE
    allowedDevOrigins: ['https://*.cloudworkstations.dev'],
  },

  async headers() {
    return [
      {
        // matching all API routes
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // Permite cualquier origen
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
  webpack: (config, { isServer }) => {
    // Exclude `handlebars` from server-side bundling to prevent webpack errors.
    // Genkit's dependency `dotprompt` uses `handlebars` in a way that's not
    // fully compatible with Next.js's server-side webpack configuration.
    if (isServer) {
      config.externals.push({
        'handlebars': 'commonjs handlebars',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
