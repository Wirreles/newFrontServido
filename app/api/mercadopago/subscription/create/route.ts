import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import type { SubscriptionPricing } from '@/types/subscription'
import { configureMercadoPago } from '@/lib/mercadopago'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, planType } = body

    if (!userId || !planType) {
      return NextResponse.json(
        { error: 'userId y planType son requeridos' },
        { status: 400 }
      )
    }

    // Obtener el precio activo de suscripción
    const pricingRef = collection(db, 'subscriptionPricing')
    const q = query(pricingRef, where('isActive', '==', true), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)

    let subscriptionPrice = 29.99 // Precio por defecto
    if (!snapshot.empty) {
      const activePricing = snapshot.docs[0].data() as SubscriptionPricing
      subscriptionPrice = activePricing.price
    }

    // Crear la preferencia de suscripción
    const preferenceData = {
      items: [
        {
          title: `Suscripción ${planType.charAt(0).toUpperCase() + planType.slice(1)} - Servicios`,
          description: 'Acceso completo para crear y ofrecer servicios en la plataforma',
          quantity: 1,
          unit_price: subscriptionPrice,
          currency_id: 'ARS'
        }
      ],
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller?subscription=success`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller?subscription=failure`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/seller?subscription=pending`
      },
      auto_return: 'approved',
      external_reference: `subscription_${userId}_${Date.now()}`,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/webhooks/mercadopago/subscription`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      payer: {
        name: 'Usuario',
        email: 'usuario@example.com'
      }
    }

    // Configurar MercadoPago
    const mp = configureMercadoPago()
    
    try {
      // Crear preferencia real en MercadoPago
      const preference = await mp.preferences.create(preferenceData)
      
      console.log('Preferencia creada en MercadoPago:', preference)
      
      return NextResponse.json({
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point
      })
      
    } catch (mpError) {
      console.error('Error al crear preferencia en MercadoPago:', mpError)
      
      // En caso de error con MercadoPago, devolver error específico
      return NextResponse.json(
        { error: 'Error al crear preferencia en MercadoPago', details: mpError },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error al crear preferencia de suscripción:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
