"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { currentUser, authLoading, getDashboardLink } = useAuth()

  // Effect to handle redirection after authentication state changes
  useEffect(() => {
    if (!authLoading && currentUser) {
      const redirectPath = getDashboardLink()
      router.push(redirectPath)
    }
  }, [currentUser, authLoading, getDashboardLink, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Redirection is now handled by the useEffect hook after currentUser is set
    } catch (err: any) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Correo electrónico o contraseña incorrectos.")
      } else {
        setError("Error al iniciar sesión. Por favor, inténtalo de nuevo.")
        console.error("Login error:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  // If auth is loading or user is already logged in, show a loading state or nothing
  if (authLoading || currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-center mt-6">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="Servido Logo"
              width={150}
              height={50}
              className="h-auto object-contain"
              priority
            />
          </Link>
        </div>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">Bienvenido de nuevo a Servido.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Iniciar Sesión"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            ¿No tienes una cuenta?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
