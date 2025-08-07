// Configuración para manejo de imágenes optimizado para Vercel

export const IMAGE_CONFIG = {
  // Tamaños de imagen predefinidos para evitar transformaciones
  sizes: {
    thumbnail: '150px',
    small: '300px',
    medium: '600px',
    large: '1200px',
    full: '100vw'
  },
  
  // Calidad de imagen (1-100)
  quality: 75,
  
  // Formato preferido
  format: 'webp' as 'webp' | 'jpeg' | 'png',
  
  // Placeholder por defecto
  placeholder: '/placeholder.svg',
  
  // Dominios permitidos para imágenes remotas
  allowedDomains: [
    'firebasestorage.googleapis.com',
    'lh3.googleusercontent.com', // Para avatares de Google
    'graph.facebook.com', // Para avatares de Facebook
  ]
}

// Función para generar URL de placeholder
export function getPlaceholderUrl(
  width: number = 200,
  height: number = 200,
  text?: string
): string {
  const query = text ? `&text=${encodeURIComponent(text)}` : ''
  return `${IMAGE_CONFIG.placeholder}?width=${width}&height=${height}${query}`
}

// Función para verificar si una URL es válida
export function isValidImageUrl(url: string): boolean {
  if (!url) return false
  
  // Verificar si es una URL válida
  try {
    const urlObj = new URL(url)
    return IMAGE_CONFIG.allowedDomains.some(domain => 
      urlObj.hostname.includes(domain)
    ) || url.startsWith('/')
  } catch {
    return false
  }
}

// Función para obtener la mejor imagen disponible
export function getBestImageUrl(
  primaryUrl?: string,
  fallbackUrl?: string,
  placeholderText?: string
): string {
  if (primaryUrl && isValidImageUrl(primaryUrl)) {
    return primaryUrl
  }
  
  if (fallbackUrl && isValidImageUrl(fallbackUrl)) {
    return fallbackUrl
  }
  
  return getPlaceholderUrl(200, 200, placeholderText)
}
