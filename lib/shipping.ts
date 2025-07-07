import { doc, updateDoc, getDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { 
  ShippingInfo, 
  ShippingStatus, 
  PurchaseWithShipping, 
  ShippingUpdateRequest 
} from "@/types/shipping"

/**
 * Valida que el usuario tenga permisos para actualizar el envío
 */
async function validateShippingPermissions(
  purchaseId: string, 
  userId: string
): Promise<{ valid: boolean; error?: string; purchaseData?: any }> {
  try {
    const purchaseRef = doc(db, "purchases", purchaseId)
    const purchaseSnap = await getDoc(purchaseRef)
    
    if (!purchaseSnap.exists()) {
      return { valid: false, error: "Compra no encontrada" }
    }

    const purchaseData = purchaseSnap.data()
    
    // Verificar que el usuario sea el vendedor de la compra
    if (purchaseData.sellerId !== userId) {
      return { valid: false, error: "No tienes permisos para actualizar este envío" }
    }

    // Verificar que la compra esté aprobada
    if (purchaseData.status !== "approved") {
      return { valid: false, error: "Solo se pueden actualizar envíos de compras aprobadas" }
    }

    // Verificar que no sea un servicio
    if (purchaseData.productIsService) {
      return { valid: false, error: "Los servicios no requieren envío físico" }
    }

    return { valid: true, purchaseData }
  } catch (error) {
    console.error("Error validating shipping permissions:", error)
    return { valid: false, error: "Error al validar permisos" }
  }
}

/**
 * Valida los datos de actualización de envío
 */
function validateShippingUpdate(update: Omit<ShippingUpdateRequest, 'purchaseId'>): { valid: boolean; error?: string } {
  const validStatuses: ShippingStatus[] = ["pending", "preparing", "shipped", "delivered", "cancelled"]
  
  if (!validStatuses.includes(update.status)) {
    return { valid: false, error: "Estado de envío inválido" }
  }

  // Validar número de tracking si se proporciona
  if (update.trackingNumber && update.trackingNumber.trim().length < 3) {
    return { valid: false, error: "El número de seguimiento debe tener al menos 3 caracteres" }
  }

  // Validar nombre del transportista si se proporciona
  if (update.carrierName && update.carrierName.trim().length < 2) {
    return { valid: false, error: "El nombre del transportista debe tener al menos 2 caracteres" }
  }

  // Validar notas si se proporcionan
  if (update.notes && update.notes.trim().length > 500) {
    return { valid: false, error: "Las notas no pueden exceder 500 caracteres" }
  }

  return { valid: true }
}

/**
 * Valida transiciones de estado permitidas
 */
function validateStatusTransition(currentStatus: ShippingStatus | undefined, newStatus: ShippingStatus): { valid: boolean; error?: string } {
  // Si no hay estado actual, se puede inicializar con cualquier estado
  if (!currentStatus) {
    return { valid: true }
  }

  // Definir transiciones válidas
  const validTransitions: Record<ShippingStatus, ShippingStatus[]> = {
    pending: ["preparing", "cancelled"],
    preparing: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [], // No se puede cambiar una vez entregado
    cancelled: [] // No se puede cambiar una vez cancelado
  }

  if (!validTransitions[currentStatus].includes(newStatus)) {
    return { 
      valid: false, 
      error: `No se puede cambiar de ${currentStatus} a ${newStatus}` 
    }
  }

  return { valid: true }
}

/**
 * Crea una notificación de envío para el comprador
 */
export async function createShippingNotification(
  buyerId: string,
  purchaseId: string,
  productName: string,
  status: ShippingStatus,
  trackingNumber?: string,
  carrierName?: string
): Promise<{ success: boolean; error?: string }> {
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
      type: "shipping",
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
    
    return { success: true }
  } catch (error) {
    console.error("Error creating shipping notification:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    }
  }
}

/**
 * Actualiza el estado de envío de una compra con validaciones de seguridad
 */
export async function updateShippingStatus(
  purchaseId: string, 
  update: Omit<ShippingUpdateRequest, 'purchaseId'>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validar permisos del usuario
    const permissionCheck = await validateShippingPermissions(purchaseId, updatedBy)
    if (!permissionCheck.valid) {
      return { success: false, error: permissionCheck.error }
    }

    // Validar datos de actualización
    const updateValidation = validateShippingUpdate(update)
    if (!updateValidation.valid) {
      return { success: false, error: updateValidation.error }
    }

    const purchaseData = permissionCheck.purchaseData
    
    // Validar transición de estado
    const currentStatus = purchaseData.shipping?.status
    const statusTransition = validateStatusTransition(currentStatus, update.status)
    if (!statusTransition.valid) {
      return { success: false, error: statusTransition.error }
    }

    const purchaseRef = doc(db, "purchases", purchaseId)
    
    const shippingInfo: ShippingInfo = {
      status: update.status,
      trackingNumber: update.trackingNumber?.trim() || undefined,
      carrierName: update.carrierName?.trim() || undefined,
      estimatedDelivery: update.estimatedDelivery,
      notes: update.notes?.trim() || undefined,
      updatedAt: new Date(),
      updatedBy
    }

    // Si el estado es "delivered", agregar fecha de entrega real
    if (update.status === "delivered") {
      shippingInfo.actualDelivery = new Date()
    }

    await updateDoc(purchaseRef, {
      shipping: shippingInfo
    })

    // Crear notificación para el comprador
    if (purchaseData.buyerId && purchaseData.productName) {
      await createShippingNotification(
        purchaseData.buyerId,
        purchaseId,
        purchaseData.productName,
        update.status,
        update.trackingNumber?.trim(),
        update.carrierName?.trim()
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating shipping status:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    }
  }
}

/**
 * Obtiene envíos de un vendedor con validaciones de seguridad
 */
export async function getSellerShipments(sellerId: string): Promise<PurchaseWithShipping[]> {
  try {
    if (!sellerId || sellerId.trim().length === 0) {
      throw new Error("ID de vendedor requerido")
    }

    const purchasesQuery = query(
      collection(db, "purchases"),
      where("sellerId", "==", sellerId),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    )

    const purchasesSnapshot = await getDocs(purchasesQuery)
    const purchases = purchasesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseWithShipping[]

    // Enriquecer con información del producto y comprador
    const enrichedPurchases = await Promise.all(
      purchases.map(async (purchase) => {
        try {
          // Obtener información del producto
          const productDoc = await getDoc(doc(db, "products", purchase.productId))
          const productData = productDoc.exists() ? productDoc.data() : null

          // Obtener información del comprador
          const buyerDoc = await getDoc(doc(db, "users", purchase.buyerId))
          const buyerData = buyerDoc.exists() ? buyerDoc.data() : null

          return {
            ...purchase,
            productName: productData?.name || "Producto no encontrado",
            productImage: productData?.media?.[0]?.url || null,
            productIsService: productData?.isService || false,
            buyerName: buyerData?.displayName || "Usuario no encontrado",
            buyerEmail: buyerData?.email || null
          }
        } catch (error) {
          console.error(`Error enriching purchase ${purchase.id}:`, error)
          return {
            ...purchase,
            productName: "Error al cargar producto",
            productImage: null,
            productIsService: false,
            buyerName: "Error al cargar usuario",
            buyerEmail: null
          }
        }
      })
    )

    return enrichedPurchases
  } catch (error) {
    console.error("Error fetching seller shipments:", error)
    throw error
  }
}

/**
 * Obtiene envíos de un comprador con validaciones de seguridad
 */
export async function getBuyerShipments(buyerId: string): Promise<PurchaseWithShipping[]> {
  try {
    if (!buyerId || buyerId.trim().length === 0) {
      throw new Error("ID de comprador requerido")
    }

    const purchasesQuery = query(
      collection(db, "purchases"),
      where("buyerId", "==", buyerId),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    )

    const purchasesSnapshot = await getDocs(purchasesQuery)
    const purchases = purchasesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseWithShipping[]

    // Enriquecer con información del producto y vendedor
    const enrichedPurchases = await Promise.all(
      purchases.map(async (purchase) => {
        try {
          // Obtener información del producto
          const productDoc = await getDoc(doc(db, "products", purchase.productId))
          const productData = productDoc.exists() ? productDoc.data() : null

          // Obtener información del vendedor
          const sellerDoc = await getDoc(doc(db, "users", purchase.sellerId))
          const sellerData = sellerDoc.exists() ? sellerDoc.data() : null

          return {
            ...purchase,
            productName: productData?.name || "Producto no encontrado",
            productImage: productData?.media?.[0]?.url || null,
            productIsService: productData?.isService || false,
            sellerName: sellerData?.displayName || "Vendedor no encontrado",
            sellerEmail: sellerData?.email || null
          }
        } catch (error) {
          console.error(`Error enriching purchase ${purchase.id}:`, error)
          return {
            ...purchase,
            productName: "Error al cargar producto",
            productImage: null,
            productIsService: false,
            sellerName: "Error al cargar vendedor",
            sellerEmail: null
          }
        }
      })
    )

    return enrichedPurchases
  } catch (error) {
    console.error("Error fetching buyer shipments:", error)
    throw error
  }
}

/**
 * Obtiene una compra específica con información de envío
 */


/**
 * Inicializa el envío para una compra aprobada con validaciones
 */
export async function initializeShipping(purchaseId: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!purchaseId || !sellerId) {
      return { success: false, error: "ID de compra y vendedor requeridos" }
    }

    // Validar permisos
    const permissionCheck = await validateShippingPermissions(purchaseId, sellerId)
    if (!permissionCheck.valid) {
      return { success: false, error: permissionCheck.error }
    }

    const purchaseData = permissionCheck.purchaseData

    // Verificar que no tenga ya información de envío
    if (purchaseData.shipping) {
      return { success: false, error: "El envío ya está inicializado" }
    }

    const purchaseRef = doc(db, "purchases", purchaseId)
    
    const shippingInfo: ShippingInfo = {
      status: "pending",
      updatedAt: new Date(),
      updatedBy: sellerId
    }

    await updateDoc(purchaseRef, {
      shipping: shippingInfo
    })

    // Crear notificación inicial para el comprador
    if (purchaseData.buyerId && purchaseData.productName) {
      await createShippingNotification(
        purchaseData.buyerId,
        purchaseId,
        purchaseData.productName,
        "pending"
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error initializing shipping:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    }
  }
}

