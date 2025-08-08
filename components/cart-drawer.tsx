"use client"

import type React from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Minus, Trash2, X, Loader2, ShoppingBag, ArrowLeft, Truck, CreditCard, Shield } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { SimpleImage } from '@/components/ui/simple-image'
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { ApiService } from "@/lib/services/api"
import type { CartItem } from "@/contexts/cart-context"
import { getCartItemImage } from "@/lib/image-utils"
import { formatPrice, formatPriceNumber } from "@/lib/utils"
import { ShippingForm, type ShippingAddress } from "@/components/cart/shipping-form"
import { CouponInput } from "@/components/ui/coupon-input"

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
    getSubtotal,
    getDiscountAmount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    getItemsByVendor,
    getVendorCount,
    getTotalCommission,
    getVendorSubtotal,
    canCreateCentralizedPurchase,
    getTotalShipping,
    getTotalWithShipping
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

    setPurchaseType('all')
    setPurchaseData(null)
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

  const handleShippingFormSubmit = (address: ShippingAddress) => {
    setShippingAddress(address)
    
    if (purchaseType === 'individual' && purchaseData?.item) {
      processIndividualPurchase(address)
    } else if (purchaseType === 'vendor' && purchaseData?.sellerItems && purchaseData?.sellerId) {
      processVendorPurchase(address)
    } else if (purchaseType === 'all') {
      processAllItemsPurchase(address)
    }
  }

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
      <SheetContent className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
              <div>
                <h2 className="font-semibold text-lg">Carrito de compras</h2>
                <p className="text-sm text-gray-500">
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto cart-drawer">
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
              <div className="p-4 space-y-6">
                {/* Cupón de descuento */}
                {items.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-4">
                    <CouponInput
                      onCouponApplied={applyCoupon}
                      onCouponRemoved={removeCoupon}
                      appliedCoupon={appliedCoupon}
                      subtotal={getSubtotal()}
                      items={items.map(item => ({
                        sellerId: item.sellerId,
                        id: item.id,
                        name: item.name
                      }))}
                    />
                  </div>
                )}

                {/* Productos */}
                {items.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(groupedItems).map(([sellerId, sellerItems]) => (
                      <div key={sellerId} className="space-y-3">
                        {/* Header del vendedor */}
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Vendedor</span>
                        </div>
                        
                        {/* Productos del vendedor */}
                        {sellerItems.map((item) => (
                          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cart-item">
                            <div className="flex gap-4">
                              {/* Imagen del producto */}
                              <div className="flex-shrink-0">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 relative rounded-lg overflow-hidden bg-gray-100 cart-item-image">
                                  <SimpleImage src={getCartItemImage(item.media, item.imageUrl)} alt={item.name} className="w-full h-full object-cover" objectFit="cover"
                                    className="rounded-lg"
                                  />
                                </div>
                              </div>
                              
                              {/* Información del producto */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                                      {item.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Cantidad: {item.quantity}
                                    </p>
                                  </div>
                                  
                                  {/* Botón eliminar */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`¿Estás seguro de que quieres eliminar "${item.name}" del carrito?`)) {
                                        removeFromCart(item.id)
                                        toast({
                                          title: "Producto eliminado",
                                          description: `${item.name} ha sido eliminado del carrito`,
                                          duration: 2000,
                                        })
                                      }
                                    }}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 min-w-[40px] min-h-[40px]"
                                    title="Eliminar del carrito"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                {/* Precio */}
                                <div className="mt-2">
                                  {item.appliedCoupon && item.discountedPrice < item.price ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-lg font-bold text-gray-900">
                                        {formatPrice(item.discountedPrice)}
                                      </span>
                                      <span className="text-sm text-gray-500 line-through">
                                        {formatPrice(item.price)}
                                      </span>
                                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                        {Math.round(((item.price - item.discountedPrice) / item.price) * 100)}% OFF
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span className="text-lg font-bold text-gray-900">
                                      {formatPrice(item.price)}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Información adicional */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {item.condition && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.condition === 'nuevo' ? 'Nuevo' : 'Usado'}
                                    </Badge>
                                  )}
                                  {item.freeShipping ? (
                                    <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                      <Truck className="h-3 w-3 mr-1" />
                                      Envío gratis
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-gray-600">
                                      <Truck className="h-3 w-3 mr-1" />
                                      {item.shippingCost !== undefined ? formatPrice(item.shippingCost) : 'Envío'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Subtotal del vendedor */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Subtotal vendedor:</span>
                            <span className="font-bold text-gray-900">{formatPriceNumber(getVendorSubtotal(sellerId))}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Carrito vacío */
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tu carrito está vacío</h3>
                    <p className="text-gray-500 mb-6">Agrega productos para comenzar a comprar</p>
                    <Link href="/products">
                      <Button className="bg-purple-600 hover:bg-purple-700 cart-button">
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Ver productos
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer con resumen y botones */}
          {items.length > 0 && !showShippingForm && (
            <div className="border-t bg-white p-4 space-y-4">
              {/* Resumen de compra */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Resumen de compra
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Productos ({items.length})</span>
                    <span className="font-medium">{formatPriceNumber(getSubtotal())}</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({appliedCoupon.discountType === "percentage" ? `${appliedCoupon.discountValue}%` : `$${appliedCoupon.discountValue}`})</span>
                      <span className="font-medium">-{formatPriceNumber(getDiscountAmount())}</span>
                    </div>
                  )}
                  
                  {getTotalShipping() > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Envío</span>
                      <span className="font-medium">{formatPriceNumber(getTotalShipping())}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Total</span>
                      <span className="font-bold text-2xl text-gray-900">{formatPriceNumber(getTotalWithShipping())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <Button
                  onClick={handleBuyAllItems}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl text-lg cart-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-5 w-5" />
                      Comprar ahora
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl cart-button"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar carrito
                </Button>
              </div>

              {/* Información adicional */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-green-500" />
                  <span>Compra segura con MercadoPago</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-3 w-3 text-blue-500" />
                  <span>Envío a todo el país</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}



