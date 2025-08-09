import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/contexts/cart-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { TabBar } from "@/components/layout/tab-bar"
import { NProgressProvider } from "@/components/providers/nprogress-provider";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Servido - Marketplace de Productos y Servicios",
  description: "Compra y vende productos y servicios en el marketplace más completo",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <NProgressProvider>
          <AuthProvider>
            <CartProvider>
              <Header /> {/* Global Header */}
              <main className="flex-1 pb-16 md:pb-16">{children}</main> {/* Adjusted padding for mobile header */}
              <Footer /> {/* Global Footer */}
              <TabBar /> {/* Global Tab Bar */}
            </CartProvider>
          </AuthProvider>
        </NProgressProvider>
      </body>
    </html>
  )
}
