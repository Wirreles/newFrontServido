"use client"

import { WifiOff, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function OfflinePage() {
  const router = useRouter()

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="text-center max-w-md mx-auto">
        {/* Icono offline */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-12 h-12 text-purple-600" />
          </div>
        </div>

        {/* Título y descripción */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Sin conexión
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Parece que no tienes conexión a internet. 
          Algunas funciones pueden no estar disponibles.
        </p>

        {/* Botones de acción */}
        <div className="space-y-3">
          <Button 
            onClick={handleRefresh}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Reintentar
          </Button>
          
          <Button 
            onClick={handleGoHome}
            variant="outline"
            className="w-full border-purple-200 text-purple-600 hover:bg-purple-50"
            size="lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Ir al inicio
          </Button>
        </div>

        {/* Información adicional */}
        <div className="mt-8 p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-700">
            💡 <strong>Consejo:</strong> Algunas páginas pueden estar disponibles offline 
            si las has visitado antes.
          </p>
        </div>
      </div>
    </div>
  )
}
