import { Subscription, PaymentPreference } from '@/types/payments'
import { auth } from '@/lib/firebase' // Importar instancia de auth

interface ApiResponse<T = any> {
  data?: T
  error?: string
}

export class ApiService {
  private static baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

  private static async fetchApi<T>(endpoint: string, options: RequestInit = {}, authRequired = false): Promise<ApiResponse<T>> {
    try {
      // Type guard para headers
      let extraHeaders: Record<string, string> = {}
      if (options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)) {
        extraHeaders = options.headers as Record<string, string>
      }
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extraHeaders,
      };
      
      // Agregar el header de ngrok si aplica
      if (this.baseUrl?.includes('ngrok')) {
        headers['ngrok-skip-browser-warning'] = 'true';
      }

      // Si la ruta requiere autenticación, obtener el token de Firebase
      if (authRequired && auth?.currentUser) {
        const token = await auth.currentUser.getIdToken(true);
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error en la solicitud')
      }

      return { data }
    } catch (error) {
      console.error('API Error:', error)
      return {
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  // ============================================================================
  // ENDPOINTS DE MERCADOPAGO
  // ============================================================================

  // Crear preferencia para productos (múltiples productos soportados)
  static async createProductPreference(data: {
    products: {
      productId: string
      quantity: number
    }[]
    buyerId: string
    buyerEmail: string
    shippingAddress?: {
      fullName: string
      phone: string
      dni: string
      address: string
      city: string
      state: string
      zipCode: string
      additionalInfo?: string
    }
  }): Promise<ApiResponse<{
    id: string
    init_point: string
    sandbox_init_point: string
  }>> {
    return this.fetchApi('/api/mercadopago/payments/create-preference', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true)
  }

  // Crear preferencia para suscripciones
  static async createSubscriptionPreference(data: {
    userId: string
    planType: 'basic' | 'premium' | 'enterprise'
  }): Promise<ApiResponse<{
    id: string
    init_point: string
    sandbox_init_point: string
  }>> {
    return this.fetchApi('/api/mercadopago/subscription/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true)
  }

  // Obtener estado de conexión de MercadoPago
  static async getConnectionStatus(userId: string): Promise<ApiResponse<{
    connected: boolean
    tokenExpired?: boolean
    userId?: string
  }>> {
    return this.fetchApi(`/api/mercadopago/connection-status/${userId}`, {}, true)
  }

  // Webhook para notificaciones de MercadoPago
  static async processMercadoPagoWebhook(data: {
    type: string
    data: {
      id: string
    }
  }): Promise<ApiResponse<{ received: boolean }>> {
    return this.fetchApi('/api/mercadopago/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false) // No requiere autenticación ya que viene de MercadoPago
  }

  // ============================================================================
  // MÉTODOS DE CONVENIENCIA PARA COMPRAS
  // ============================================================================

  // Método para crear una compra de producto único
  static async createSingleProductPurchase(data: {
    productId: string
    quantity: number
    buyerId: string
    buyerEmail: string
    shippingAddress?: {
      fullName: string
      phone: string
      dni: string
      address: string
      city: string
      state: string
      zipCode: string
      additionalInfo?: string
    }
  }) {
    return this.createProductPreference({
      products: [{ productId: data.productId, quantity: data.quantity }],
      buyerId: data.buyerId,
      buyerEmail: data.buyerEmail,
      shippingAddress: data.shippingAddress
    })
  }

  // Método para crear una compra de múltiples productos
  static async createMultipleProductsPurchase(data: {
    products: {
      productId: string
      quantity: number
    }[]
    buyerId: string
    buyerEmail: string
    shippingAddress?: {
      fullName: string
      phone: string
      dni: string
      address: string
      city: string
      state: string
      zipCode: string
      additionalInfo?: string
    }
  }) {
    return this.createProductPreference(data)
  }

  // ============================================================================
  // MÉTODOS DE CONVENIENCIA PARA SUSCRIPCIONES
  // ============================================================================

  // Crear suscripción básica
  static async createBasicSubscription(userId: string) {
    return this.createSubscriptionPreference({
      userId,
      planType: 'basic'
    })
  }

  // Crear suscripción premium
  static async createPremiumSubscription(userId: string) {
    return this.createSubscriptionPreference({
      userId,
      planType: 'premium'
    })
  }

  // Crear suscripción enterprise
  static async createEnterpriseSubscription(userId: string) {
    return this.createSubscriptionPreference({
      userId,
      planType: 'enterprise'
    })
  }
} 