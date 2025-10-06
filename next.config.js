/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ajustes de compilación
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // 2. Transpilar paquetes problemáticos
  transpilePackages: [
    '@radix-ui/react-menu',
    '@radix-ui/react-dropdown-menu',
  ],

  // 3. Indicador de dev
  devIndicators: {
    position: 'bottom-right',
  },

  // 4. Imágenes remotas
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
    ],
  },
  
  // 5. CORS global y redirecciones
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
  
  async redirects() {
    return [
      {
        source: '/manifest.json',
        destination: '/404',
        permanent: false,
      },
    ]
  },
};

module.exports = nextConfig;
