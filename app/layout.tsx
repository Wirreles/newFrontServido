import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/contexts/cart-context"
import { AuthProvider } from "@/contexts/auth-context"
import { CacheProvider } from "@/contexts/cache-context"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { TabBar } from "@/components/layout/tab-bar"
import { NProgressProvider } from "@/components/providers/nprogress-provider";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Servido - Marketplace de Productos y Servicios",
  description: "Compra y vende productos y servicios en el marketplace más completo de Argentina. Conectamos compradores con vendedores de calidad.",
  generator: 'Next.js',
  manifest: '/manifest.json',
  themeColor: '#8b5cf6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Servido'
  },
  openGraph: {
    title: 'Servido - Marketplace de Productos y Servicios',
    description: 'Tu marketplace confiable para comprar y vender productos y servicios en Argentina',
    url: 'https://www.servido.com.ar',
    siteName: 'Servido',
    images: [
      {
        url: '/images/logo-512.png',
        width: 512,
        height: 512,
        alt: 'Servido Logo'
      }
    ],
    locale: 'es_AR',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Servido - Marketplace de Productos y Servicios',
    description: 'Tu marketplace confiable para comprar y vender productos y servicios en Argentina',
    images: ['/images/logo-512.png']
  },
  icons: {
    icon: [
      { url: '/images/logo.png', sizes: '128x128', type: 'image/png' },
      { url: '/images/logo-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/logo-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/images/logo-192.png', sizes: '192x192', type: 'image/png' }
    ]
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Servido" />
        <link rel="apple-touch-icon" href="/images/logo-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <NProgressProvider>
          <CacheProvider>
            <AuthProvider>
              <CartProvider>
                <Header /> {/* Global Header */}
                <main className="flex-1 pb-16 md:16">{children}</main> {/* Adjusted padding for mobile header */}
                <Footer /> {/* Global Footer */}
                <TabBar /> {/* Global Tab Bar */}
              </CartProvider>
            </AuthProvider>
          </CacheProvider>
        </NProgressProvider>
      </body>
    </html>
  )
}
