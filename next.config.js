
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 👇  Aquí, NO dentro de "experimental"
  allowedDevOrigins: [
    'https://3000-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev'
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
