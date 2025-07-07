import { Subscription, PaymentPreference } from '@/types/payments'
import { auth } from '@/lib/firebase' // Importar instancia de auth

interface ApiResponse<T = any> {
  data?: T
  error?: string
}

interface OAuthUrlResponse {
  authUrl: string
}

interface ConnectionStatusResponse {
  isConnected: boolean
  lastChecked: string
}

export class ApiService {
  private static baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL

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

  // Suscripciones
  static async createSubscription(userId: string, planType: string): Promise<ApiResponse<PaymentPreference>> {
    return this.fetchApi<any>('/api/mercadopago/subscription/create', {
      method: 'POST',
      body: JSON.stringify({ userId, planType }),
    }, true)
  }

  static async getSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    return this.fetchApi<Subscription>(`/api/mercadopago/subscriptions/${userId}`, {}, true)
  }

  static async cancelSubscription(subscriptionId: string): Promise<ApiResponse<void>> {
    return this.fetchApi(`/api/mercadopago/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    }, true)
  }

  // Pagos
  static async createPayment(data: {
    productId: string
    quantity: number
    vendedorId: string
    buyerId: string
  }): Promise<ApiResponse<PaymentPreference>> {
    return this.fetchApi<PaymentPreference>('/api/mercadopago/payments/create-preference', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true)
  }

  // OAuth y conexión
  static async handleOAuthCallback(code: string, userId: string): Promise<ApiResponse<void>> {
    return this.fetchApi('/api/mercadopago/oauth-callback', {
      method: 'POST',
      body: JSON.stringify({ code, userId }),
    }, true)
  }

  static async getConnectionStatus(userId: string): Promise<ApiResponse<ConnectionStatusResponse>> {
    return this.fetchApi<ConnectionStatusResponse>(`/api/mercadopago/connection-status/${userId}`, {}, true)
  }

  static async disconnectAccount(userId: string): Promise<ApiResponse<void>> {
    return this.fetchApi(`/api/mercadopago/disconnect/${userId}`, {
      method: 'POST',
    }, true)
  }

  // static async getOAuthUrl(): Promise<ApiResponse<OAuthUrlResponse>> {
  //   return this.fetchApi('/mercadopago/oauth-callback')
  // }
} 