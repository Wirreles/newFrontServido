"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { PaymentItem } from "@/types/payments"
import { ApiService } from "@/lib/services/api"
import { formatPriceNumber } from "@/lib/utils"

interface PaymentButtonProps {
  items: PaymentItem[]
  sellerId?: string // Ya no es necesario para el nuevo sistema
  className?: string
}

export function PaymentButton({ items, sellerId, className = "" }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { currentUser } = useAuth()

  const handlePayment = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar una compra",
        variant: "destructive"
      })
      return
    }

    if (!items || items.length === 0) {
      toast({
        title: "Error",
        description: "No hay productos para comprar",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      // Convertir items a formato del backend
      const products = items.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }))

      // Usar el nuevo sistema centralizado con múltiples productos
      const response = await ApiService.createProductPreference({
        products,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || ''
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error("No se recibió el punto de inicio del pago")
      }

      // Mostrar resumen de la compra
      const totalProducts = items.length
      const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
      
      toast({
        title: "✅ Compra creada",
        description: `${totalProducts} producto${totalProducts > 1 ? 's' : ''} - ${formatPriceNumber(totalAmount)}`,
        duration: 3000,
      })

      // Redirigir a MercadoPago
      window.location.href = response.data.init_point
    } catch (error) {
      console.error("Error al procesar el pago:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el pago",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePayment}
      className={className}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        "Pagar"
      )}
    </Button>
  )
} 