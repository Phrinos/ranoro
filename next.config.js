/** @type {import('next').NextConfig} */
const nextConfig = {
  // 👇 Dominios que podrán hacer peticiones internas en modo desarrollo
  //    (sin protocolo ni puerto; puedes usar comodines con *.sub.dominio)
  allowedDevOrigins: [
    'localhost',                       // accesos directos (http://localhost:3000)
    '*.cloudworkstations.dev',         // tu URL de Cloud Workstations
  ],

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
    ],
  },
};

module.exports = nextConfig;
