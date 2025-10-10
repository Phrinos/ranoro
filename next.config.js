
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
  
  // 4. CORS global (ajustado para desarrollo)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },

  // 5. Configuración para Turbopack (compatible con la configuración de Webpack existente)
  experimental: {
    turbopack: {
      webpack: {
        config: (config, { isServer }) => {
          config.ignoreWarnings = [
            ...(config.ignoreWarnings || []),
            /require.extensions is not supported by webpack. Use a loader instead./,
          ];
          
          if (!isServer) {
            config.watchOptions = {
              poll: 1000,
              aggregateTimeout: 300,
            };
          }
          
          return config;
        }
      }
    }
  }
};

export default nextConfig;
