import { useState, useEffect, useCallback, useRef } from 'react'
import { useCache } from '@/contexts/cache-context'

export interface ImageCacheEntry {
  src: string
  loaded: boolean
  error: boolean
  blob?: string
  size?: number
  timestamp: number
}

export interface ImageCacheOptions {
  ttl?: number
  maxSize?: number
  preload?: boolean
  quality?: 'low' | 'medium' | 'high'
}

export function useImageCache() {
  const { getCache, setCache, hasCache } = useCache()
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const abortControllers = useRef<Map<string, AbortController>>(new Map())

  // Claves de cache
  const CACHE_KEYS = {
    image: (src: string) => `image:${src}`,
    metadata: (src: string) => `image:metadata:${src}`,
    thumbnail: (src: string, size: number) => `image:thumb:${src}:${size}`,
  }

  // Precargar imagen
  const preloadImage = useCallback(async (
    src: string, 
    options: ImageCacheOptions = {}
  ): Promise<string> => {
    const { ttl = 30 * 60 * 1000, quality = 'medium' } = options
    
    // Verificar si ya está en cache
    const cached = getCache<ImageCacheEntry>(CACHE_KEYS.image(src))
    if (cached && cached.loaded && !cached.error) {
      return cached.blob || src
    }

    // Verificar si ya se está cargando
    if (loadingImages.has(src)) {
      // Esperar a que termine de cargar
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          const loaded = getCache<ImageCacheEntry>(CACHE_KEYS.image(src))
          if (loaded && loaded.loaded) {
            resolve(loaded.blob || src)
          } else if (loaded && loaded.error) {
            reject(new Error('Image failed to load'))
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      })
    }

    setLoadingImages(prev => new Set(prev).add(src))

    try {
      // Crear AbortController para cancelar si es necesario
      const controller = new AbortController()
      abortControllers.current.set(src, controller)

      const response = await fetch(src, { 
        signal: controller.signal,
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      // Crear entrada de cache
      const cacheEntry: ImageCacheEntry = {
        src,
        loaded: true,
        error: false,
        blob: blobUrl,
        size: blob.size,
        timestamp: Date.now()
      }

      // Cachear imagen
      setCache(CACHE_KEYS.image(src), cacheEntry, ttl)

      // Cachear metadata
      setCache(CACHE_KEYS.metadata(src), {
        size: blob.size,
        type: blob.type,
        timestamp: Date.now()
      }, ttl)

      return blobUrl
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Image loading was cancelled')
      }

      // Cachear error para evitar reintentos
      const errorEntry: ImageCacheEntry = {
        src,
        loaded: false,
        error: true,
        timestamp: Date.now()
      }
      setCache(CACHE_KEYS.image(src), errorEntry, 5 * 60 * 1000) // 5 minutos para errores

      throw error
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(src)
        return newSet
      })
      abortControllers.current.delete(src)
    }
  }, [getCache, setCache, loadingImages])

  // Crear thumbnail
  const createThumbnail = useCallback(async (
    src: string, 
    size: number = 200, 
    options: ImageCacheOptions = {}
  ): Promise<string> => {
    const { ttl = 60 * 60 * 1000 } = options // 1 hora para thumbnails
    
    // Verificar cache de thumbnail
    const cached = getCache<ImageCacheEntry>(CACHE_KEYS.thumbnail(src, size))
    if (cached && cached.loaded && !cached.error) {
      return cached.blob || src
    }

    try {
      // Cargar imagen original si no está en cache
      const originalBlob = await preloadImage(src, options)
      
      // Crear canvas para redimensionar
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Canvas context not available')
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = originalBlob
      })

      // Calcular dimensiones manteniendo aspect ratio
      const aspectRatio = img.width / img.height
      let newWidth = size
      let newHeight = size

      if (aspectRatio > 1) {
        newHeight = size / aspectRatio
      } else {
        newWidth = size * aspectRatio
      }

      canvas.width = newWidth
      canvas.height = newHeight

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      // Convertir a blob
      const thumbnailBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/jpeg', 0.8)
      })

      const thumbnailUrl = URL.createObjectURL(thumbnailBlob)

      // Cachear thumbnail
      const thumbnailEntry: ImageCacheEntry = {
        src: `${src}:${size}`,
        loaded: true,
        error: false,
        blob: thumbnailUrl,
        size: thumbnailBlob.size,
        timestamp: Date.now()
      }

      setCache(CACHE_KEYS.thumbnail(src, size), thumbnailEntry, ttl)

      return thumbnailUrl
    } catch (error) {
      console.error('Error creating thumbnail:', error)
      return src // Fallback a imagen original
    }
  }, [getCache, setCache, preloadImage])

  // Verificar si imagen está en cache
  const isImageCached = useCallback((src: string): boolean => {
    return hasCache(CACHE_KEYS.image(src))
  }, [hasCache])

  // Obtener imagen del cache
  const getCachedImage = useCallback((src: string): string | null => {
    const cached = getCache<ImageCacheEntry>(CACHE_KEYS.image(src))
    if (cached && cached.loaded && !cached.error) {
      return cached.blob || src
    }
    return null
  }, [getCache])

  // Precargar múltiples imágenes
  const preloadImages = useCallback(async (
    sources: string[], 
    options: ImageCacheOptions = {}
  ): Promise<string[]> => {
    const promises = sources.map(src => preloadImage(src, options))
    return Promise.all(promises)
  }, [preloadImage])

  // Cancelar carga de imagen
  const cancelImageLoad = useCallback((src: string) => {
    const controller = abortControllers.current.get(src)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(src)
    }
    setLoadingImages(prev => {
      const newSet = new Set(prev)
      newSet.delete(src)
      return newSet
    })
  }, [])

  // Limpiar recursos de imagen
  const cleanupImage = useCallback((src: string) => {
    const cached = getCache<ImageCacheEntry>(CACHE_KEYS.image(src))
    if (cached?.blob) {
      URL.revokeObjectURL(cached.blob)
    }
  }, [getCache])

  // Limpiar todas las imágenes
  const cleanupAllImages = useCallback(() => {
    // Esto se maneja automáticamente por el sistema de cache
    // Las URLs se revocan cuando se eliminan del cache
  }, [])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      // Cancelar todas las cargas pendientes
      abortControllers.current.forEach(controller => controller.abort())
      abortControllers.current.clear()
      
      // Limpiar loading state
      setLoadingImages(new Set())
    }
  }, [])

  return {
    preloadImage,
    preloadImages,
    createThumbnail,
    isImageCached,
    getCachedImage,
    cancelImageLoad,
    cleanupImage,
    cleanupAllImages,
    loadingImages: Array.from(loadingImages),
    isLoading: (src: string) => loadingImages.has(src)
  }
}
