import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'

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
  usedCount?: number
  applicableTo: "all" | "sellers" | "buyers"
  sellerId?: string | null // Campo para cupones específicos de vendedor
  startDate?: any | null
  endDate?: any | null
  isActive: boolean
  createdAt: any
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const sellerId = searchParams.get('sellerId') // Nuevo parámetro para validar vendedor específico

    if (!code) {
      return NextResponse.json(
        { error: 'Código de cupón requerido' },
        { status: 400 }
      )
    }

    // Buscar el cupón en Firestore usando Firebase Admin
    const couponsRef = db.collection('coupons')
    const q = couponsRef.where('code', '==', code.toUpperCase()).where('isActive', '==', true)
    const querySnapshot = await q.get()

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Cupón no encontrado o inactivo' },
        { status: 404 }
      )
    }

    const couponDoc = querySnapshot.docs[0]
    const couponData = { id: couponDoc.id, ...couponDoc.data() } as Coupon

    // Validar que el cupón sea específico del vendedor si se proporciona sellerId
    if (sellerId && couponData.sellerId && couponData.sellerId !== sellerId) {
      return NextResponse.json(
        { error: 'Este cupón no es válido para productos de este vendedor' },
        { status: 400 }
      )
    }

    // Validar fechas del cupón
    const now = new Date()
    
    if (couponData.startDate) {
      const startDate = couponData.startDate.toDate ? couponData.startDate.toDate() : new Date(couponData.startDate)
      if (startDate > now) {
        return NextResponse.json(
          { error: 'Este cupón aún no está disponible' },
          { status: 400 }
        )
      }
    }

    if (couponData.endDate) {
      const endDate = couponData.endDate.toDate ? couponData.endDate.toDate() : new Date(couponData.endDate)
      if (endDate < now) {
        return NextResponse.json(
          { error: 'Este cupón ha expirado' },
          { status: 400 }
        )
      }
    }

    // Validar límite de uso
    if (couponData.usageLimit && (couponData.usedCount || 0) >= couponData.usageLimit) {
      return NextResponse.json(
        { error: 'Este cupón ha alcanzado su límite de uso' },
        { status: 400 }
      )
    }

    // Retornar el cupón válido
    return NextResponse.json({
      coupon: {
        id: couponData.id,
        code: couponData.code,
        name: couponData.name,
        description: couponData.description,
        discountType: couponData.discountType,
        discountValue: couponData.discountValue,
        minPurchase: couponData.minPurchase,
        maxDiscount: couponData.maxDiscount,
        usageLimit: couponData.usageLimit,
        usedCount: couponData.usedCount || 0,
        applicableTo: couponData.applicableTo,
        sellerId: couponData.sellerId || null, // Incluir sellerId en la respuesta
        startDate: couponData.startDate,
        endDate: couponData.endDate,
        isActive: couponData.isActive,
        createdAt: couponData.createdAt
      }
    })

  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 