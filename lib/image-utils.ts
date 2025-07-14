import { ProductMedia } from "@/types/product"

/**
 * Obtiene la imagen principal de un producto o servicio
 * Prioriza el array media, luego imageUrl, y finalmente un placeholder
 */
export function getProductMainImage(
  media?: ProductMedia[],
  imageUrl?: string,
  productName?: string
): string {
  // Si hay media y tiene elementos, usar la primera imagen
  if (media && media.length > 0) {
    const firstImage = media.find(m => m.type === "image")
    if (firstImage?.url) {
      return firstImage.url
    }
  }
  
  // Si no hay media pero hay imageUrl, usar imageUrl
  if (imageUrl) {
    return imageUrl
  }
  
  // Si no hay nada, usar placeholder
  const query = productName ? encodeURIComponent(productName) : "product"
  return `/placeholder.svg?height=200&width=200&query=${query}`
}

/**
 * Obtiene todas las imágenes de un producto o servicio
 * Combina media con imageUrl para compatibilidad hacia atrás
 */
export function getProductAllImages(
  media?: ProductMedia[],
  imageUrl?: string
): ProductMedia[] {
  const images: ProductMedia[] = []
  
  // Agregar imágenes del array media
  if (media && media.length > 0) {
    const imageMedia = media.filter(m => m.type === "image")
    images.push(...imageMedia)
  }
  
  // Si no hay imágenes en media pero hay imageUrl, agregarlo
  if (images.length === 0 && imageUrl) {
    images.push({
      type: "image",
      url: imageUrl,
      path: ""
    })
  }
  
  // Si no hay nada, agregar placeholder
  if (images.length === 0) {
    images.push({
      type: "image",
      url: "/placeholder.svg?height=200&width=200&query=product",
      path: ""
    })
  }
  
  return images
}

/**
 * Obtiene la primera imagen de un producto para uso en listados
 */
export function getProductThumbnail(
  media?: ProductMedia[],
  imageUrl?: string,
  productName?: string
): string {
  return getProductMainImage(media, imageUrl, productName)
}

/**
 * Obtiene la URL de imagen para un producto en el carrito
 */
export function getCartItemImage(
  media?: ProductMedia[],
  imageUrl?: string
): string {
  return getProductMainImage(media, imageUrl, "cart item")
}

/**
 * Obtiene la URL de imagen para un producto en búsquedas
 */
export function getSearchResultImage(
  media?: ProductMedia[],
  imageUrl?: string,
  productName?: string
): string {
  return getProductMainImage(media, imageUrl, productName)
}

/**
 * Obtiene la URL de imagen para un producto en el dashboard
 */
export function getDashboardProductImage(
  media?: ProductMedia[],
  imageUrl?: string
): string {
  return getProductMainImage(media, imageUrl, "dashboard product")
}

/**
 * Obtiene la URL de imagen para un producto en chats
 */
export function getChatProductImage(
  media?: ProductMedia[],
  imageUrl?: string
): string {
  return getProductMainImage(media, imageUrl, "chat product")
} 