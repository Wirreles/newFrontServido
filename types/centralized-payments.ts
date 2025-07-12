// 🧱 TIPOS PARA SISTEMA DE PAGOS CENTRALIZADOS
// Reemplaza el sistema descentralizado de MercadoPago

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

export interface CentralizedPurchase {
  id: string
  compradorId: string
  fecha: string
  items: PurchaseItem[]
  total: number
  comisionTotal: number // 12% del total
  estadoPago: 'pendiente' | 'pagado' | 'cancelado'
  estadoEnvio: 'pendiente' | 'en_preparacion' | 'enviado' | 'entregado' | 'cancelado'
  mediosPago: string
  mercadoPagoPaymentId: string // ID del pago en la cuenta centralizada
  createdAt: any
  updatedAt: any
}

export interface PurchaseItem {
  productoId: string
  vendedorId: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  comisionApp: number // 12% del subtotal
  montoVendedor: number // subtotal - comision
  estadoPagoVendedor: 'pendiente' | 'pagado' | 'cancelado'
  fechaPagoVendedor?: string
  
  // Datos del producto (para evitar joins)
  productoNombre: string
  productoImagen?: string
  productoIsService: boolean
  
  // Datos del vendedor (para evitar joins)
  vendedorNombre: string
  vendedorEmail: string
}

// ============================================================================
// CONFIGURACIÓN BANCARIA DEL VENDEDOR
// ============================================================================

export interface SellerBankConfig {
  id: string
  vendedorId: string
  
  // Datos bancarios
  cbu: string
  alias?: string
  tipoCuenta: 'ahorro' | 'corriente'
  banco: string
  titular: string
  cuit?: string
  
  // Preferencias de cobro
  preferenciaRetiro: 'inmediato' | 'a_7_dias' | 'a_30_dias'
  
  // Configuración de impuestos (informativa)
  impuestoInmediato: number // %
  impuesto7Dias: number // %
  impuesto30Dias: number // %
  
  // Metadatos
  isActive: boolean
  createdAt: any
  updatedAt: any
}

// ============================================================================
// GESTIÓN DE PAGOS PARA ADMINISTRADOR
// ============================================================================

export interface AdminSaleRecord {
  compraId: string
  vendedorId: string
  vendedorNombre: string
  vendedorEmail: string
  compradorId: string
  compradorNombre: string
  items: PurchaseItem[]
  subtotalVendedor: number
  comisionApp: number
  montoAPagar: number
  estadoPago: 'pendiente' | 'pagado' | 'cancelado'
  estadoEnvio: 'pendiente' | 'en_preparacion' | 'enviado' | 'entregado' | 'cancelado'
  fechaCompra: string
  fechaPago?: string
  adminUserId?: string // Quién marcó como pagado
  notas?: string
  
  // Configuración bancaria del vendedor
  bankConfig?: SellerBankConfig
}

export interface AdminSalesSummary {
  totalVentas: number
  totalComisiones: number
  totalPendientePago: number
  totalPagado: number
  ventasPorVendedor: {
    vendedorId: string
    vendedorNombre: string
    totalVentas: number
    totalComisiones: number
    totalPendiente: number
    totalPagado: number
  }[]
}

// ============================================================================
// FILTROS Y ORDENAMIENTO
// ============================================================================

export interface SalesFilters {
  vendedorId?: string
  compradorId?: string
  fechaDesde?: string
  fechaHasta?: string
  estadoPago?: 'pendiente' | 'pagado' | 'cancelado' | 'all'
  estadoEnvio?: 'pendiente' | 'en_preparacion' | 'enviado' | 'entregado' | 'cancelado' | 'all'
  montoMinimo?: number
  montoMaximo?: number
}

export interface SalesSorting {
  field: 'fecha' | 'monto' | 'vendedor' | 'comprador' | 'estado'
  order: 'asc' | 'desc'
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface CreateCentralizedPaymentRequest {
  items: {
    productoId: string
    cantidad: number
    precioUnitario: number
  }[]
  compradorId: string
  direccionEnvio?: string
}

export interface CreateCentralizedPaymentResponse {
  compraId: string
  mercadoPagoPreference: {
    id: string
    init_point: string
  }
  total: number
  comisionTotal: number
  itemsGroupedBySeller: {
    vendedorId: string
    vendedorNombre: string
    items: PurchaseItem[]
    subtotal: number
    comision: number
    montoVendedor: number
  }[]
}

export interface MarkPaymentAsPaidRequest {
  compraId: string
  vendedorId: string
  adminUserId: string
  notas?: string
}

// ============================================================================
// TIPOS PARA MIGRACIÓN
// ============================================================================

export interface MigrationStats {
  oldPurchasesCount: number
  newPurchasesCount: number
  migratedPurchasesCount: number
  sellersWithBankConfig: number
  sellersWithoutBankConfig: number
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const COMMISSION_RATE = 0.12 // 12%

export const TAX_RATES = {
  inmediato: 0.21, // 21% para retiro inmediato
  a_7_dias: 0.105, // 10.5% para retiro a 7 días
  a_30_dias: 0.0525 // 5.25% para retiro a 30 días
} as const

export const PAYMENT_STATUSES = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  cancelado: 'Cancelado'
} as const

export const SHIPPING_STATUSES = {
  pendiente: 'Pendiente',
  en_preparacion: 'En Preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
} as const 