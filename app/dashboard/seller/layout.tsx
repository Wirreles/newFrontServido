"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push("/login")
      } else if (currentUser.role !== "seller") {
        router.push("/")
      }
    }
  }, [currentUser, authLoading, router])

  if (authLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    )
  }

  return <>{children}</>
} 