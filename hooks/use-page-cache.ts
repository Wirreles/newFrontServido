import { useState, useEffect, useCallback } from 'react'
import { useCache } from '@/contexts/cache-context'

export interface PageCacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  pageKey: string
  params?: Record<string, any>
}

export interface PageCacheOptions {
  ttl?: number
  preload?: boolean
  forceRefresh?: boolean
}

export function usePageCache<T = any>(
  pageKey: string, 
  fetcher: () => Promise<T>,
  options: PageCacheOptions = {}
) {
  const { getCache, setCache, preloadData } = useCache()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { ttl = 10 * 60 * 1000, preload = false, forceRefresh = false } = options

  // Claves de cache
  const CACHE_KEYS = {
    page: (key: string) => `page:${key}`,
    pageWithParams: (key: string, params: Record<string, any>) => 
      `page:${key}:${JSON.stringify(params)}`,
  }

  // Obtener datos de la página
  const fetchPageData = useCallback(async (params?: Record<string, any>): Promise<T> => {
    const cacheKey = params 
      ? CACHE_KEYS.pageWithParams(pageKey, params)
      : CACHE_KEYS.page(pageKey)

    if (!forceRefresh) {
      const cached = getCache<PageCacheEntry<T>>(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
        setData(cached.data)
        return cached.data
      }
    }

    setLoading(true)
    setError(null)

    try {
      const fetchedData = await fetcher()
      
      // Cachear datos
      const cacheEntry: PageCacheEntry<T> = {
        data: fetchedData,
        timestamp: Date.now(),
        ttl,
        pageKey,
        params
      }
      
      setCache(cacheKey, cacheEntry, ttl)
      setData(fetchedData)
      
      return fetchedData
    } catch (err) {
      console.error(`Error fetching page data for ${pageKey}:`, err)
      const errorMsg = "Error al cargar los datos de la página. Intenta de nuevo más tarde."
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [pageKey, fetcher, ttl, forceRefresh, getCache, setCache])

  // Precargar datos en background
  const preloadPageData = useCallback((params?: Record<string, any>) => {
    const cacheKey = params 
      ? CACHE_KEYS.pageWithParams(pageKey, params)
      : CACHE_KEYS.page(pageKey)

    preloadData(cacheKey, () => fetcher(), ttl)
  }, [pageKey, fetcher, ttl, preloadData])

  // Refrescar datos (ignorar cache)
  const refresh = useCallback(async (params?: Record<string, any>) => {
    return fetchPageData(params)
  }, [fetchPageData])

  // Cargar datos al montar el componente
  useEffect(() => {
    if (preload) {
      preloadPageData()
    } else {
      fetchPageData()
    }
  }, [preload, preloadPageData, fetchPageData])

  return {
    data,
    loading,
    error,
    fetchPageData,
    preloadPageData,
    refresh,
    // Utilidades
    hasData: !!data,
    isEmpty: data !== null && Array.isArray(data) && data.length === 0,
    isError: !!error
  }
}

// Hook para cache de páginas con parámetros dinámicos
export function useDynamicPageCache<T = any>(
  pageKey: string,
  fetcher: (params: Record<string, any>) => Promise<T>,
  options: PageCacheOptions = {}
) {
  const { getCache, setCache } = useCache()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { ttl = 10 * 60 * 1000 } = options

  // Obtener datos con parámetros
  const fetchData = useCallback(async (params: Record<string, any>): Promise<T> => {
    const cacheKey = `page:${pageKey}:${JSON.stringify(params)}`
    
    const cached = getCache<PageCacheEntry<T>>(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      setData(cached.data)
      return cached.data
    }

    setLoading(true)
    setError(null)

    try {
      const fetchedData = await fetcher(params)
      
      // Cachear datos
      const cacheEntry: PageCacheEntry<T> = {
        data: fetchedData,
        timestamp: Date.now(),
        ttl,
        pageKey,
        params
      }
      
      setCache(cacheKey, cacheEntry, ttl)
      setData(fetchedData)
      
      return fetchedData
    } catch (err) {
      console.error(`Error fetching dynamic page data for ${pageKey}:`, err)
      const errorMsg = "Error al cargar los datos de la página. Intenta de nuevo más tarde."
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [pageKey, fetcher, ttl, getCache, setCache])

  // Verificar si existe en cache
  const hasCachedData = useCallback((params: Record<string, any>): boolean => {
    const cacheKey = `page:${pageKey}:${JSON.stringify(params)}`
    const cached = getCache<PageCacheEntry<T>>(cacheKey)
    return !!(cached && (Date.now() - cached.timestamp) < cached.ttl)
  }, [pageKey, getCache])

  // Obtener datos del cache
  const getCachedData = useCallback((params: Record<string, any>): T | null => {
    const cacheKey = `page:${pageKey}:${JSON.stringify(params)}`
    const cached = getCache<PageCacheEntry<T>>(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data
    }
    return null
  }, [pageKey, getCache])

  return {
    data,
    loading,
    error,
    fetchData,
    hasCachedData,
    getCachedData,
    refresh: (params: Record<string, any>) => fetchData(params)
  }
}

// Hook para cache de listas paginadas
export function usePaginatedPageCache<T = any>(
  pageKey: string,
  fetcher: (page: number, limit: number, filters?: Record<string, any>) => Promise<{
    data: T[]
    total: number
    page: number
    limit: number
  }>,
  options: PageCacheOptions & { defaultLimit?: number } = {}
) {
  const { getCache, setCache } = useCache()
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { ttl = 5 * 60 * 1000, defaultLimit = 20 } = options

  // Obtener datos paginados
  const fetchPage = useCallback(async (
    page: number = 1, 
    limit: number = defaultLimit, 
    filters?: Record<string, any>
  ) => {
    const cacheKey = `page:${pageKey}:${page}:${limit}:${JSON.stringify(filters || {})}`
    
    const cached = getCache<{
      data: T[]
      total: number
      page: number
      limit: number
      timestamp: number
      ttl: number
    }>(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      setData(cached.data)
      setTotal(cached.total)
      setCurrentPage(cached.page)
      return cached
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetcher(page, limit, filters)
      
      // Cachear resultado
      const cacheEntry = {
        ...result,
        timestamp: Date.now(),
        ttl
      }
      
      setCache(cacheKey, cacheEntry, ttl)
      setData(result.data)
      setTotal(result.total)
      setCurrentPage(result.page)
      
      return result
    } catch (err) {
      console.error(`Error fetching paginated data for ${pageKey}:`, err)
      const errorMsg = "Error al cargar los datos paginados. Intenta de nuevo más tarde."
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [pageKey, fetcher, defaultLimit, ttl, getCache, setCache])

  // Ir a página específica
  const goToPage = useCallback((page: number, filters?: Record<string, any>) => {
    return fetchPage(page, defaultLimit, filters)
  }, [fetchPage, defaultLimit])

  // Cambiar límite de elementos por página
  const changeLimit = useCallback((newLimit: number, filters?: Record<string, any>) => {
    return fetchPage(1, newLimit, filters)
  }, [fetchPage])

  // Aplicar filtros
  const applyFilters = useCallback((filters: Record<string, any>) => {
    return fetchPage(1, defaultLimit, filters)
  }, [fetchPage, defaultLimit])

  return {
    data,
    total,
    currentPage,
    loading,
    error,
    fetchPage,
    goToPage,
    changeLimit,
    applyFilters,
    // Utilidades
    hasData: data.length > 0,
    isEmpty: data.length === 0,
    totalPages: Math.ceil(total / defaultLimit),
    isFirstPage: currentPage === 1,
    isLastPage: currentPage >= Math.ceil(total / defaultLimit)
  }
}
