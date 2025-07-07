"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { PaymentItem } from "@/types/payments"
import { ApiService } from "@/lib/services/api"

interface PaymentButtonProps {
  items: PaymentItem[]
  sellerId: string
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

    try {
      setLoading(true)

      const response = await ApiService.createPayment({
        productId: items[0].id,
        quantity: items[0].quantity,
        vendedorId: sellerId,
        buyerId: currentUser.firebaseUser.uid
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error("No se recibió el punto de inicio del pago")
      }

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