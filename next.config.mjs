/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Deshabilitar optimización de imágenes para evitar límites de Vercel
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
    ],
  },
  // Configuración optimizada para Vercel
  trailingSlash: false, // Vercel maneja esto automáticamente
  // Mantener rewrites para la API de MercadoPago
  async rewrites() {
    return [
      {
        source: '/api/mercadopago/:path*',
        destination: 'https://5318-2803-9800-b8ca-7f5c-250c-fcf5-7ea3-8941.ngrok-free.app/:path*',
        basePath: false
      }
    ]
  }
}

export default nextConfig
