// 🧱 FUNCIONES PARA SISTEMA DE PAGOS CENTRALIZADOS - FIREBASE + API CALLS 1
import { ApiService } from '@/lib/services/api'
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc,
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { 
  CentralizedPurchase, 
  PurchaseItem, 
  AdminSaleRecord, 
  AdminSalesSummary,
  SellerBankConfig,
  SalesFilters
} from '@/types/centralized-payments'
import { COMMISSION_RATE, TAX_RATES } from '@/types/centralized-payments'

// Función de prueba para debuggear
export async function testFirestoreConnection(): Promise<string> {
  try {
    console.log('Testing Firestore connection...')
    const testDoc = {
      test: 'hello',
      timestamp: serverTimestamp(),
      number: 123,
      boolean: true
    }
    
    const docRef = await addDoc(collection(db, 'test'), testDoc)
    console.log('Test document created with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Test failed:', error)
    throw error
  }
}

// Función simplificada para guardar solo campos básicos
export async function saveSellerBankConfigSimple(config: {
  vendedorId: string
  cbu: string
  banco: string
  titular: string
  tipoCuenta: string
}): Promise<string> {
  try {
    console.log('Saving simplified bank config:', config)
    
    const simpleConfig = {
      vendedorId: config.vendedorId,
      cbu: config.cbu,
      banco: config.banco,
      titular: config.titular,
      tipoCuenta: config.tipoCuenta,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    const docRef = await addDoc(collection(db, 'sellerBankConfigs'), simpleConfig)
    console.log('Simplified config saved with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error saving simplified config:', error)
    throw error
  }
}

// Tipo local para CommissionDistribution
export interface CommissionDistribution {
  vendedorId: string
  vendedorNombre: string
  pendingAmount: number
  paidAmount: number
  totalEarned: number
  commissionDeducted: number
  taxDeducted: number
  netAmount: number
  withdrawalPreference: 'inmediato' | 'a_7_dias' | 'a_30_dias'
  bankConfig?: SellerBankConfig
}

// ============================================================================
// FUNCIONES DE CÁLCULO (MANTENER LOCALES)
// ============================================================================

export function calculateCommission(amount: number): number {
  return Math.round(amount * COMMISSION_RATE * 100) / 100
}

export function calculateSellerAmount(subtotal: number): number {
  const commission = calculateCommission(subtotal)
  return Math.round((subtotal - commission) * 100) / 100
}

export function calculateTaxByWithdrawalPreference(
  amount: number, 
  preference: 'inmediato' | 'a_7_dias' | 'a_30_dias'
): number {
  const taxRate = TAX_RATES[preference]
  return Math.round(amount * taxRate * 100) / 100
}

// ============================================================================
// FUNCIONES DE FIRESTORE
// ============================================================================

export async function getSellerBankConfig(sellerId: string): Promise<SellerBankConfig | null> {
  try {
    const q = query(
      collection(db, 'sellerBankConfigs'),
      where('vendedorId', '==', sellerId)
    )
    
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    return { id: doc.id, ...doc.data() } as SellerBankConfig
  } catch (error) {
    console.error('Error fetching seller bank config:', error)
    return null
  }
}

export async function getAdminSalesData(filters?: SalesFilters): Promise<AdminSaleRecord[]> {
  try {
    const q = query(
      collection(db, 'centralizedPurchases'),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const purchases = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CentralizedPurchase[]
    
    const adminSales: AdminSaleRecord[] = []
    
    for (const purchase of purchases) {
      for (const item of purchase.items) {
        const saleRecord: AdminSaleRecord = {
          compraId: purchase.id,
          vendedorId: item.vendedorId,
          vendedorNombre: item.vendedorNombre,
          vendedorEmail: item.vendedorEmail,
          compradorId: purchase.compradorId,
          compradorNombre: '', // Se obtiene por separado si es necesario
          items: [item],
          subtotalVendedor: item.subtotal,
          comisionApp: item.comisionApp,
          montoAPagar: item.montoVendedor,
          estadoPago: item.estadoPagoVendedor,
          estadoEnvio: purchase.estadoEnvio || 'pendiente',
          fechaCompra: purchase.fecha,
          fechaPago: item.fechaPagoVendedor
        }
        
        // Aplicar filtros si existen
        if (filters?.estadoPago && filters.estadoPago !== 'all' && saleRecord.estadoPago !== filters.estadoPago) {
          continue
        }
        
        adminSales.push(saleRecord)
      }
    }
    
    return adminSales
  } catch (error) {
    console.error('Error fetching admin sales data:', error)
    return []
  }
}

export async function updatePurchasePaymentStatus(
  purchaseId: string, 
  vendedorId: string, 
  status: 'pendiente' | 'pagado' | 'cancelado',
  adminUserId?: string
): Promise<void> {
  try {
    const purchaseRef = doc(db, 'centralizedPurchases', purchaseId)
    const purchaseSnap = await getDoc(purchaseRef)
    
    if (!purchaseSnap.exists()) {
      throw new Error('Compra no encontrada')
    }
    
    const purchase = purchaseSnap.data() as CentralizedPurchase
    const updatedItems = purchase.items.map(item => {
      if (item.vendedorId === vendedorId) {
        return {
          ...item,
          estadoPagoVendedor: status,
          fechaPagoVendedor: status === 'pagado' ? new Date().toISOString() : undefined
        }
      }
      return item
    })
    
    await updateDoc(purchaseRef, {
      items: updatedItems,
      updatedAt: serverTimestamp()
    })
    
    // Registrar en historial de pagos
    if (status === 'pagado' && adminUserId) {
      await addDoc(collection(db, 'paymentHistory'), {
        compraId: purchaseId,
        vendedorId,
        adminUserId,
        fechaPago: serverTimestamp(),
        monto: purchase.items.find(item => item.vendedorId === vendedorId)?.montoVendedor || 0,
        createdAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error updating payment status:', error)
    throw error
  }
}

// ============================================================================
// FUNCIONES QUE LLAMAN AL BACKEND
// ============================================================================

export async function getSellerSales(sellerId: string): Promise<AdminSaleRecord[]> {
  try {
    const q = query(
      collection(db, 'centralizedPurchases'),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const purchases = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CentralizedPurchase[]
    
    const sellerSales: AdminSaleRecord[] = []
    
    for (const purchase of purchases) {
      const sellerItems = purchase.items.filter(item => item.vendedorId === sellerId)
      
      if (sellerItems.length > 0) {
        const subtotalVendedor = sellerItems.reduce((sum, item) => sum + item.subtotal, 0)
        const comisionApp = sellerItems.reduce((sum, item) => sum + item.comisionApp, 0)
        const montoAPagar = sellerItems.reduce((sum, item) => sum + item.montoVendedor, 0)
        
        sellerSales.push({
          compraId: purchase.id,
          vendedorId: sellerId,
          vendedorNombre: sellerItems[0].vendedorNombre,
          vendedorEmail: sellerItems[0].vendedorEmail,
          compradorId: purchase.compradorId,
          compradorNombre: '', // Se obtiene por separado si es necesario
          items: sellerItems,
          subtotalVendedor,
          comisionApp,
          montoAPagar,
          estadoPago: sellerItems[0].estadoPagoVendedor,
          estadoEnvio: purchase.estadoEnvio || 'pendiente',
          fechaCompra: purchase.fecha,
          fechaPago: sellerItems[0].fechaPagoVendedor
        })
      }
    }
    
    return sellerSales
  } catch (error) {
    console.error('Error fetching seller sales:', error)
    return []
  }
}

export async function calculateCommissionDistribution(): Promise<CommissionDistribution[]> {
  try {
    const q = query(
      collection(db, 'centralizedPurchases'),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const purchases = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CentralizedPurchase[]
    
    // Agrupar por vendedor
    const sellerData: Record<string, {
      vendedorId: string
      vendedorNombre: string
      totalEarned: number
      commissionDeducted: number
      pendingAmount: number
      paidAmount: number
      withdrawalPreference: 'inmediato' | 'a_7_dias' | 'a_30_dias'
      bankConfig?: SellerBankConfig
    }> = {}
    
    for (const purchase of purchases) {
      for (const item of purchase.items) {
        if (!sellerData[item.vendedorId]) {
          // Obtener configuración bancaria del vendedor
          const bankConfig = await getSellerBankConfig(item.vendedorId)
          
          sellerData[item.vendedorId] = {
            vendedorId: item.vendedorId,
            vendedorNombre: item.vendedorNombre,
            totalEarned: 0,
            commissionDeducted: 0,
            pendingAmount: 0,
            paidAmount: 0,
            withdrawalPreference: bankConfig?.preferenciaRetiro || 'a_30_dias',
            bankConfig: bankConfig || undefined
          }
        }
        
        const seller = sellerData[item.vendedorId]
        seller.totalEarned += item.subtotal
        seller.commissionDeducted += item.comisionApp
        
        if (item.estadoPagoVendedor === 'pagado') {
          seller.paidAmount += item.montoVendedor
        } else if (item.estadoPagoVendedor === 'pendiente') {
          seller.pendingAmount += item.montoVendedor
        }
      }
    }
    
    // Convertir a array y calcular impuestos
    return Object.values(sellerData).map(seller => {
      const taxDeducted = calculateTaxByWithdrawalPreference(
        seller.pendingAmount + seller.paidAmount,
        seller.withdrawalPreference
      )
      
      return {
        ...seller,
        taxDeducted,
        netAmount: (seller.pendingAmount + seller.paidAmount) - taxDeducted
      }
    })
  } catch (error) {
    console.error('Error fetching commission distribution:', error)
    return []
  }
}

export async function calculateCommissionReport(
  startDate: Date, 
  endDate: Date
): Promise<any> {
  try {
    const q = query(
      collection(db, 'centralizedPurchases'),
      where('fecha', '>=', startDate.toISOString()),
      where('fecha', '<=', endDate.toISOString()),
      orderBy('fecha', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const purchases = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CentralizedPurchase[]
    
    let totalSales = 0
    let totalCommissions = 0
    const sellerBreakdown: Record<string, {
      vendedorId: string
      vendedorNombre: string
      totalSales: number
      totalCommissions: number
      salesCount: number
    }> = {}
    
    const monthlyData: Record<string, { totalSales: number; totalCommissions: number }> = {}
    
    for (const purchase of purchases) {
      totalSales += purchase.total
      totalCommissions += purchase.comisionTotal
      
      // Agrupar por mes
      const monthKey = new Date(purchase.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { totalSales: 0, totalCommissions: 0 }
      }
      monthlyData[monthKey].totalSales += purchase.total
      monthlyData[monthKey].totalCommissions += purchase.comisionTotal
      
      // Agrupar por vendedor
      for (const item of purchase.items) {
        if (!sellerBreakdown[item.vendedorId]) {
          sellerBreakdown[item.vendedorId] = {
            vendedorId: item.vendedorId,
            vendedorNombre: item.vendedorNombre,
            totalSales: 0,
            totalCommissions: 0,
            salesCount: 0
          }
        }
        
        sellerBreakdown[item.vendedorId].totalSales += item.subtotal
        sellerBreakdown[item.vendedorId].totalCommissions += item.comisionApp
        sellerBreakdown[item.vendedorId].salesCount += 1
      }
    }
    
    const sellerBreakdownArray = Object.values(sellerBreakdown).map(seller => ({
      ...seller,
      averageCommissionPerSale: seller.salesCount > 0 ? seller.totalCommissions / seller.salesCount : 0
    }))
    
    const monthlyTrend = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data
    }))
    
    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalSales,
      totalCommissions,
      commissionRate: COMMISSION_RATE,
      sellerBreakdown: sellerBreakdownArray,
      monthlyTrend
    }
  } catch (error) {
    console.error('Error fetching commission report:', error)
    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalSales: 0,
      totalCommissions: 0,
      commissionRate: COMMISSION_RATE,
      sellerBreakdown: [],
      monthlyTrend: []
    }
  }
}

export async function processCommissionPayments(
  vendedorId: string,
  adminUserId: string,
  paymentMethod: 'bank_transfer' | 'mercadopago' | 'cash',
  notes?: string
): Promise<{
  success: boolean
  message: string
  processedAmount?: number
  transactionId?: string
}> {
  try {
    // Obtener todas las ventas pendientes del vendedor
    const q = query(
      collection(db, 'centralizedPurchases'),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const purchases = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CentralizedPurchase[]
    
    let totalProcessed = 0
    const batch = writeBatch(db)
    
    for (const purchase of purchases) {
      const sellerItems = purchase.items.filter(
        item => item.vendedorId === vendedorId && item.estadoPagoVendedor === 'pendiente'
      )
      
      if (sellerItems.length > 0) {
        const updatedItems = purchase.items.map(item => {
          if (item.vendedorId === vendedorId && item.estadoPagoVendedor === 'pendiente') {
            totalProcessed += item.montoVendedor
            return {
              ...item,
              estadoPagoVendedor: 'pagado' as const,
              fechaPagoVendedor: new Date().toISOString()
            }
          }
          return item
        })
        
        const purchaseRef = doc(db, 'centralizedPurchases', purchase.id)
        batch.update(purchaseRef, {
          items: updatedItems,
          updatedAt: serverTimestamp()
        })
      }
    }
    
    // Registrar el pago en el historial
    const paymentHistoryRef = doc(collection(db, 'paymentHistory'))
    batch.set(paymentHistoryRef, {
      vendedorId,
      adminUserId,
      paymentMethod,
      amount: totalProcessed,
      notes: notes || '',
      processedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    })
    
    await batch.commit()
    
    return {
      success: true,
      message: `Procesado exitosamente $${totalProcessed.toFixed(2)}`,
      processedAmount: totalProcessed,
      transactionId: `PAY_${Date.now()}`
    }
    
  } catch (error) {
    console.error('Error processing commission payments:', error)
    return {
      success: false,
      message: 'Error al procesar el pago'
    }
  }
}

export function generateCommissionInvoice(
  vendedorId: string,
  startDate: Date,
  endDate: Date,
  sales: AdminSaleRecord[]
): {
  vendedorId: string
  vendedorNombre: string
  period: string
  totalSales: number
  totalCommissions: number
  totalTaxes: number
  netAmount: number
  salesDetails: {
    fecha: string
    compraId: string
    productos: string[]
    subtotal: number
    comision: number
    impuestos: number
    neto: number
  }[]
} {
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.fechaCompra)
    return saleDate >= startDate && saleDate <= endDate && sale.vendedorId === vendedorId
  })

  const vendedorNombre = filteredSales.length > 0 ? filteredSales[0].vendedorNombre : 'Vendedor'
  
  let totalSales = 0
  let totalCommissions = 0
  const salesDetails = filteredSales.map(sale => {
    totalSales += sale.subtotalVendedor
    totalCommissions += sale.comisionApp
    
    return {
      fecha: sale.fechaCompra,
      compraId: sale.compraId,
      productos: sale.items.map(item => `${item.productoNombre} x${item.cantidad}`),
      subtotal: sale.subtotalVendedor,
      comision: sale.comisionApp,
      impuestos: 0, // Se calcula en el backend
      neto: sale.montoAPagar
    }
  })

  return {
    vendedorId,
    vendedorNombre,
    period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    totalSales,
    totalCommissions,
    totalTaxes: 0,
    netAmount: totalSales - totalCommissions,
    salesDetails
    }
}

export async function getBuyerPurchases(buyerId: string): Promise<CentralizedPurchase[]> {
  try {
    const q = query(
      collection(db, 'centralizedPurchases'),
      where('compradorId', '==', buyerId),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CentralizedPurchase[]
  } catch (error) {
    console.error('Error fetching buyer purchases:', error)
    return []
  }
}

// ============================================================================
// FUNCIONES DE INTEGRACIÓN CON SISTEMA DE ENVÍOS
// ============================================================================

export async function initializeCentralizedShipping(
  purchaseId: string,
  vendorId: string,
  items: PurchaseItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que la compra existe
    const purchaseRef = doc(db, 'centralizedPurchases', purchaseId)
    const purchaseSnap = await getDoc(purchaseRef)
    
    if (!purchaseSnap.exists()) {
      return { success: false, error: 'Compra no encontrada' }
    }

    const purchaseData = purchaseSnap.data() as CentralizedPurchase

    // Filtrar items del vendedor que requieren envío físico
    const physicalItems = items.filter(item => 
      item.vendedorId === vendorId && !item.productoIsService
    )

    if (physicalItems.length === 0) {
      return { success: false, error: 'No hay productos físicos para enviar' }
    }

    // Crear entrada de envío para cada item físico del vendedor
    const shippingPromises = physicalItems.map(async (item) => {
      const shippingData = {
        purchaseId,
        vendorId,
        buyerId: purchaseData.compradorId,
        itemId: item.productoId,
        productName: item.productoNombre,
        quantity: item.cantidad,
        status: 'pending' as const,
        address: null, // TODO: Agregar dirección de envío al tipo CentralizedPurchase
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: vendorId
      }

      return addDoc(collection(db, 'centralizedShipments'), shippingData)
    })

    await Promise.all(shippingPromises)

    return { success: true }
  } catch (error) {
    console.error('Error initializing centralized shipping:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

export async function updateCentralizedShippingStatus(
  purchaseId: string,
  vendorId: string,
  itemId: string,
  update: {
    status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
    trackingNumber?: string
    carrierName?: string
    estimatedDelivery?: Date
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar el envío específico
    const q = query(
      collection(db, 'centralizedShipments'),
      where('purchaseId', '==', purchaseId),
      where('vendorId', '==', vendorId),
      where('itemId', '==', itemId)
    )

    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Envío no encontrado' }
    }

    const shippingDoc = querySnapshot.docs[0]
    const shippingRef = doc(db, 'centralizedShipments', shippingDoc.id)

    // Actualizar el documento de envío
    await updateDoc(shippingRef, {
      status: update.status,
      trackingNumber: update.trackingNumber || null,
      carrierName: update.carrierName || null,
      estimatedDelivery: update.estimatedDelivery || null,
      notes: update.notes || null,
      updatedAt: serverTimestamp(),
      updatedBy: vendorId
    })

    // Crear notificación para el comprador
    const shippingData = shippingDoc.data()
    await createCentralizedShippingNotification(
      shippingData.buyerId,
      purchaseId,
      shippingData.productName,
      update.status,
      update.trackingNumber,
      update.carrierName
    )

    return { success: true }
  } catch (error) {
    console.error('Error updating centralized shipping:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

export async function getCentralizedShipmentsByVendor(vendorId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'centralizedShipments'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching centralized shipments:', error)
    return []
  }
}

export async function getCentralizedShipmentsByBuyer(buyerId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'centralizedShipments'),
      where('buyerId', '==', buyerId),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching centralized shipments:', error)
    return []
  }
}

async function createCentralizedShippingNotification(
  buyerId: string,
  purchaseId: string,
  productName: string,
  status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled',
  trackingNumber?: string,
  carrierName?: string
): Promise<void> {
  try {
    const statusMessages = {
      pending: "Tu pedido está pendiente de procesamiento",
      preparing: "Tu pedido está siendo preparado para envío",
      shipped: "Tu pedido ha sido enviado",
      delivered: "Tu pedido ha sido entregado",
      cancelled: "Tu pedido ha sido cancelado"
    }

    const statusTitles = {
      pending: "Pedido Pendiente",
      preparing: "Preparando Envío",
      shipped: "Pedido Enviado",
      delivered: "Pedido Entregado",
      cancelled: "Pedido Cancelado"
    }

    let description = `${statusMessages[status]} - ${productName}`
    
    if (status === "shipped" && trackingNumber) {
      description += `. Número de seguimiento: ${trackingNumber}`
      if (carrierName) {
        description += ` (${carrierName})`
      }
    }

    const notificationData = {
      userId: buyerId,
      type: "centralized_shipping",
      title: statusTitles[status],
      description,
      purchaseId,
      productName,
      shippingStatus: status,
      trackingNumber: trackingNumber || null,
      carrierName: carrierName || null,
      isRead: false,
      createdAt: serverTimestamp()
    }

    await addDoc(collection(db, "notifications"), notificationData)
  } catch (error) {
    console.error('Error creating centralized shipping notification:', error)
  }
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN Y CONVERSIÓN (MANTENER LOCALES)
// ============================================================================

export function convertCartItemsToCentralizedPayment(
  cartItems: Array<{
    id: string
    name: string
    price: number
    discountedPrice: number
    quantity: number
    sellerId: string
  }>,
  buyerId: string
): {
  items: {
    productoId: string
    cantidad: number
    precioUnitario: number
  }[]
  compradorId: string
} {
  return {
    items: cartItems.map(item => ({
      productoId: item.id,
      cantidad: item.quantity,
      precioUnitario: item.discountedPrice || item.price
    })),
    compradorId: buyerId
  }
}

export function convertSingleItemToCentralizedPayment(
  productId: string,
  quantity: number,
  price: number,
  buyerId: string
): {
  items: {
    productoId: string
    cantidad: number
    precioUnitario: number
  }[]
  compradorId: string
} {
  return {
    items: [{
      productoId: productId,
      cantidad: quantity,
      precioUnitario: price
    }],
    compradorId: buyerId
  }
}

export function validateCartForCentralizedPurchase(
  cartItems: Array<{
    id: string
    name: string
    price: number
    discountedPrice: number
    quantity: number
    sellerId: string
  }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!cartItems || cartItems.length === 0) {
    errors.push('El carrito está vacío')
    return { isValid: false, errors }
  }

  for (const item of cartItems) {
    if (!item.id) {
      errors.push('Producto sin ID válido')
    }
    if (!item.sellerId) {
      errors.push(`Producto ${item.name} sin vendedor válido`)
    }
    if (item.quantity <= 0) {
      errors.push(`Cantidad inválida para ${item.name}`)
    }
    if ((item.discountedPrice || item.price) <= 0) {
      errors.push(`Precio inválido para ${item.name}`)
    }
  }

  return { isValid: errors.length === 0, errors }
}

export function getCartPurchaseSummary(
  cartItems: Array<{
    id: string
    name: string
    price: number
    discountedPrice: number
    quantity: number
    sellerId: string
  }>
): {
  totalItems: number
  totalVendors: number
  subtotal: number
  commission: number
  total: number
  vendorBreakdown: {
    vendorId: string
    itemCount: number
    subtotal: number
    commission: number
    netAmount: number
  }[]
} {
  const vendorMap = new Map<string, {
    vendorId: string
    itemCount: number
    subtotal: number
  }>()

  let totalItems = 0
  let subtotal = 0

  for (const item of cartItems) {
    const itemSubtotal = (item.discountedPrice || item.price) * item.quantity
    totalItems += item.quantity
    subtotal += itemSubtotal

    if (vendorMap.has(item.sellerId)) {
      const vendor = vendorMap.get(item.sellerId)!
      vendor.itemCount += item.quantity
      vendor.subtotal += itemSubtotal
    } else {
      vendorMap.set(item.sellerId, {
        vendorId: item.sellerId,
        itemCount: item.quantity,
        subtotal: itemSubtotal
      })
    }
  }

  const commission = calculateCommission(subtotal)
  const vendorBreakdown = Array.from(vendorMap.values()).map(vendor => ({
    ...vendor,
    commission: calculateCommission(vendor.subtotal),
    netAmount: calculateSellerAmount(vendor.subtotal)
  }))

  return {
    totalItems,
    totalVendors: vendorMap.size,
    subtotal,
    commission,
    total: subtotal,
    vendorBreakdown
  }
}

// ============================================================================
// FUNCIONES DE CONFIGURACIÓN BANCARIA
// ============================================================================

export function validateBankConfig(config: Partial<SellerBankConfig>): string[] {
  const errors: string[] = []
  
  console.log('Validating config:', config)
  
  if (!config.banco || typeof config.banco !== 'string' || !config.banco.trim()) {
    errors.push('El nombre del banco es requerido')
  }
  
  if (!config.tipoCuenta) {
    errors.push('El tipo de cuenta es requerido')
  }
  
  if (!config.cbu || typeof config.cbu !== 'string' || !config.cbu.trim()) {
    errors.push('El CBU es requerido')
  }
  
  if (!config.titular || typeof config.titular !== 'string' || !config.titular.trim()) {
    errors.push('El titular de la cuenta es requerido')
  }
  
  console.log('Validation errors:', errors)
  return errors
}

export async function saveSellerBankConfig(config: Omit<SellerBankConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    console.log('Saving bank config with data:', config)
    
    // Verificar cada campo individualmente
    const fieldsToCheck = [
      'vendedorId', 'cbu', 'alias', 'banco', 'titular', 'cuit', 
      'tipoCuenta', 'preferenciaRetiro'
    ]
    
    fieldsToCheck.forEach(field => {
      const value = (config as any)[field]
      console.log(`Field ${field}:`, value, typeof value)
      if (value !== undefined && value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        console.warn(`Field ${field} has unexpected type:`, typeof value, value)
      }
    })
    
    const docRef = doc(collection(db, 'sellerBankConfigs'))
    
    // Crear el objeto paso a paso para identificar el problema
    const baseConfig = {
      vendedorId: config.vendedorId,
      cbu: config.cbu,
      banco: config.banco,
      titular: config.titular,
      tipoCuenta: config.tipoCuenta,
      preferenciaRetiro: config.preferenciaRetiro,
      impuestoInmediato: config.impuestoInmediato,
      impuesto7Dias: config.impuesto7Dias,
      impuesto30Dias: config.impuesto30Dias,
      isActive: config.isActive
    }
    
    // Agregar campos opcionales solo si existen
    if (config.alias !== undefined) {
      (baseConfig as any).alias = config.alias
    }
    if (config.cuit !== undefined) {
      (baseConfig as any).cuit = config.cuit
    }
    
    const configToSave = {
      ...baseConfig,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    console.log('Config to save:', configToSave)
    console.log('Config to save (stringified):', JSON.stringify(configToSave, null, 2))
    
    // Intentar con addDoc primero
    try {
      const docRef2 = await addDoc(collection(db, 'sellerBankConfigs'), configToSave)
      console.log('Config saved successfully with addDoc, ID:', docRef2.id)
      return docRef2.id
    } catch (addDocError) {
      console.error('addDoc failed, trying setDoc:', addDocError)
      await setDoc(docRef, configToSave)
      console.log('Config saved successfully with setDoc, ID:', docRef.id)
      return docRef.id
    }
  } catch (error) {
    console.error('Error saving seller bank config:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

export async function updateSellerBankConfig(configId: string, config: Partial<SellerBankConfig>): Promise<void> {
  try {
    const docRef = doc(db, 'sellerBankConfigs', configId)
    await updateDoc(docRef, {
      ...config,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating seller bank config:', error)
    throw error
  }
}