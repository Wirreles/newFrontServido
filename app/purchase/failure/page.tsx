"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { XCircle, Home, RefreshCw, HelpCircle } from "lucide-react"
import Link from "next/link"

export default function PurchaseFailurePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [failureData, setFailureData] = useState<{
    paymentId?: string
    orderId?: string
    errorMessage?: string
  }>({})

  useEffect(() => {
    // Obtener datos de la URL si existen
    const paymentId = searchParams.get('payment_id')
    const orderId = searchParams.get('external_reference')
    const errorMessage = searchParams.get('error_message')

    if (paymentId || orderId || errorMessage) {
      setFailureData({
        paymentId: paymentId || undefined,
        orderId: orderId || undefined,
        errorMessage: errorMessage || undefined
      })
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            {/* Icono de error */}
            <div className="flex justify-center items-center mb-6">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <XCircle className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Mensaje principal */}
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ¡Ups! Algo salió mal
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Tu compra no pudo ser procesada.
            </p>

            {/* Mensaje descriptivo */}
            <p className="text-gray-500 mb-8 leading-relaxed">
              No te preocupes, no se realizó ningún cargo. Puedes intentar nuevamente o contactarnos si el problema persiste.
            </p>

            {/* Información adicional si existe */}
            {failureData.paymentId && (
              <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-200">
                <p className="text-sm text-red-700">
                  <span className="font-semibold">ID de Pago:</span> {failureData.paymentId}
                </p>
                {failureData.orderId && (
                  <p className="text-sm text-red-700">
                    <span className="font-semibold">Orden:</span> {failureData.orderId}
                  </p>
                )}
                {failureData.errorMessage && (
                  <p className="text-sm text-red-700 mt-2">
                    <span className="font-semibold">Error:</span> {failureData.errorMessage}
                  </p>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-3">
              <Button asChild className="w-full bg-red-600 hover:bg-red-700">
                <Link href="/cart">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar nuevamente
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Volver al inicio
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/contact">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Necesito ayuda
                </Link>
              </Button>
            </div>

            {/* Mensaje adicional */}
            <p className="text-xs text-gray-400 mt-6">
              Si tienes problemas, contacta a nuestro soporte técnico.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 