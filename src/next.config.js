/** @type {import('next').NextConfig} */
const nextConfig = {
  // ← añade esto en la RAÍZ (no dentro de experimental)
  allowedDevOrigins: [
    // Dominio de Workstations (comodín para cualquier ID)
    'https://3000-*.cloudworkstations.dev',
  ],

  // --- lo que ya tenías ---
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
    ],
  },
};

module.exports = nextConfig;
