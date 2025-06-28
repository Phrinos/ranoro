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
  webpack: (config, { isServer }) => {
    // Fix for a build error with Handlebars, a dependency of Genkit.
    // Webpack doesn't support `require.extensions`, which Handlebars uses.
    if (isServer) {
      config.externals.push('handlebars');
    }
    return config;
  },
};

module.exports = nextConfig;
