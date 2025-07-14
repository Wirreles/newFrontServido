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
}

interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (id: string) => number
  getTotalPrice: () => number // New function to get total discounted price
  // 🆕 NUEVAS FUNCIONES PARA SISTEMA CENTRALIZADO
  getItemsByVendor: () => { [sellerId: string]: CartItem[] }
  getVendorCount: () => number
  getTotalCommission: () => number
  getVendorSubtotal: (sellerId: string) => number
  canCreateCentralizedPurchase: () => boolean
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

    default:
      return state
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  // Load cart from localStorage on initial render
  useEffect(() => {
    const storedCart = localStorage.getItem("servido-cart")
    if (storedCart) {
      dispatch({ type: "CLEAR_CART" }) // Clear existing items
      const items = JSON.parse(storedCart)
      items.forEach((item: CartItem) => {
        // Re-add items to ensure they pass through reducer and potentially update prices/coupons
        dispatch({ type: "ADD_ITEM", payload: item })
      })
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("servido-cart", JSON.stringify(state.items))
  }, [state.items])

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

  const getItemQuantity = (id: string) => {
    const item = state.items.find(item => item.id === id)
    return item ? item.quantity : 0
  }

  const getTotalPrice = (): number => {
    return state.items.reduce((total, item) => total + item.discountedPrice * item.quantity, 0)
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
    return Math.round(total * 0.12 * 100) / 100 // 12% comisión
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

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addItem,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        getTotalPrice,
        getItemsByVendor,
        getVendorCount,
        getTotalCommission,
        getVendorSubtotal,
        canCreateCentralizedPurchase,
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
