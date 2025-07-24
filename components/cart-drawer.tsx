"use client"

import type React from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Minus, Trash2, X, Loader2, ShoppingBag, ArrowLeft } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { ApiService } from "@/lib/services/api"
import type { CartItem } from "@/contexts/cart-context"
import { getCartItemImage } from "@/lib/image-utils"
import { formatPrice, formatPriceNumber } from "@/lib/utils"
import { ShippingForm, type ShippingAddress } from "@/components/cart/shipping-form"

interface GroupedItems {
  [sellerId: string]: CartItem[]
}

export function CartDrawer() {
  const { 
    items, 
    removeFromCart, 
    clearCart, 
    getItemQuantity, 
    getTotalPrice,
    getItemsByVendor,
    getVendorCount,
    getTotalCommission,
    getVendorSubtotal,
    canCreateCentralizedPurchase
  } = useCart()
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  
  // Estados para el formulario de dirección
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [purchaseType, setPurchaseType] = useState<'individual' | 'vendor' | 'all' | null>(null)
  const [purchaseData, setPurchaseData] = useState<{ item?: CartItem; sellerItems?: CartItem[]; sellerId?: string } | null>(null)

  const groupedItems = getItemsByVendor()

  // Función para iniciar el proceso de compra individual
  const handleBuyIndividualItem = (item: CartItem) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar la compra",
        variant: "destructive"
      })
      return
    }

    setPurchaseType('individual')
    setPurchaseData({ item })
    setShowShippingForm(true)
  }

  // Función para procesar la compra individual con dirección
  const processIndividualPurchase = async (address: ShippingAddress) => {
    if (!currentUser || !purchaseData?.item) return

    try {
      setLoadingItems(prev => new Set(prev).add(purchaseData.item!.id))

      // Usar el nuevo sistema centralizado para producto individual
      const response = await ApiService.createSingleProductPurchase({
        productId: purchaseData.item.id,
        quantity: purchaseData.item.quantity,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || '',
        shippingAddress: address
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error("No se recibió el punto de inicio del pago")
      }

      // Remover el item del carrito después de crear la compra
      removeFromCart(purchaseData.item.id)

      toast({
        title: "✅ Compra creada",
        description: `${purchaseData.item.name} - ${formatPriceNumber(purchaseData.item.price * purchaseData.item.quantity)}`,
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
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(purchaseData.item!.id)
        return newSet
      })
      setShowShippingForm(false)
      setPurchaseType(null)
      setPurchaseData(null)
    }
  }

  // Función para iniciar el proceso de compra por vendedor
  const handleBuyVendorItems = (sellerItems: CartItem[], sellerId: string) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar la compra",
        variant: "destructive"
      })
      return
    }

    setPurchaseType('vendor')
    setPurchaseData({ sellerItems, sellerId })
    setShowShippingForm(true)
  }

  // Función para procesar la compra por vendedor con dirección
  const processVendorPurchase = async (address: ShippingAddress) => {
    if (!currentUser || !purchaseData?.sellerItems || !purchaseData?.sellerId) return

    try {
      setLoading(true)

      // Convertir items del vendedor a formato del backend
      const products = purchaseData.sellerItems.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }))

      const response = await ApiService.createMultipleProductsPurchase({
        products,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || '',
        shippingAddress: address
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error("No se recibió el punto de inicio del pago")
      }

      // Remover los items del carrito
      purchaseData.sellerItems.forEach(item => removeFromCart(item.id))

      const totalAmount = purchaseData.sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      
      toast({
        title: "✅ Compra creada",
        description: `${purchaseData.sellerItems.length} productos - ${formatPriceNumber(totalAmount)}`,
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
      setShowShippingForm(false)
      setPurchaseType(null)
      setPurchaseData(null)
    }
  }

  // Función para iniciar el proceso de compra de todos los items
  const handleBuyAllItems = () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar la compra",
        variant: "destructive"
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "No hay productos en el carrito",
        variant: "destructive"
      })
      return
    }

    setPurchaseType('all')
    setPurchaseData({})
    setShowShippingForm(true)
  }

  // Función para procesar la compra de todos los items con dirección
  const processAllItemsPurchase = async (address: ShippingAddress) => {
    if (!currentUser || items.length === 0) return

    try {
      setLoading(true)

      // Convertir todos los items del carrito
      const products = items.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }))

      const response = await ApiService.createMultipleProductsPurchase({
        products,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || '',
        shippingAddress: address
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error("No se recibió el punto de inicio del pago")
      }

      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const vendorCount = getVendorCount()
      
      toast({
        title: "🎉 Compra centralizada creada",
        description: `${items.length} productos de ${vendorCount} vendedor${vendorCount > 1 ? 'es' : ''} - ${formatPriceNumber(totalAmount)}`,
        duration: 5000,
      })

      // Limpiar carrito completo
      clearCart()

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
      setShowShippingForm(false)
      setPurchaseType(null)
      setPurchaseData(null)
    }
  }

  // Función para manejar el envío del formulario de dirección
  const handleShippingFormSubmit = (address: ShippingAddress) => {
    switch (purchaseType) {
      case 'individual':
        processIndividualPurchase(address)
        break
      case 'vendor':
        processVendorPurchase(address)
        break
      case 'all':
        processAllItemsPurchase(address)
        break
    }
  }

  // Función para cancelar el formulario de dirección
  const handleShippingFormCancel = () => {
    setShowShippingForm(false)
    setPurchaseType(null)
    setPurchaseData(null)
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
        {/* Contenido scrollable */}
        <div className="mt-8 max-h-[70vh] overflow-y-auto pr-2">
          {showShippingForm ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShippingFormCancel}
                  className="p-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold">Información de Envío</h3>
              </div>
              <ShippingForm
                onSubmit={handleShippingFormSubmit}
                onCancel={handleShippingFormCancel}
                loading={loading}
              />
            </div>
          ) : (
            <>
              {Object.entries(groupedItems).map(([sellerId, sellerItems]) => (
                <div key={sellerId} className="mb-8 border-b pb-4">
                  <h3 className="font-semibold mb-4 text-sm text-gray-600">Vendedor</h3>
                  {sellerItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 relative rounded-md overflow-hidden">
                          <Image
                            src={getCartItemImage(item.media, item.imageUrl)}
                            alt={item.name}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.appliedCoupon && item.discountedPrice < item.price ? (
                              <>
                                <span className="line-through mr-1">{formatPrice(item.price)}</span>
                                <span className="text-green-600 font-medium">{formatPrice(item.discountedPrice)}</span>
                              </>
                            ) : (
                              `$${formatPrice(item.price)}`
                            )}
                          </p>
                          {/* Condición */}
                          {item.condition && (
                            <p className="text-xs text-gray-500">
                              Condición: {item.condition === 'nuevo' ? 'Nuevo' : 'Usado'}
                            </p>
                          )}
                          {/* Envío */}
                          {item.freeShipping ? (
                            <p className="text-xs text-green-600">Envío gratis</p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              Envío: {item.shippingCost !== undefined ? formatPrice(item.shippingCost) : '-'}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">Cantidad: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Botón de eliminar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {/* Subtotal por vendedor (solo visual, sin botón de compra por vendedor) */}
                  <div className="bg-gray-50 p-3 rounded-lg mt-4">
                    <div className="flex justify-between items-center font-semibold text-base mb-2">
                      <span>Subtotal Vendedor:</span>
                      <span>{formatPriceNumber(getVendorSubtotal(sellerId))}</span>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Tu carrito está vacío</p>
                  <Link href="/products">
                    <Button className="mt-4">Ver productos</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
        {/* Botones de acción fijos abajo */}
        {items.length > 0 && !showShippingForm && (
          <div className="mt-6 pt-4 border-t bg-white sticky bottom-0 z-10">
            <div className="bg-purple-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-sm text-purple-800 mb-2">
                🛒 Compra Centralizada
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Vendedores:</span>
                  <span className="font-medium">{getVendorCount()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Productos:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatPriceNumber(getTotalPrice())}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                onClick={handleBuyAllItems}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Comprar Todo ({formatPriceNumber(getTotalPrice())})
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full"
              >
                Limpiar carrito
              </Button>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <p>💡 Ahora solo puedes realizar compras centralizadas de todos los productos del carrito.</p>
              <p>El sistema centralizado permite múltiples productos en una sola transacción.</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}



