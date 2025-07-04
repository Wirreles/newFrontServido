"use client"

import Link from "next/link"
import { Home, User, LogOut, BellRing, Package } from "lucide-react" // Added Package icon
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"

export function TabBar() {
  const { currentUser, authLoading, handleLogout, getDashboardLink } = useAuth()
  const pathname = usePathname()

  const tabItems = [
    {
      name: "Inicio",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      name: "Productos",
      icon: Package, // Changed icon to Package for "Products"
      href: "/products", // Link to the new products page
      active: pathname.startsWith("/products") || pathname.startsWith("/product") || pathname.startsWith("/category"),
    },
    {
      name: "Notificaciones",
      icon: BellRing,
      href: "/notifications",
      active: pathname === "/notifications",
    },
    {
      name: "Mi Cuenta",
      icon: User,
      href: getDashboardLink(),
      active: pathname.startsWith("/dashboard") || pathname.startsWith("/admin"),
    },
  ]

  // Add logout only if user is logged in
  if (currentUser) {
    tabItems.push({
      name: "Cerrar Sesión",
      icon: LogOut,
      href: "#",
      active: false,
      action: handleLogout,
    } as any)
  }

  if (authLoading) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg lg:hidden">
      <nav className="flex h-16 items-center justify-around px-1 max-w-screen-sm mx-auto">
        {tabItems.map((item) => {
          if (item.action) {
            return (
              <Button
                key={item.name}
                variant="ghost"
                size="sm"
                className={`flex flex-col gap-0.5 text-xs h-full min-w-0 flex-1 px-1 py-2 ${
                  item.active ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600"
                }`}
                onClick={item.action}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate text-[10px] leading-tight">{item.name}</span>
              </Button>
            )
          }
          return (
            <Link key={item.name} href={item.href} className="flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col gap-0.5 text-xs h-full w-full min-w-0 px-1 py-2 ${
                  item.active ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600"
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate text-[10px] leading-tight">{item.name}</span>
              </Button>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
