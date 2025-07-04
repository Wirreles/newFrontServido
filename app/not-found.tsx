"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  const router = useRouter()
  const { currentUser, authLoading } = useAuth()

  let dashboardPath = "/login"
  if (currentUser && currentUser.role === "seller") dashboardPath = "/dashboard/seller"
  if (currentUser && currentUser.role === "user") dashboardPath = "/dashboard/buyer"

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <h1 className="text-5xl font-bold text-orange-600">404</h1>
      <h2 className="text-2xl font-semibold">Esta función no existe o está en desarrollo</h2>
      <p className="text-gray-600 max-w-md">
        La página que intentaste visitar no está disponible. Si crees que esto es un error, por favor revisa la URL o vuelve a tu panel principal.
      </p>
      <Button onClick={() => router.push(dashboardPath)} className="mt-4 px-6 py-2 text-lg">
        Ir a mi Dashboard
      </Button>
    </div>
  )
} 