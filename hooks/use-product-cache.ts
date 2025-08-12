import { useState, useEffect, useCallback, useMemo } from 'react'
import { collection, query, getDocs, orderBy, limit, startAfter, QueryConstraint } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  imageUrl?: string
  media?: any[]
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
}

interface CacheEntry {
  data: Product[]
  timestamp: number
  lastDoc: any
  totalCount: number
}

interface UseProductCacheOptions {
  pageSize?: number
  cacheDuration?: number
  enableInfiniteScroll?: boolean
}

export function useProductCache(options: UseProductCacheOptions = {}) {
  const {
    pageSize = 20,
    cacheDuration = 5 * 60 * 1000, // 5 minutos por defecto
    enableInfiniteScroll = true
  } = options

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Cache en memoria
  const cache = useMemo(() => new Map<string, CacheEntry>(), [])

  // Generar clave de cache basada en filtros
  const generateCacheKey = useCallback((filters: Record<string, any>, sortBy: string) => {
    const filterString = Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|')
    
    return `${filterString}|sort:${sortBy}|pageSize:${pageSize}`
  }, [pageSize])

  // Obtener productos con cache
  const fetchProducts = useCallback(async (
    filters: Record<string, any> = {},
    sortBy: string = 'createdAt_desc',
    isLoadMore: boolean = false
  ) => {
    const cacheKey = generateCacheKey(filters, sortBy)
    
    try {
      setLoading(true)
      setError(null)

      // Verificar cache
      const cached = cache.get(cacheKey)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < cacheDuration) {
        if (isLoadMore) {
          setProducts(prev => [...prev, ...cached.data])
        } else {
          setProducts(cached.data)
        }
        setLastVisibleDoc(cached.lastDoc)
        setHasMore(cached.data.length === pageSize)
        setTotalCount(cached.totalCount)
        return
      }

      // Construir query
      let productsQuery = query(collection(db, 'products'))
      const constraints: QueryConstraint[] = []

      // Aplicar ordenamiento
      switch (sortBy) {
        case "price_asc":
          constraints.push(orderBy("price", "asc"))
          break
        case "price_desc":
          constraints.push(orderBy("price", "desc"))
          break
        case "name_asc":
          constraints.push(orderBy("name", "asc"))
          break
        case "name_desc":
          constraints.push(orderBy("name", "desc"))
          break
        case "createdAt_desc":
        default:
          constraints.push(orderBy("createdAt", "desc"))
          break
      }

      // Aplicar paginación
      if (isLoadMore && lastVisibleDoc) {
        constraints.push(startAfter(lastVisibleDoc))
      }
      constraints.push(limit(pageSize))

      // Ejecutar query
      const finalQuery = query(collection(db, 'products'), ...constraints)
      const productSnapshot = await getDocs(finalQuery)
      
      const fetchedProducts = productSnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      }) as Product)

      // Actualizar estado
      if (isLoadMore) {
        setProducts(prev => [...prev, ...fetchedProducts])
      } else {
        setProducts(fetchedProducts)
      }

      const newLastDoc = productSnapshot.docs[productSnapshot.docs.length - 1]
      setLastVisibleDoc(newLastDoc)
      setHasMore(fetchedProducts.length === pageSize)

      // Actualizar cache
      const cacheData = isLoadMore ? [...products, ...fetchedProducts] : fetchedProducts
      cache.set(cacheKey, {
        data: cacheData,
        timestamp: now,
        lastDoc: newLastDoc,
        totalCount: cacheData.length
      })

      // Limpiar cache antiguo (mantener solo las últimas 10 entradas)
      if (cache.size > 10) {
        const entries = Array.from(cache.entries())
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
        entries.slice(10).forEach(([key]) => cache.delete(key))
      }

    } catch (err) {
      console.error("Error fetching products:", err)
      setError("Error al cargar los productos. Intenta de nuevo más tarde.")
    } finally {
      setLoading(false)
    }
  }, [cache, generateCacheKey, cacheDuration, pageSize, lastVisibleDoc, products])

  // Cargar más productos
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchProducts({}, 'createdAt_desc', true)
    }
  }, [hasMore, loading, fetchProducts])

  // Limpiar cache
  const clearCache = useCallback(() => {
    cache.clear()
    setProducts([])
    setLastVisibleDoc(null)
    setHasMore(true)
    setTotalCount(0)
  }, [cache])

  // Refrescar datos (ignorar cache)
  const refresh = useCallback(async (filters: Record<string, any> = {}, sortBy: string = 'createdAt_desc') => {
    const cacheKey = generateCacheKey(filters, sortBy)
    cache.delete(cacheKey)
    await fetchProducts(filters, sortBy, false)
  }, [cache, generateCacheKey, fetchProducts])

  return {
    products,
    loading,
    error,
    hasMore,
    totalCount,
    fetchProducts,
    loadMore,
    clearCache,
    refresh
  }
}
