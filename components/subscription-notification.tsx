"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, X } from "lucide-react"

interface SubscriptionNotificationProps {
  status: 'success' | 'failure'
  onClose: () => void
}

export function SubscriptionNotification({ status, onClose }: SubscriptionNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-hide after 8 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for animation to complete
    }, 8000)

    return () => clearTimeout(timer)
  }, [onClose])

  if (!isVisible) return null

  const isSuccess = status === 'success'

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-2 duration-300">
      <Card className={`w-96 shadow-2xl border-0 ${isSuccess ? 'bg-gradient-to-r from-green-50 to-green-100' : 'bg-gradient-to-r from-red-50 to-red-100'}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}>
                {isSuccess ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <XCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className={`font-semibold text-lg ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                  {isSuccess ? '¡Suscripción exitosa!' : 'Suscripción fallida'}
                </h3>
                <p className={`text-sm mt-1 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                  {isSuccess 
                    ? 'Tu suscripción ha sido activada correctamente. Ya puedes disfrutar de todos los beneficios.'
                    : 'No se pudo procesar tu suscripción. Por favor, intenta nuevamente o contacta soporte.'
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false)
                setTimeout(onClose, 300)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {isSuccess && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span>Ya tienes disponible la creacion de los servicios</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 