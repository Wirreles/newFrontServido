"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Tag, X, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Coupon {
  id: string
  code: string
  name: string
  description?: string | null
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchase?: number | null
  maxDiscount?: number | null
  usageLimit?: number | null
  usedCount?: number
  applicableTo: "all" | "sellers" | "buyers"
  sellerId?: string | null // Campo para cupones específicos de vendedor
  startDate?: any | null
  endDate?: any | null
  isActive: boolean
  createdAt: any
}

interface CouponInputProps {
  onCouponApplied?: (coupon: Coupon) => void
  onCouponRemoved?: () => void
  appliedCoupon?: Coupon | null
  subtotal: number
  className?: string
  items?: Array<{ sellerId: string; id: string; name: string }> // Items en el carrito para validar vendedor
}

export function CouponInput({ 
  onCouponApplied, 
  onCouponRemoved, 
  appliedCoupon, 
  subtotal,
  className = "",
  items = []
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const validateCoupon = async (code: string): Promise<Coupon | null> => {
    try {
      // Obtener el sellerId del primer item en el carrito (asumiendo que todos son del mismo vendedor)
      const sellerId = items.length > 0 ? items[0].sellerId : null
      
      // Construir la URL con el sellerId si está disponible
      const url = sellerId 
        ? `/api/coupons/validate?code=${encodeURIComponent(code)}&sellerId=${encodeURIComponent(sellerId)}`
        : `/api/coupons/validate?code=${encodeURIComponent(code)}`
      
      // Validar cupón usando la API
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al validar el cupón')
      }
      
      return data.coupon
    } catch (error) {
      console.error('Error validating coupon:', error)
      // Si la API no está disponible, simular validación para desarrollo
      if (error instanceof Error && error.message.includes('fetch')) {
        // Simulación para desarrollo - remover en producción
        const mockCoupons = [
          {
            id: '1',
            code: 'DESCUENTO20',
            name: 'Descuento del 20%',
            description: 'Descuento del 20% en toda la compra',
            discountType: 'percentage' as const,
            discountValue: 20,
            minPurchase: 1000,
            maxDiscount: 500,
            usageLimit: 100,
            usedCount: 50,
            applicableTo: 'buyers' as const,
            sellerId: null,
            isActive: true,
            createdAt: new Date()
          },
          {
            id: '2',
            code: 'FIXED50',
            name: 'Descuento fijo $50',
            description: 'Descuento fijo de $50 en compras mayores a $500',
            discountType: 'fixed' as const,
            discountValue: 50,
            minPurchase: 500,
            maxDiscount: null,
            usageLimit: 50,
            usedCount: 25,
            applicableTo: 'buyers' as const,
            sellerId: null,
            isActive: true,
            createdAt: new Date()
          }
        ]
        
        const mockCoupon = mockCoupons.find(c => c.code === code.toUpperCase())
        if (mockCoupon) {
          return mockCoupon
        }
      }
      throw error
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError("Por favor ingresa un código de cupón")
      return
    }

    // Validar que todos los items sean del mismo vendedor si hay items
    if (items.length > 0) {
      const firstSellerId = items[0].sellerId
      const allSameSeller = items.every(item => item.sellerId === firstSellerId)
      
      if (!allSameSeller) {
        setError("Los cupones solo se pueden aplicar a productos del mismo vendedor")
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const coupon = await validateCoupon(couponCode.trim().toUpperCase())
      
      if (!coupon) {
        setError("Cupón no encontrado")
        return
      }

      // Validar si el cupón está activo
      if (!coupon.isActive) {
        setError("Este cupón no está activo")
        return
      }

      // Validar que el cupón sea específico del vendedor si hay items
      if (items.length > 0 && coupon.sellerId) {
        const firstSellerId = items[0].sellerId
        if (coupon.sellerId !== firstSellerId) {
          setError("Este cupón no es válido para productos de este vendedor")
          return
        }
      }

      // Validar fechas del cupón
      const now = new Date()
      if (coupon.startDate) {
        const startDate = coupon.startDate.toDate ? coupon.startDate.toDate() : new Date(coupon.startDate)
        if (startDate > now) {
          setError("Este cupón aún no está disponible")
          return
        }
      }
      if (coupon.endDate) {
        const endDate = coupon.endDate.toDate ? coupon.endDate.toDate() : new Date(coupon.endDate)
        if (endDate < now) {
          setError("Este cupón ha expirado")
          return
        }
      }

      // Validar monto mínimo de compra
      if (coupon.minPurchase && subtotal < coupon.minPurchase) {
        setError(`Monto mínimo requerido: $${coupon.minPurchase.toLocaleString('es-AR')}`)
        return
      }

      // Validar límite de uso
      if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
        setError("Este cupón ha alcanzado su límite de uso")
        return
      }

      // Aplicar cupón
      onCouponApplied?.(coupon)
      setCouponCode("")
      
      toast({
        title: "✅ Cupón aplicado",
        description: `${coupon.name} - ${coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `$${coupon.discountValue}`} de descuento`,
        duration: 3000,
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al aplicar el cupón"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    onCouponRemoved?.()
    toast({
      title: "Cupón removido",
      description: "El cupón ha sido removido de tu compra",
      duration: 2000,
    })
  }

  const calculateDiscount = (coupon: Coupon, total: number): number => {
    if (coupon.discountType === "percentage") {
      const discount = total * (coupon.discountValue / 100)
      return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount
    } else {
      return Math.min(coupon.discountValue, total)
    }
  }

  const discountAmount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal) : 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Cupón de Descuento
        </CardTitle>
        <CardDescription>
          Ingresa un código de cupón para obtener descuentos en tu compra
          {items.length > 0 && (
            <span className="block text-xs text-gray-500 mt-1">
              💡 Los cupones solo se pueden aplicar a productos del mismo vendedor
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appliedCoupon ? (
          // Cupón aplicado
          <div className="space-y-3">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{appliedCoupon.name}</strong>
                    {appliedCoupon.description && (
                      <p className="text-sm text-green-700">{appliedCoupon.description}</p>
                    )}
                    {appliedCoupon.sellerId && (
                      <p className="text-xs text-green-600">Cupón específico del vendedor</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {appliedCoupon.discountType === "percentage" 
                      ? `${appliedCoupon.discountValue}% OFF` 
                      : `$${appliedCoupon.discountValue} OFF`
                    }
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Descuento aplicado:</span>
              <span className="font-bold text-green-600">
                -${discountAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveCoupon}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Remover Cupón
            </Button>
          </div>
        ) : (
          // Campo para aplicar cupón
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="coupon-code" className="sr-only">
                  Código de cupón
                </Label>
                <Input
                  id="coupon-code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Ingresa tu código de cupón"
                  className="uppercase"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleApplyCoupon}
                disabled={loading || !couponCode.trim()}
                className="shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  "Aplicar"
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-gray-500">
              <p>• Los cupones son válidos para una sola compra</p>
              <p>• Algunos cupones pueden tener restricciones de monto mínimo</p>
              <p>• Los descuentos se aplican antes de impuestos y envío</p>
              {items.length > 0 && (
                <p>• Los cupones solo se pueden aplicar a productos del mismo vendedor</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 