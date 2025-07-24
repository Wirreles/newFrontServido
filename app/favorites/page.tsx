"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Star, MapPin, Clock, User, Package, ShoppingCart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore"
import { formatPrice } from "@/lib/utils"
import { getProductThumbnail } from "@/lib/image-utils"
import { useToast } from "@/components/ui/use-toast"
import type { ProductMedia } from "@/types/product"

interface FavoriteProduct {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  media?: ProductMedia[]
  category?: string
  sellerId: string
  sellerName?: string
  sellerLocation?: string
  rating?: number
  reviewCount?: number
  isService: boolean
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
  createdAt: any
  favoriteId: string // ID del documento de favorito
}

export default function FavoritesPage() {
  const { currentUser, authLoading } = useAuth()
  const { toast } = useToast()
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    
    if (!currentUser) {
      setLoading(false)
      setError("Debes iniciar sesión para ver tus favoritos")
      return
    }

    fetchFavorites()
  }, [currentUser, authLoading])

  const fetchFavorites = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      // Obtener favoritos del usuario
      const favoritesQuery = query(
        collection(db, "favorites"),
        where("userId", "==", currentUser.firebaseUser.uid)
      )
      const favoritesSnapshot = await getDocs(favoritesQuery)
      
      // Obtener detalles de los productos
      const favoritesData: FavoriteProduct[] = []
      
      for (const favoriteDoc of favoritesSnapshot.docs) {
        const favoriteData = favoriteDoc.data()
        const productId = favoriteData.productId
        
        try {
          // Obtener datos del producto
          const productDoc = await getDocs(query(
            collection(db, "products"),
            where("__name__", "==", productId)
          ))
          
          if (!productDoc.empty) {
            const productData = productDoc.docs[0].data()
            favoritesData.push({
              ...productData,
              id: productId,
              favoriteId: favoriteDoc.id
            } as FavoriteProduct)
          }
        } catch (error) {
          console.error(`Error fetching product ${productId}:`, error)
        }
      }
      
      setFavorites(favoritesData)
    } catch (err) {
      console.error("Error fetching favorites:", err)
      setError("Error al cargar tus favoritos. Intenta de nuevo más tarde.")
    } finally {
      setLoading(false)
    }
  }

  const removeFromFavorites = async (favoriteId: string, productName: string) => {
    try {
      await deleteDoc(doc(db, "favorites", favoriteId))
      
      // Actualizar estado local
      setFavorites(prev => prev.filter(fav => fav.favoriteId !== favoriteId))
      
      toast({
        title: "Favorito eliminado",
        description: `${productName} se eliminó de tus favoritos`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Error removing favorite:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el favorito",
        variant: "destructive",
      })
    }
  }

  const addToCart = async (product: FavoriteProduct) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para agregar productos al carrito",
        variant: "destructive",
      })
      return
    }

    try {
      // Verificar si el producto ya está en el carrito
      const cartQuery = query(
        collection(db, "cart"),
        where("userId", "==", currentUser.firebaseUser.uid),
        where("productId", "==", product.id)
      )
      const cartSnapshot = await getDocs(cartQuery)
      
      if (!cartSnapshot.empty) {
        toast({
          title: "Producto ya en carrito",
          description: "Este producto ya está en tu carrito",
          duration: 3000,
        })
        return
      }

      // Agregar al carrito
      await addDoc(collection(db, "cart"), {
        userId: currentUser.firebaseUser.uid,
        productId: product.id,
        quantity: 1,
        addedAt: serverTimestamp()
      })

      toast({
        title: "Agregado al carrito",
        description: `${product.name} se agregó a tu carrito`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar al carrito",
        variant: "destructive",
      })
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center max-w-md mx-auto">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Mis Favoritos</h1>
            <p className="text-gray-600 mb-6">
              Inicia sesión para ver y gestionar tus productos favoritos
            </p>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full">Iniciar Sesión</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" className="w-full">Crear Cuenta</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando tus favoritos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchFavorites}>Intentar de nuevo</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-purple-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-purple-200" />
            <h1 className="text-4xl font-bold mb-4">Mis Favoritos</h1>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto">
              Tus productos y servicios favoritos guardados para acceder fácilmente
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Contador */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {favorites.length} favorito{favorites.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {/* Grid de favoritos */}
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((product) => (
              <Card key={product.favoriteId} className="h-full hover:shadow-lg transition-shadow duration-200 group">
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  <Image
                    src={getProductThumbnail(product.media, product.imageUrl, product.name)}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-purple-600 text-white">
                      {product.isService ? 'Servicio' : 'Producto'}
                    </Badge>
                  </div>
                  {product.condition && (
                    <div className="absolute top-2 right-2">
                      <Badge variant={product.condition === 'nuevo' ? 'default' : 'secondary'}>
                        {product.condition === 'nuevo' ? 'Nuevo' : 'Usado'}
                      </Badge>
                    </div>
                  )}
                  {/* Botón eliminar favorito */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeFromFavorites(product.favoriteId, product.name)
                    }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
                    title="Eliminar de favoritos"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <Link href={`/product/${product.id}`}>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {product.sellerName || 'Vendedor'}
                    </span>
                  </div>

                  {product.sellerLocation && (
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {product.sellerLocation}
                      </span>
                    </div>
                  )}

                  {product.rating && (
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">
                        {product.rating.toFixed(1)} ({product.reviewCount || 0} reseñas)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-purple-600">
                      {formatPrice(product.price)}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Disponible</span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        addToCart(product)
                      }}
                      className="flex-1"
                      size="sm"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                    <Link href={`/product/${product.id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes favoritos aún
            </h3>
            <p className="text-gray-600 mb-6">
              Explora productos y servicios para agregar a tus favoritos
            </p>
            <div className="space-x-4">
              <Link href="/products">
                <Button>Explorar Productos</Button>
              </Link>
              <Link href="/services">
                <Button variant="outline">Ver Servicios</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 