/**
 * Audita la seguridad y consistencia de los datos de envío
 */
export async function auditShippingData(purchaseId: string): Promise<{
  isValid: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}> {
  const issues: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const purchaseRef = doc(db, "purchases", purchaseId)
    const purchaseSnap = await getDoc(purchaseRef)
    
    if (!purchaseSnap.exists()) {
      issues.push("La compra no existe")
      return { isValid: false, issues, warnings, recommendations }
    }

    const purchaseData = purchaseSnap.data()
    const shipping = purchaseData.shipping

    // Verificar estado de la compra
    if (purchaseData.status !== "approved") {
      issues.push(`Estado de compra inválido: ${purchaseData.status}`)
    }

    // Verificar que no sea un servicio
    if (purchaseData.productIsService) {
      issues.push("Los servicios no deberían tener información de envío")
    }

    // Verificar datos de envío si existen
    if (shipping) {
      // Verificar estado válido
      const validStatuses = ["pending", "preparing", "shipped", "delivered", "cancelled"]
      if (!validStatuses.includes(shipping.status)) {
        issues.push(`Estado de envío inválido: ${shipping.status}`)
      }

      // Verificar fechas
      if (shipping.actualDelivery && shipping.status !== "delivered") {
        issues.push("Fecha de entrega real presente pero estado no es 'delivered'")
      }

      if (shipping.status === "delivered" && !shipping.actualDelivery) {
        warnings.push("Estado 'delivered' sin fecha de entrega real")
      }

      // Verificar tracking para envíos shipped
      if (shipping.status === "shipped" && !shipping.trackingNumber) {
        warnings.push("Envío 'shipped' sin número de seguimiento")
        recommendations.push("Agregar número de seguimiento para mejor experiencia del usuario")
      }

      // Verificar longitud de campos
      if (shipping.trackingNumber && shipping.trackingNumber.length < 3) {
        issues.push("Número de seguimiento muy corto")
      }

      if (shipping.carrierName && shipping.carrierName.length < 2) {
        issues.push("Nombre de transportista muy corto")
      }

      if (shipping.notes && shipping.notes.length > 500) {
        issues.push("Notas demasiado largas")
      }

      // Verificar fechas lógicas
      if (shipping.estimatedDelivery && shipping.actualDelivery) {
        const estimated = new Date(shipping.estimatedDelivery)
        const actual = new Date(shipping.actualDelivery)
        const daysDifference = Math.abs((actual.getTime() - estimated.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDifference > 7) {
          warnings.push(`Gran diferencia entre entrega estimada y real: ${Math.round(daysDifference)} días`)
        }
      }

      // Verificar actualizaciones recientes
      if (shipping.updatedAt) {
        const lastUpdate = new Date(shipping.updatedAt)
        const daysSinceUpdate = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        
        if (shipping.status === "shipped" && daysSinceUpdate > 14) {
          warnings.push("Envío 'shipped' sin actualizaciones por más de 14 días")
          recommendations.push("Verificar estado del envío con el transportista")
        }
      }
    } else {
      // No hay información de envío
      if (purchaseData.status === "approved" && !purchaseData.productIsService) {
        warnings.push("Compra aprobada sin información de envío inicializada")
        recommendations.push("Inicializar información de envío")
      }
    }

    // Verificar integridad de IDs
    if (!purchaseData.sellerId || !purchaseData.buyerId || !purchaseData.productId) {
      issues.push("IDs de compra incompletos")
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      recommendations
    }

  } catch (error) {
    console.error("Error auditing shipping data:", error)
    return {
      isValid: false,
      issues: ["Error al auditar datos de envío"],
      warnings: [],
      recommendations: []
    }
  }
}

