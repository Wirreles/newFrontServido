// Script para agregar cupones de ejemplo a la base de datos
// Ejecutar con: npx ts-node scripts/add-sample-coupons.ts

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "servidodb2",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(firebaseAdminConfig),
  projectId: firebaseAdminConfig.projectId,
})

const db = getFirestore(app)

const sampleCoupons = [
  {
    code: "DESCUENTO20",
    name: "Descuento del 20%",
    description: "Descuento del 20% en toda la compra",
    discountType: "percentage",
    discountValue: 20,
    minPurchase: 1000,
    maxDiscount: 500,
    usageLimit: 100,
    usedCount: 0,
    applicableTo: "buyers",
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: "FIXED50",
    name: "Descuento fijo $50",
    description: "Descuento fijo de $50 en compras mayores a $500",
    discountType: "fixed",
    discountValue: 50,
    minPurchase: 500,
    maxDiscount: null,
    usageLimit: 50,
    usedCount: 0,
    applicableTo: "buyers",
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: "BIENVENIDA10",
    name: "Cupón de bienvenida 10%",
    description: "Descuento del 10% para nuevos usuarios",
    discountType: "percentage",
    discountValue: 10,
    minPurchase: 100,
    maxDiscount: 200,
    usageLimit: 200,
    usedCount: 0,
    applicableTo: "buyers",
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

async function addSampleCoupons() {
  try {
    console.log('Agregando cupones de ejemplo...')
    
    for (const coupon of sampleCoupons) {
      const docRef = await db.collection('coupons').add(coupon)
      console.log(`Cupón agregado: ${coupon.code} (ID: ${docRef.id})`)
    }
    
    console.log('✅ Todos los cupones han sido agregados exitosamente')
  } catch (error) {
    console.error('Error agregando cupones:', error)
  } finally {
    process.exit(0)
  }
}

addSampleCoupons() 