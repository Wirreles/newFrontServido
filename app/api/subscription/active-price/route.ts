import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore'
import type { SubscriptionPricing } from '@/types/subscription'

// GET - Obtener el precio activo de suscripción
export async function GET() {
  try {
    const pricingRef = collection(db, 'subscriptionPricing')
    const q = query(pricingRef, where('isActive', '==', true), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      // Si no hay precio configurado, devolver un precio por defecto
      return NextResponse.json({
        price: 29.99,
        isActive: true,
        message: 'Precio por defecto'
      })
    }
    
    const activePricing = snapshot.docs[0].data() as SubscriptionPricing
    return NextResponse.json({
      id: snapshot.docs[0].id,
      price: activePricing.price,
      isActive: activePricing.isActive,
      createdAt: activePricing.createdAt,
      updatedAt: activePricing.updatedAt
    })
  } catch (error) {
    console.error('Error al obtener precio de suscripción:', error)
    // En caso de error, devolver precio por defecto
    return NextResponse.json({
      price: 29.99,
      isActive: true,
      message: 'Precio por defecto (error en base de datos)'
    })
  }
}
