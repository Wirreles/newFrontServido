// Tipos para el sistema de gestión de envíos

export interface ShippingAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
  recipientName?: string
  additionalInfo?: string
}

export type ShippingStatus = 
  | "pending"      // Pendiente - Pago aprobado, esperando preparación
  | "preparing"    // En preparación - Vendedor preparando el pedido
  | "shipped"      // Enviado - Pedido en camino
  | "delivered"    // Entregado - Pedido recibido por el comprador
  | "cancelled"    // Cancelado - Envío cancelado

export interface ShippingInfo {
  status: ShippingStatus
  address?: ShippingAddress
  trackingNumber?: string
  carrierName?: string
  estimatedDelivery?: Date
  actualDelivery?: Date
  notes?: string
  updatedAt: Date
  updatedBy: string // ID del usuario que actualizó
}

// Extensión de la interface Purchase existente
export interface PurchaseWithShipping {
  id: string
  paymentId: string
  productId: string
  sellerId: string
  buyerId: string
  amount: number
  status: "approved" | "pending" | "rejected" | "cancelled"
  type: string
  createdAt: any
  
  // Campos de envío
  shipping?: ShippingInfo
  
  // Datos del producto (obtenidos mediante join)
  productName?: string
  productImage?: string
  productIsService?: boolean
  
  // Datos del vendedor (obtenidos mediante join)
  sellerName?: string
  sellerEmail?: string
  
  // Datos del comprador (obtenidos mediante join)
  buyerName?: string
  buyerEmail?: string
}

// Estados de envío con sus descripciones en español
export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  pending: "Pendiente",
  preparing: "En preparación", 
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado"
}

// Colores para los badges de estado
export const SHIPPING_STATUS_COLORS: Record<ShippingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800", 
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
}

// Iconos para cada estado (usando lucide-react)
export const SHIPPING_STATUS_ICONS: Record<ShippingStatus, string> = {
  pending: "Clock",
  preparing: "Package",
  shipped: "Truck", 
  delivered: "CheckCircle",
  cancelled: "XCircle"
}

// Tipo para las actualizaciones de envío
export interface ShippingUpdateRequest {
  purchaseId: string
  status: ShippingStatus
  trackingNumber?: string
  carrierName?: string
  estimatedDelivery?: Date
  notes?: string
} 