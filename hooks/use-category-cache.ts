import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useCache } from '@/contexts/cache-context'

export interface Category {
  id: string
  name: string
  description?: string
  imageUrl?: string
  icon?: string
  isActive?: boolean
  order?: number
  parentId?: string
  createdAt?: any
  updatedAt?: any
}

export function useCategoryCache() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { getCache, setCache, preloadData } = useCache()

  // Claves de cache
  const CACHE_KEYS = {
    all: 'categories:all',
    active: 'categories:active',
    byParent: (parentId: string) => `categories:parent:${parentId}`,
    byId: (id: string) => `category:${id}`,
  }

  // Obtener todas las categorías
  const fetchCategories = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCache<Category[]>(CACHE_KEYS.all)
      if (cached) {
        setCategories(cached)
        return cached
      }
    }

    setLoading(true)
    setError(null)

    try {
      const categoriesQuery = query(collection(db, "categories"), orderBy("order", "asc"))
      const categorySnapshot = await getDocs(categoriesQuery)
      const fetchedCategories = categorySnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      }) as Category)

      // Cachear por 10 minutos (las categorías no cambian mucho)
      setCache(CACHE_KEYS.all, fetchedCategories, 10 * 60 * 1000)
      
      // Cachear cada categoría individualmente
      fetchedCategories.forEach(category => {
        setCache(CACHE_KEYS.byId(category.id), category, 10 * 60 * 1000)
      })

      setCategories(fetchedCategories)
      return fetchedCategories
    } catch (err) {
      console.error("Error fetching categories:", err)
      const errorMsg = "Error al cargar las categorías. Intenta de nuevo más tarde."
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [getCache, setCache])

  // Obtener categorías activas
  const getActiveCategories = useCallback(async (): Promise<Category[]> => {
    const cached = getCache<Category[]>(CACHE_KEYS.active)
    if (cached) return cached

    const allCategories = await fetchCategories()
    const activeCategories = allCategories.filter(cat => cat.isActive !== false)
    
    setCache(CACHE_KEYS.active, activeCategories, 10 * 60 * 1000)
    return activeCategories
  }, [getCache, setCache, fetchCategories])

  // Obtener categoría por ID
  const getCategoryById = useCallback(async (id: string): Promise<Category | null> => {
    const cached = getCache<Category>(CACHE_KEYS.byId(id))
    if (cached) return cached

    // Si no está en cache, buscar en las categorías ya cargadas
    if (categories.length > 0) {
      const category = categories.find(cat => cat.id === id)
      if (category) {
        setCache(CACHE_KEYS.byId(id), category, 10 * 60 * 1000)
        return category
      }
    }

    // Si no está en cache ni en estado, cargar todas las categorías
    await fetchCategories()
    const category = categories.find(cat => cat.id === id)
    return category || null
  }, [getCache, setCache, categories, fetchCategories])

  // Obtener categorías por parent ID
  const getCategoriesByParent = useCallback(async (parentId: string): Promise<Category[]> => {
    const cacheKey = CACHE_KEYS.byParent(parentId)
    const cached = getCache<Category[]>(cacheKey)
    if (cached) return cached

    const allCategories = await fetchCategories()
    const childCategories = allCategories.filter(cat => cat.parentId === parentId)
    
    setCache(cacheKey, childCategories, 10 * 60 * 1000)
    return childCategories
  }, [getCache, setCache, fetchCategories])

  // Buscar categorías por nombre
  const searchCategories = useCallback(async (searchTerm: string): Promise<Category[]> => {
    const allCategories = await fetchCategories()
    const lowerSearchTerm = searchTerm.toLowerCase()
    
    return allCategories.filter(category => 
      category.name.toLowerCase().includes(lowerSearchTerm) ||
      category.description?.toLowerCase().includes(lowerSearchTerm)
    )
  }, [fetchCategories])

  // Precargar categorías en background
  const preloadCategories = useCallback(() => {
    preloadData(CACHE_KEYS.all, fetchCategories, 10 * 60 * 1000)
  }, [preloadData, fetchCategories])

  // Cargar categorías al montar el componente
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    loading,
    error,
    fetchCategories,
    getActiveCategories,
    getCategoryById,
    getCategoriesByParent,
    searchCategories,
    preloadCategories,
    refresh: () => fetchCategories(true)
  }
}
