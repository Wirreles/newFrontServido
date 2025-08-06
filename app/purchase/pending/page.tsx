"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Home, Package, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function PurchasePendingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pendingData, setPendingData] = useState<{
    paymentId?: string
    orderId?: string
    amount?: string
  }>({})

  useEffect(() => {
    // Obtener datos de la URL si existen
    const paymentId = searchParams.get('payment_id')
    const orderId = searchParams.get('external_reference')
    const amount = searchParams.get('transaction_amount')

    if (paymentId || orderId || amount) {
      setPendingData({
        paymentId: paymentId || undefined,
        orderId: orderId || undefined,
        amount: amount || undefined
      })
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            {/* Icono de pendiente */}
            <div className="flex justify-center items-center mb-6">
              <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Clock className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Mensaje principal */}
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Pago en proceso
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Tu compra está siendo procesada.
            </p>

            {/* Mensaje descriptivo */}
            <p className="text-gray-500 mb-8 leading-relaxed">
              Estamos verificando tu pago. Esto puede tomar unos minutos. Te notificaremos cuando se complete la transacción.
            </p>

            {/* Información adicional si existe */}
            {pendingData.paymentId && (
              <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">ID de Pago:</span> {pendingData.paymentId}
                </p>
                {pendingData.orderId && (
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Orden:</span> {pendingData.orderId}
                  </p>
                )}
                {pendingData.amount && (
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Monto:</span> ${pendingData.amount}
                  </p>
                )}
              </div>
            )}

            {/* Estado del proceso */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-sm text-blue-700 font-medium">
                Procesando pago...
              </p>
            </div>

            {/* Botones de acción */}
            <div className="space-y-3">
              <Button asChild className="w-full bg-yellow-600 hover:bg-yellow-700">
                <Link href="/dashboard/buyer">
                  <Package className="w-4 h-4 mr-2" />
                  Ver mis compras
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Volver al inicio
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/dashboard/buyer">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar estado
                </Link>
              </Button>
            </div>

            {/* Mensaje adicional */}
            <p className="text-xs text-gray-400 mt-6">
              Si el pago no se procesa en 24 horas, contacta a nuestro soporte.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 