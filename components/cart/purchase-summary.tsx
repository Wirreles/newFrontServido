"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Users, Calculator, DollarSign, Truck } from "lucide-react"
import { getCartPurchaseSummary } from "@/lib/centralized-payments-api"
import { formatPrice, formatPriceNumber } from "@/lib/utils"

interface PurchaseSummaryProps {
  cartItems: Array<{
    id: string
    name: string
    price: number
    discountedPrice: number
    quantity: number
    sellerId: string
    freeShipping?: boolean
    shippingCost?: number
  }>
  className?: string
}

export function PurchaseSummary({ cartItems, className = "" }: PurchaseSummaryProps) {
  const summary = getCartPurchaseSummary(cartItems)
  
  // Calcular envío total
  const totalShipping = cartItems.reduce((total, item) => {
    // Si el producto tiene envío gratis, no agregar costo
    if (item.freeShipping) {
      return total
    }
    // Si tiene costo de envío definido, agregarlo
    if (item.shippingCost !== undefined && item.shippingCost > 0) {
      return total + item.shippingCost
    }
    // Si no tiene envío gratis ni costo definido, no agregar nada
    return total
  }, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Resumen de Compra Centralizada
        </CardTitle>
        <CardDescription>
          Detalles de tu compra con múltiples vendedores
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Resumen general */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">{summary.totalItems} Productos</p>
              <p className="text-xs text-gray-500">Items en total</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">{summary.totalVendors} Vendedores</p>
              <p className="text-xs text-gray-500">Diferentes tiendas</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Breakdown por vendedor */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Desglose por Vendedor</h4>
          {summary.vendorBreakdown.map((vendor: any, index: number) => (
            <div key={vendor.vendorId} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Vendedor {index + 1}</Badge>
                  <span className="text-sm">{vendor.itemCount} items</span>
                </div>
                <span className="font-medium">{formatPriceNumber(vendor.subtotal)}</span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPriceNumber(vendor.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comisión (12%):</span>
                  <span>-{formatPriceNumber(vendor.commission)}</span>
                </div>
                <div className="flex justify-between font-medium text-green-600">
                  <span>Para vendedor:</span>
                  <span>{formatPriceNumber(vendor.netAmount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Totales finales */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Subtotal:</span>
            <span className="font-medium">{formatPriceNumber(summary.subtotal)}</span>
          </div>
          
          {totalShipping > 0 && (
            <div className="flex justify-between items-center text-blue-600">
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Envío:</span>
              </div>
              <span className="font-medium">{formatPriceNumber(totalShipping)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center text-purple-600">
            <div className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              <span className="text-sm">Comisión total (12%):</span>
            </div>
            <span className="font-medium">{formatPriceNumber(summary.commission)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center text-lg font-bold">
            <div className="flex items-center gap-1">
              <DollarSign className="h-5 w-5" />
              <span>Total a pagar:</span>
            </div>
            <span>{formatPriceNumber(summary.total + totalShipping)}</span>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Sistema centralizado:</strong> Los pagos se procesan a través de nuestra cuenta oficial de MercadoPago. 
            Los vendedores recibirán sus pagos según la configuración establecida, descontando la comisión del 12%.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 