"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"

export function ConnectMercadoPagoButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { currentUser } = useAuth()

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      if (!currentUser) {
        throw new Error("Debes iniciar sesión para conectar tu cuenta de MercadoPago.")
      }
      // Obtener el token de Firebase del usuario autenticado
      const tokenFirebase = await currentUser.getIdToken()
      if (!tokenFirebase) {
        throw new Error("No se pudo obtener el token de autenticación.")
      }
      // Usa la variable de entorno estándar
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        throw new Error("No se encontró la URL del backend en las variables de entorno (NEXT_PUBLIC_API_URL).")
      }
      // Llama al endpoint del backend real
      const response = await fetch(`${backendUrl}/api/mercadopago/oauth-url`, {
        headers: {
          'Authorization': `Bearer ${tokenFirebase}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del backend: ${errorText}`);
      }
      const data = await response.json();
      if (!data.authUrl) throw new Error("No se recibió la URL de autorización");
      window.location.href = data.authUrl;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo iniciar la conexión con MercadoPago",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? "Conectando..." : "Conectar cuenta de MercadoPago"}
    </Button>
  )
}