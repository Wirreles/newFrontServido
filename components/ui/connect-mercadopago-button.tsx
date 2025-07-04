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

  // Log para ver si el componente se monta
  console.log("[ConnectMercadoPagoButton] Componente montado");

  const handleConnect = async () => {
    console.log("[ConnectMercadoPagoButton] Click en el botón");
    setIsLoading(true)
    try {
      if (!currentUser) {
        console.log("[ConnectMercadoPagoButton] No hay usuario autenticado");
        throw new Error("Debes iniciar sesión para conectar tu cuenta de MercadoPago.")
      }
      // Obtener el token de Firebase del usuario 
      console.log("[ConnectMercadoPagoButton] currentUser:", currentUser);
      const tokenFirebase = await currentUser?.firebaseUser.getIdToken(true)
      console.log("[ConnectMercadoPagoButton] Token Firebase:", tokenFirebase);
      if (!tokenFirebase) {
        throw new Error("No se pudo obtener el token de autenticación.")
      }
      // Usa la variable de entorno estándar
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      console.log("[ConnectMercadoPagoButton] BACKEND URL:", backendUrl);
      if (!backendUrl) {
        throw new Error("No se encontró la URL del backend en las variables de entorno (NEXT_PUBLIC_BACKEND_URL).")
      }
      // Llama al endpoint del backend real
      const response = await fetch(`${backendUrl}/api/mercadopago/oauth-url`, {
        headers: {
          'Authorization': `Bearer ${tokenFirebase}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      console.log("[ConnectMercadoPagoButton] Respuesta del backend:", response);
      if (!response.ok) {
        const errorText = await response.text();
        console.log("[ConnectMercadoPagoButton] Error del backend:", errorText);
        throw new Error(`Error del backend: ${errorText}`);
      }
      const data = await response.json();
      console.log("[ConnectMercadoPagoButton] Data recibida:", data);
      if (!data.authUrl) throw new Error("No se recibió la URL de autorización");
      // Guardar flag para refrescar al volver
      localStorage.setItem("mp_connecting", "1");
      window.location.href = data.authUrl;
    } catch (error) {
      console.log("[ConnectMercadoPagoButton] Error en handleConnect:", error);
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