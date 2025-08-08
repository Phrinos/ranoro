/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ajustes de compilación
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // 2. Indicador de dev
  devIndicators: {
    position: 'bottom-right',
  },

  // 3. Imágenes remotas
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
    ],
  },
  
  // 4. Configuración de desarrollo
  experimental: {
    allowedDevOrigins: [
      "https://*.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev",
    ],
  },
  
  // 5. CORS global (ajustado para desarrollo)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },

  // 6. Webpack config
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /require.extensions is not supported by webpack. Use a loader instead./,
    ];
    return config;
  }
};

module.exports = nextConfig;
