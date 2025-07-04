import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/contexts/cart-context"
import { AuthProvider } from "@/contexts/auth-context" // Import AuthProvider
import { Header } from "@/components/layout/header" // Import Header
import { TabBar } from "@/components/layout/tab-bar" // Import TabBar

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
        <AuthProvider>
          <CartProvider>
            <Header /> {/* Global Header */}
            <main className="flex-1 pb-16">{children}</main> {/* Add padding-bottom for tab bar */}
            <TabBar /> {/* Global Tab Bar */}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
