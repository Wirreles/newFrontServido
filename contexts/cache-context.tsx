"use client"

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from 'react'

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

interface CacheContextType {
  setCache: <T>(key: string, data: T, ttl?: number) => void
  getCache: <T>(key: string) => T | null
  hasCache: (key: string) => boolean
  clearCache: () => void
  clearExpired: () => void
  removeCache: (key: string) => void
  getCacheStats: () => { size: number; totalSize: number; expiredCount: number }
  preloadData: <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => Promise<T>
}

const CacheContext = createContext<CacheContextType | undefined>(undefined)

// Configuración del cache
const CACHE_CONFIG = {
  maxSize: 100, // Máximo número de entradas
  maxMemorySize: 50 * 1024 * 1024, // 50MB máximo
  cleanupInterval: 60 * 1000, // Limpiar cada minuto
  defaultTTL: 5 * 60 * 1000, // 5 minutos por defecto
}

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => new Map<string, CacheEntry>())
  const [totalSize, setTotalSize] = useState(0)

  // Calcular tamaño aproximado de los datos
  const calculateSize = useCallback((data: any): number => {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return 0
    }
  }, [])

  // Establecer datos en cache
  const setCache = useCallback(<T>(key: string, data: T, ttl: number = CACHE_CONFIG.defaultTTL) => {
    const size = calculateSize(data)
    
    // Verificar límites de memoria
    if (totalSize + size > CACHE_CONFIG.maxMemorySize) {
      clearExpired()
      if (totalSize + size > CACHE_CONFIG.maxMemorySize) {
        // Si aún excede, limpiar cache más agresivamente
        const entries = Array.from(cache.entries())
        entries.sort((a, b) => (a[1].lastAccessed - b[1].lastAccessed))
        
        // Eliminar 20% de las entradas más antiguas
        const toRemove = Math.ceil(entries.length * 0.2)
        entries.slice(0, toRemove).forEach(([key]) => {
          const entry = cache.get(key)
          if (entry) {
            setTotalSize(prev => prev - calculateSize(entry.data))
            cache.delete(key)
          }
        })
      }
    }

    // Verificar límite de entradas
    if (cache.size >= CACHE_CONFIG.maxSize) {
      const entries = Array.from(cache.entries())
      entries.sort((a, b) => (a[1].lastAccessed - b[1].lastAccessed))
      
      // Eliminar entradas más antiguas
      const toRemove = Math.ceil(cache.size * 0.1)
      entries.slice(0, toRemove).forEach(([key]) => {
        const entry = cache.get(key)
        if (entry) {
          setTotalSize(prev => prev - calculateSize(entry.data))
          cache.delete(key)
        }
      })
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    })
    
    setTotalSize(prev => prev + size)
  }, [cache, totalSize, calculateSize])

  // Obtener datos del cache
  const getCache = useCallback(<T>(key: string): T | null => {
    const entry = cache.get(key)
    if (!entry) return null

    const now = Date.now()
    
    // Verificar si expiró
    if (now - entry.timestamp > entry.ttl) {
      setTotalSize(prev => prev - calculateSize(entry.data))
      cache.delete(key)
      return null
    }

    // Actualizar estadísticas de acceso
    entry.accessCount++
    entry.lastAccessed = now
    
    return entry.data as T
  }, [cache, calculateSize])

  // Verificar si existe en cache
  const hasCache = useCallback((key: string): boolean => {
    const entry = cache.get(key)
    if (!entry) return false
    
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      setTotalSize(prev => prev - calculateSize(entry.data))
      cache.delete(key)
      return false
    }
    
    return true
  }, [cache, calculateSize])

  // Limpiar cache expirado
  const clearExpired = useCallback(() => {
    const now = Date.now()
    let expiredCount = 0
    
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        setTotalSize(prev => prev - calculateSize(entry.data))
        cache.delete(key)
        expiredCount++
      }
    }
    
    return expiredCount
  }, [cache, calculateSize])

  // Eliminar entrada específica
  const removeCache = useCallback((key: string) => {
    const entry = cache.get(key)
    if (entry) {
      setTotalSize(prev => prev - calculateSize(entry.data))
      cache.delete(key)
    }
  }, [cache, calculateSize])

  // Limpiar todo el cache
  const clearCache = useCallback(() => {
    cache.clear()
    setTotalSize(0)
  }, [cache])

  // Obtener estadísticas del cache
  const getCacheStats = useCallback(() => {
    const now = Date.now()
    let expiredCount = 0
    
    for (const entry of cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++
      }
    }
    
    return {
      size: cache.size,
      totalSize,
      expiredCount
    }
  }, [cache, totalSize])

  // Precargar datos (get or fetch)
  const preloadData = useCallback(async <T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = CACHE_CONFIG.defaultTTL
  ): Promise<T> => {
    const cached = getCache<T>(key)
    if (cached) return cached
    
    const data = await fetcher()
    setCache(key, data, ttl)
    return data
  }, [getCache, setCache])

  // Limpieza automática del cache
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpired()
    }, CACHE_CONFIG.cleanupInterval)

    return () => clearInterval(interval)
  }, [clearExpired])

  // Limpiar cache al cerrar la ventana
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Guardar estadísticas en localStorage para análisis
      const stats = getCacheStats()
      localStorage.setItem('cache_stats', JSON.stringify({
        ...stats,
        timestamp: Date.now()
      }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [getCacheStats])

  const value: CacheContextType = {
    setCache,
    getCache,
    hasCache,
    clearCache,
    clearExpired,
    removeCache,
    getCacheStats,
    preloadData
  }

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  )
}

export const useCache = () => {
  const context = useContext(CacheContext)
  if (!context) {
    throw new Error('useCache must be used within CacheProvider')
  }
  return context
}

// Hook para debug del cache
export const useCacheDebug = () => {
  const { getCacheStats, clearCache, clearExpired } = useCache()
  const [stats, setStats] = useState(getCacheStats())

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCacheStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [getCacheStats])

  return {
    stats,
    clearCache,
    clearExpired
  }
}
