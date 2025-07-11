/** @type {import('next').NextConfig} */
const nextConfig = {
  //--------------------------------------------------------
  // 1.  Ajustes de compilación
  //--------------------------------------------------------
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  //--------------------------------------------------------
  // 2.  Indicador del modo dev (solo puedes cambiar position)
  //--------------------------------------------------------
  devIndicators: {
    position: 'bottom-right',      // válido, reemplaza al viejo buildActivityPosition
  },

  //--------------------------------------------------------
  // 3.  Imágenes remotas permitidas
  //--------------------------------------------------------
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
    ],
  },

  //--------------------------------------------------------
  // 4.  Cabeceras CORS globales
  //--------------------------------------------------------
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin',      value: '*'   },
          { key: 'Access-Control-Allow-Methods',     value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers',     value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },

  //--------------------------------------------------------
  // 5.  Excluir paquetes nativos del bundle de RSC/Webpack
  //     (antes era experimental.serverComponentsExternalPackages)
  //--------------------------------------------------------
  serverExternalPackages: ['handlebars'],
}

module.exports = nextConfig
