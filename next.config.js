/** @type {import('next').NextConfig} */
const nextConfig = {
  serverComponentsExternalPackages: ["handlebars"],
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
  allowedDevOrigins: [
    "https://3000-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev",
    "https://3001-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev",
    "https://3002-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev",
    "https://6000-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev",
    "https://9000-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev",
    "https://9002-firebase-studio-1750318222114.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev"
  ],
};

module.exports = nextConfig;
