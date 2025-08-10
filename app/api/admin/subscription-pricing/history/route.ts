import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore'
import type { SubscriptionPricingHistory } from '@/types/subscription'

// GET - Obtener historial de cambios de precio
export async function GET() {
  try {
    const historyRef = collection(db, 'subscriptionPricingHistory')
    const q = query(historyRef, orderBy('changedAt', 'desc'))
    const snapshot = await getDocs(q)
    
    const history: SubscriptionPricingHistory[] = []
    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      } as SubscriptionPricingHistory)
    })
    
    return NextResponse.json(history)
  } catch (error) {
    console.error('Error al obtener historial de precios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
