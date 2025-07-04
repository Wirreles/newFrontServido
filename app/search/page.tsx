"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, Filter, Grid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"

interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  category?: string
  description?: string
  sellerName?: string
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const queryParam = searchParams.get('q') || ''
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState(queryParam)

  useEffect(() => {
    if (queryParam) {
      setSearchTerm(queryParam)
      searchProducts(queryParam)
    }
  }, [queryParam])

  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Búsqueda por nombre del producto
      const productsQuery = query(
        collection(db, "products"),
        where("name", ">=", term.toLowerCase()),
        where("name", "<=", term.toLowerCase() + "\uf8ff"),
        orderBy("name"),
        limit(50)
      )
      
      const productsSnapshot = await getDocs(productsQuery)
      let foundProducts = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[]

      // Si no hay resultados exactos, buscar por palabras clave
      if (foundProducts.length === 0) {
        const keywordsQuery = query(
          collection(db, "products"),
          where("keywords", "array-contains", term.toLowerCase()),
          limit(50)
        )
        const keywordsSnapshot = await getDocs(keywordsQuery)
        foundProducts = keywordsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
      }

      setProducts(foundProducts)
    } catch (error) {
      console.error("Error searching products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      const url = new URL(window.location.href)
      url.searchParams.set('q', searchTerm.trim())
      window.history.pushState({}, '', url.toString())
      searchProducts(searchTerm.trim())
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header de búsqueda */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar productos, marcas y más..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border-gray-200 focus:ring-2 focus:ring-purple-400"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        {/* Header de resultados */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resultados de búsqueda
            </h1>
            {queryParam && (
              <p className="text-gray-600 mt-1">
                {loading ? 'Buscando...' : `${products.length} productos encontrados para "${queryParam}"`}
              </p>
            )}
          </div>
          
          {/* Controles de vista */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Buscando productos...</p>
          </div>
        ) : products.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            : "space-y-4"
          }>
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/product/${product.id}`}>
                  <div className={viewMode === 'grid' ? "aspect-square relative" : "h-32 relative"}>
                    <Image
                      src={product.imageUrl || `/placeholder.svg?height=300&width=300&query=${product.name}`}
                      alt={product.name}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <CardContent className={`p-4 ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-2xl font-bold text-purple-600 mb-2">${product.price.toFixed(2)}</p>
                      {product.category && (
                        <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                      )}
                      {product.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : queryParam ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron productos</h2>
            <p className="text-gray-600 mb-6">
              No encontramos productos que coincidan con "{queryParam}"
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Sugerencias:</p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Verifica que las palabras estén escritas correctamente</li>
                <li>• Intenta con términos más generales</li>
                <li>• Usa menos palabras clave</li>
              </ul>
            </div>
            <Button asChild className="mt-6 bg-purple-600 hover:bg-purple-700">
              <Link href="/products">Explorar todos los productos</Link>
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Busca productos</h2>
            <p className="text-gray-600">Ingresa un término de búsqueda para encontrar productos</p>
          </div>
        )}
      </div>
    </div>
  )
} 