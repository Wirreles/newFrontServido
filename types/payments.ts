import type { Payment } from "mercadopago"


export interface CartItem {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  imageUrl?: string
  stock?: number
  isService?: boolean
  sellerId: string
}

export interface PaymentItem {
  id: string
  title: string
  description: string
  unit_price: number
  quantity: number
  currency_id: string
  image?: string
}

export interface PaymentNotification {
  id: string
  type: string
  data: PaymentWebhookData
  createdAt: string
}

export interface PaymentWebhookData {
  payment_id: string
  status: string
  external_reference: string
}

export interface CreatePaymentRequest {
  items: PaymentItem[]
  sellerId: string
  buyerId: string
}

export interface MercadoPagoPreference {
  id: string
  init_point: string
  seller_id: string
}

// Extendemos el tipo Payment de MercadoPago para agregar los campos que necesitamos
export interface ExtendedPaymentResponse {
  id: string
  status: string
  status_detail: string
  transaction_amount: number
  transaction_details: {
    net_received_amount: number
    total_paid_amount: number
    installment_amount: number
  }
  additional_info: {
    items: PaymentItem[]
  }
  payment_method: string
  payment_type: string
  external_reference: string
  metadata: {
    buyer_id: string
    seller_id: string
  }
  payment_details: ExtendedPaymentResponse
  is_subscription: boolean
}

export interface TransactionRecord {
  payment_id: string
  status: string
  external_reference: string
  preference_id?: string
  merchant_order_id?: string
  user_id: string
  buyer_id: string
  amount: number
  items: Array<{
    id: string
    title: string
    quantity: number
    unit_price: number
  }>
  created_at: string
  payment_method: string
  payment_type: string
  currency_id: string
  is_subscription: boolean
  payment_details: ExtendedPaymentResponse
}

export interface SellerStats {
  total_sales: number
  total_amount: number
  last_sale_at: string
}

export interface SubscriptionPlan {
  id: string
  title: string
  description: string
  price: number
  features: string[]
}

export interface Subscription {
  id: string
  userId: string
  planType: string
  paymentId: string
  status: "active" | "inactive" | "cancelled"
  startDate: Date
  endDate: Date
  price: number
  createdAt: Date
  updatedAt: Date
}

export interface SubscriptionPaymentInfo {
  id: string
  status: string
  transaction_amount: number
}

export interface PaymentPreference {
  init_point: string
  id: string
} 