/**
 * Genera un reporte de auditoría para todas las compras de un vendedor
 */
export async function generateSellerShippingAudit(sellerId: string): Promise<{
  totalPurchases: number;
  issuesFound: number;
  warningsFound: number;
  details: Array<{
    purchaseId: string;
    productName: string;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  }>;
}> {
  try {
    if (!sellerId || sellerId.trim().length === 0) {
      throw new Error("ID de vendedor requerido")
    }

    const purchasesQuery = query(
      collection(db, "purchases"),
      where("sellerId", "==", sellerId),
      where("status", "==", "approved")
    )

    const purchasesSnapshot = await getDocs(purchasesQuery)
    const purchases = purchasesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{ id: string; productId?: string; [key: string]: any }>

    let totalIssues = 0
    let totalWarnings = 0
    const details: Array<{
      purchaseId: string;
      productName: string;
      issues: string[];
      warnings: string[];
      recommendations: string[];
    }> = []

    for (const purchase of purchases) {
      const audit = await auditShippingData(purchase.id)
      
      if (audit.issues.length > 0 || audit.warnings.length > 0) {
        // Obtener nombre del producto
        let productName = "Producto desconocido"
        try {
          if (purchase.productId) {
            const productDoc = await getDoc(doc(db, "products", purchase.productId))
            if (productDoc.exists()) {
              productName = productDoc.data()?.name || productName
            }
          }
        } catch (error) {
          console.error(`Error fetching product:`, error)
        }

        details.push({
          purchaseId: purchase.id,
          productName,
          issues: audit.issues,
          warnings: audit.warnings,
          recommendations: audit.recommendations
        })

        totalIssues += audit.issues.length
        totalWarnings += audit.warnings.length
      }
    }

    return {
      totalPurchases: purchases.length,
      issuesFound: totalIssues,
      warningsFound: totalWarnings,
      details
    }

  } catch (error) {
    console.error("Error generating shipping audit:", error)
    throw error
  }
} 