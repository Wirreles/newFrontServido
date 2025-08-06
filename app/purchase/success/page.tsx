"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Home, ShoppingBag, Package } from "lucide-react"
import Link from "next/link"

export default function PurchaseSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [purchaseData, setPurchaseData] = useState<{
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
      setPurchaseData({
        paymentId: paymentId || undefined,
        orderId: orderId || undefined,
        amount: amount || undefined
      })
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            {/* Iconos de celebración */}
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="text-4xl">🎉</div>
              <div className="relative">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <div className="text-4xl">🎉</div>
            </div>

            {/* Mensaje principal */}
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ¡Felicitaciones!
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Tu compra fue un éxito.
            </p>

            {/* Mensaje descriptivo */}
            <p className="text-gray-500 mb-8 leading-relaxed">
              Ya dimos el primer paso para que tu producto llegue a tus manos.
            </p>

            {/* Información adicional si existe */}
            {purchaseData.paymentId && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">ID de Pago:</span> {purchaseData.paymentId}
                </p>
                {purchaseData.orderId && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Orden:</span> {purchaseData.orderId}
                  </p>
                )}
                {purchaseData.amount && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Monto:</span> ${purchaseData.amount}
                  </p>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-3">
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
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
            </div>

            {/* Mensaje adicional */}
            <p className="text-xs text-gray-400 mt-6">
              Recibirás un email de confirmación con los detalles de tu compra.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 