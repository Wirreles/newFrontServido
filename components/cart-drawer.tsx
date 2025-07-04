"use client"

import type React from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Minus, Trash2, X, Loader2, ShoppingBag } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { ApiService } from "@/lib/services/api"
import type { CartItem } from "@/contexts/cart-context"

interface GroupedItems {
  [sellerId: string]: CartItem[]
}

export function CartDrawer() {
  const { items, removeFromCart, clearCart, getItemQuantity, getTotalPrice } = useCart()
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const groupedItems = items.reduce<GroupedItems>((acc, item) => {
    if (!acc[item.sellerId]) {
      acc[item.sellerId] = []
    }
    acc[item.sellerId].push(item)
    return acc
  }, {})

  const handleCheckout = async (sellerItems: CartItem[], sellerId: string) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar la compra",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      // Crear preferencia de pago para todos los items del vendedor
      const response = await ApiService.createPayment({
        productId: sellerItems.map(item => item.id).join(','),
        quantity: sellerItems.reduce((total, item) => total + item.quantity, 0),
        vendedorId: sellerId,
        // items: sellerItems.map(item => ({ 
        //   name: item.name,
        //   unit_price: item.discountedPrice,
        //   quantity: item.quantity,
        // })),
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
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-navbar-foreground hover:bg-purple-700 p-1">
          <ShoppingCart className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
              {items.reduce((total, item) => total + item.quantity, 0)}
            </span>
            )}
          </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Carrito de Compras</SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          {Object.entries(groupedItems).map(([sellerId, sellerItems]) => (
            <div key={sellerId} className="mb-8 border-b pb-4">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">Vendedor</h3>
              {sellerItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    {item.imageUrl && (
                      <div className="w-12 h-12 relative rounded-md overflow-hidden">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          layout="fill"
                          objectFit="cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.appliedCoupon && item.discountedPrice < item.price ? (
                          <>
                            <span className="line-through mr-1">${item.price.toFixed(2)}</span>
                            <span className="font-semibold text-green-600">${item.discountedPrice.toFixed(2)}</span> x {item.quantity}
                          </>
                        ) : (
                          `$${item.price.toFixed(2)} x ${item.quantity}`
                        )}
                      </p>
                      {item.appliedCoupon && (
                        <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">
                          Cupón:{" "}
                          {item.appliedCoupon.discountType === "percentage"
                            ? `${item.appliedCoupon.discountValue}% OFF`
                            : `$${item.appliedCoupon.discountValue.toFixed(2)} OFF`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between items-center font-semibold text-base mt-4">
                <span>Subtotal Vendedor:</span>
                <span>
                  ${sellerItems.reduce((total, item) => total + (item.discountedPrice * item.quantity), 0).toFixed(2)}
                </span>
              </div>
              <Button
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                onClick={() => handleCheckout(sellerItems, sellerId)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  `Pagar $${sellerItems.reduce((total, item) => total + (item.discountedPrice * item.quantity), 0).toFixed(2)}`
                )}
              </Button>
            </div>
          ))}
          {items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No hay productos en el carrito</p>
              <Button asChild>
                <Link href="/products">
                  Explorar productos
                </Link>
              </Button>
            </div>
          ) : (
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center font-bold text-lg mb-4">
                <span>Total del Carrito:</span>
                <span>${getTotalPrice().toFixed(2)}</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={clearCart}
              >
                Vaciar Carrito
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
