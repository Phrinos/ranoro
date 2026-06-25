/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /landing era una copia duplicada de la home; consolidar en "/".
      { source: "/landing", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Las páginas de servicio compartido (/s/:id) contienen datos del cliente (PII)
        // y no deben indexarse. X-Robots-Tag funciona sin depender de JS.
        source: "/s/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
