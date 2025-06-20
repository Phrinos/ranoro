
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Cache invalidation comment: 2024-07-26 - Review
  typescript: {
    ignoreBuildErrors: !!false, // Changed for production
  },
  eslint: {
    ignoreDuringBuilds: !!false, // Changed for production
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

export default nextConfig;

    