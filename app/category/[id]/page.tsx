"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { getProductThumbnail } from "@/lib/image-utils"
import { formatPrice } from "@/lib/utils"

interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  media?: any[]
  imageQuery?: string
  category?: string
  description?: string
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
}

interface Category {
  id: string
  name: string
  description?: string
}

export default function CategoryProductsPage() {
  const params = useParams()
  const router = useRouter()

  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchCategoryAndProducts(params.id as string)
    }
  }, [params.id])

  const fetchCategoryAndProducts = async (categoryId: string) => {
    setLoading(true)
    setError(null)
    try {
      // Fetch category details
      const categoryDoc = await getDoc(doc(db, "categories", categoryId))
      if (!categoryDoc.exists()) {
        setError("Categoría no encontrada.")
        setLoading(false)
        return
      }
      setCategory({ id: categoryDoc.id, ...categoryDoc.data() } as Category)

      // Fetch products for this category
      const productsQuery = query(
        collection(db, "products"),
        where("category", "==", categoryId),
        orderBy("createdAt", "desc"),
        limit(20), // Limit to 20 products for now
      )
      const productSnapshot = await getDocs(productsQuery)
      setProducts(productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product))
    } catch (err) {
      console.error("Error fetching category products:", err)
      setError("Error al cargar los productos de esta categoría.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Categoría no encontrada."}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Local Header for breadcrumbs and back button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <nav className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-blue-600">
                Inicio
              </Link>
              <span>/</span>
              <span className="text-gray-900 truncate">{category.name}</span>
            </nav>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Productos en {category.name}</h1>
        {category.description && <p className="text-gray-600 mb-8">{category.description}</p>}

        {products.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-lg text-muted-foreground mb-6">No hay productos disponibles en esta categoría.</p>
            <Button asChild>
              <Link href="/">Explorar otros productos</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="block">
                <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                  <div className="aspect-square relative w-full">
                    <Image
                      src={getProductThumbnail(product.media, product.imageUrl, product.name)}
                      alt={product.name}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <CardContent className="p-3 flex flex-col flex-grow">
                    <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                    <p className="text-lg font-semibold text-blue-600 mb-2">{formatPrice(product.price)}</p>
                    {/* Condición */}
                    {product.condition && (
                      <span className="text-xs font-medium text-gray-700 mb-1">
                        {product.condition === 'nuevo' ? 'Nuevo' : 'Usado'}
                      </span>
                    )}
                    {/* Envío */}
                    {product.freeShipping ? (
                      <span className="text-xs text-green-600">Envío gratis</span>
                    ) : (
                      <span className="text-xs text-gray-600">Envío: {product.shippingCost !== undefined ? formatPrice(product.shippingCost) : '-'}</span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
