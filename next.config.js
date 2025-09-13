/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    
    // 1. Mejora en el manejo de dependencias (transpilation)
    transpilePackages: ['lucide-react'],

    // 2. Optimización de compilación
    compiler: {
      removeConsole: process.env.NODE_ENV === "production",
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

      // 5. Corrected Dev Indicators
      devIndicators: {
        position: 'bottom-right',
      },

      // 6. Allow cross-origin requests in development (CORRECTED PLACEMENT)
      allowedDevOrigins: [
          "https://3001-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev",
          "https://9000-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev"
      ],
};

module.exports = nextConfig;
