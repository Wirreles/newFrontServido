"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, ReactNode } from "react"
// No longer importing CartItemType from @/types/payment as it's not found

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
  applicableTo: "all" | "sellers" | "buyers"
  sellerId?: string | null // Campo para cupones específicos de vendedor
  startDate?: any | null
  endDate?: any | null
  isActive: boolean
  createdAt: any
}

export interface CartItem {
  id: string
  name: string
  description?: string
  price: number // Original price
  discountedPrice: number // Price after coupon application
  quantity: number
  imageUrl?: string
  media?: any[]
  isService: boolean
  sellerId: string
  stock?: number
  appliedCoupon?: Coupon | null // Details of the applied coupon
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
}

interface CartState {
  items: CartItem[]
  appliedCoupon: Coupon | null
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "APPLY_COUPON"; payload: Coupon }
  | { type: "REMOVE_COUPON" }

interface CartContextType {
  items: CartItem[]
  appliedCoupon: Coupon | null
  addItem: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (id: string) => number
  getTotalPrice: () => number
  getSubtotal: () => number
  getDiscountAmount: () => number
  applyCoupon: (coupon: Coupon) => void
  removeCoupon: () => void
  // 🆕 NUEVAS FUNCIONES PARA SISTEMA CENTRALIZADO
  getItemsByVendor: () => { [sellerId: string]: CartItem[] }
  getVendorCount: () => number
  getTotalCommission: () => number
  getVendorSubtotal: (sellerId: string) => number
  canCreateCentralizedPurchase: () => boolean
  getTotalShipping: () => number
  getTotalWithShipping: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM":
      const existingItem = state.items.find(item => item.id === action.payload.id)
      if (existingItem) {
        // If item exists, update quantity and ensure price (and discountedPrice) are consistent
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { 
                  ...item, 
                  quantity: item.quantity + action.payload.quantity, 
                  price: action.payload.price, // Update to latest original price
                  discountedPrice: action.payload.discountedPrice, // Update to latest discounted price
                  appliedCoupon: action.payload.appliedCoupon // Update to latest coupon
                }
              : item
          )
        }
      }
      return {
        ...state,
        items: [...state.items, action.payload]
      }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
    }

    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
    }

    case "CLEAR_CART":
      return {
        ...state,
        items: []
    }

    case "APPLY_COUPON":
      return {
        ...state,
        appliedCoupon: action.payload
      }

    case "REMOVE_COUPON":
      return {
        ...state,
        appliedCoupon: null
      }

    default:
      return state
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], appliedCoupon: null })

  // Load cart from localStorage on initial render
  useEffect(() => {
    const storedCart = localStorage.getItem("servido-cart")
    const storedCoupon = localStorage.getItem("servido-applied-coupon")
    
    if (storedCart) {
      dispatch({ type: "CLEAR_CART" }) // Clear existing items
      const items = JSON.parse(storedCart)
      items.forEach((item: CartItem) => {
        // Re-add items to ensure they pass through reducer and potentially update prices/coupons
        dispatch({ type: "ADD_ITEM", payload: item })
      })
    }

    if (storedCoupon) {
      try {
        const coupon = JSON.parse(storedCoupon)
        dispatch({ type: "APPLY_COUPON", payload: coupon })
      } catch (error) {
        console.error('Error loading applied coupon:', error)
        localStorage.removeItem("servido-applied-coupon")
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("servido-cart", JSON.stringify(state.items))
  }, [state.items])

  // Save applied coupon to localStorage whenever it changes
  useEffect(() => {
    if (state.appliedCoupon) {
      localStorage.setItem("servido-applied-coupon", JSON.stringify(state.appliedCoupon))
    } else {
      localStorage.removeItem("servido-applied-coupon")
    }
  }, [state.appliedCoupon])

  const addItem = (item: CartItem) => {
    dispatch({ type: "ADD_ITEM", payload: item })
  }

  const removeFromCart = (id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" })
  }

  const applyCoupon = (coupon: Coupon) => {
    dispatch({ type: "APPLY_COUPON", payload: coupon })
  }

  const removeCoupon = () => {
    dispatch({ type: "REMOVE_COUPON" })
  }

  const getItemQuantity = (id: string) => {
    const item = state.items.find(item => item.id === id)
    return item ? item.quantity : 0
  }

  const getTotalPrice = (): number => {
    const subtotal = getSubtotal()
    const discount = getDiscountAmount()
    return Math.max(0, subtotal - discount)
  }

  const getSubtotal = (): number => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getDiscountAmount = (): number => {
    if (!state.appliedCoupon) return 0
    
    // Si el cupón es específico de un vendedor, solo aplicar a productos de ese vendedor
    if (state.appliedCoupon.sellerId) {
      const vendorItems = state.items.filter(item => item.sellerId === state.appliedCoupon!.sellerId)
      const vendorSubtotal = vendorItems.reduce((total, item) => total + item.price * item.quantity, 0)
      
      let discount = 0
      if (state.appliedCoupon.discountType === "percentage") {
        discount = vendorSubtotal * (state.appliedCoupon.discountValue / 100)
        // Aplicar descuento máximo si está definido
        if (state.appliedCoupon.maxDiscount) {
          discount = Math.min(discount, state.appliedCoupon.maxDiscount)
        }
      } else if (state.appliedCoupon.discountType === "fixed") {
        discount = Math.min(state.appliedCoupon.discountValue, vendorSubtotal)
      }
      
      return discount
    }
    
    // Para cupones generales, aplicar a todo el subtotal
    const subtotal = getSubtotal()
    let discount = 0
    
    if (state.appliedCoupon.discountType === "percentage") {
      discount = subtotal * (state.appliedCoupon.discountValue / 100)
      // Aplicar descuento máximo si está definido
      if (state.appliedCoupon.maxDiscount) {
        discount = Math.min(discount, state.appliedCoupon.maxDiscount)
      }
    } else if (state.appliedCoupon.discountType === "fixed") {
      discount = Math.min(state.appliedCoupon.discountValue, subtotal)
    }
    
    return discount
  }

  // 🆕 NUEVAS FUNCIONES PARA SISTEMA CENTRALIZADO
  const getItemsByVendor = (): { [sellerId: string]: CartItem[] } => {
    return state.items.reduce((acc, item) => {
      if (!acc[item.sellerId]) {
        acc[item.sellerId] = []
      }
      acc[item.sellerId].push(item)
      return acc
    }, {} as { [sellerId: string]: CartItem[] })
  }

  const getVendorCount = (): number => {
    const vendors = new Set(state.items.map(item => item.sellerId))
    return vendors.size
  }

  const getTotalCommission = (): number => {
    const total = getTotalPrice()
    return Math.round(total * 0.08 * 100) / 100 // 8% comisión
  }

  const getVendorSubtotal = (sellerId: string): number => {
    return state.items
      .filter(item => item.sellerId === sellerId)
      .reduce((total, item) => total + item.discountedPrice * item.quantity, 0)
  }

  const canCreateCentralizedPurchase = (): boolean => {
    if (state.items.length === 0) return false
    
    return state.items.every(item => 
      item.id && item.id.trim() !== '' &&
      item.quantity > 0 && 
      item.discountedPrice > 0 &&
      item.sellerId && item.sellerId.trim() !== '' &&
      item.name && item.name.trim() !== ''
    )
  }

  const getTotalShipping = (): number => {
    return state.items.reduce((total, item) => {
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
  }

  const getTotalWithShipping = (): number => {
    return getTotalPrice() + getTotalShipping()
  }

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        appliedCoupon: state.appliedCoupon,
        addItem,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        getTotalPrice,
        getSubtotal,
        getDiscountAmount,
        applyCoupon,
        removeCoupon,
        getItemsByVendor,
        getVendorCount,
        getTotalCommission,
        getVendorSubtotal,
        canCreateCentralizedPurchase,
        getTotalShipping,
        getTotalWithShipping,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
