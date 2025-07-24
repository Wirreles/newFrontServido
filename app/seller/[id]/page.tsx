"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Store, 
  Package, 
  Star, 
  MapPin, 
  Calendar, 
  Search, 
  Filter,
  Heart,
  ShoppingCart,
  MessageSquare,
  Loader2,
  AlertCircle,
  User,
  Edit,
  Trash2
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { getProductThumbnail } from "@/lib/image-utils"
import { useAuth } from "@/contexts/auth-context"
import { useCart } from "@/contexts/cart-context"

interface SellerProfile {
  uid: string
  displayName?: string
  email?: string
  photoURL?: string
  createdAt?: any
  isSubscribed?: boolean
  description?: string
  location?: string
  phone?: string
  website?: string
  socialMedia?: {
    instagram?: string
    facebook?: string
    twitter?: string
  }
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  media: any[]
  imageUrl?: string
  isService: boolean
  sellerId: string
  stock?: number
  createdAt: any
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
  couponId?: string
  couponStartDate?: any
  couponEndDate?: any
}

export default function SellerProfilePage() {
  const params = useParams()
  const sellerId = params.id as string
  const { currentUser } = useAuth()
  const { addItem } = useCart()

  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [priceFilter, setPriceFilter] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [activeTab, setActiveTab] = useState("products")

  // Estados para interacciones
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [favoriting, setFavoriting] = useState<string | null>(null)

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!sellerId) return

      try {
        setLoading(true)
        setError(null)

        // Obtener datos del vendedor
        const sellerDoc = await getDoc(doc(db, "users", sellerId))
        if (!sellerDoc.exists()) {
          setError("Vendedor no encontrado")
          return
        }

        const sellerData = sellerDoc.data() as SellerProfile
        setSeller({ ...sellerData, uid: sellerId })

        // Obtener productos del vendedor
        const productsQuery = query(
          collection(db, "products"),
          where("sellerId", "==", sellerId),
          where("isService", "==", false),
          orderBy("createdAt", "desc")
        )
        const productsSnapshot = await getDocs(productsQuery)
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
        setProducts(productsData)

        // Obtener servicios del vendedor
        const servicesQuery = query(
          collection(db, "products"),
          where("sellerId", "==", sellerId),
          where("isService", "==", true),
          orderBy("createdAt", "desc")
        )
        const servicesSnapshot = await getDocs(servicesQuery)
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
        setServices(servicesData)

      } catch (err) {
        console.error("Error fetching seller data:", err)
        setError("Error al cargar los datos del vendedor")
      } finally {
        setLoading(false)
      }
    }

    fetchSellerData()
  }, [sellerId])

  // Filtrar y ordenar productos
  const getFilteredItems = (items: Product[]) => {
    let filtered = items

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por categoría
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Filtro por precio
    if (priceFilter && priceFilter !== "all") {
      const [min, max] = priceFilter.split("-").map(Number)
      filtered = filtered.filter(item => {
        if (max) {
          return item.price >= min && item.price <= max
        }
        return item.price >= min
      })
    }

    // Ordenamiento
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "newest":
      default:
        filtered.sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.())
        break
    }

    return filtered
  }

  const handleAddToCart = async (product: Product) => {
    if (!currentUser) {
      // Redirigir al login si no está autenticado
      window.location.href = "/login"
      return
    }

    setAddingToCart(product.id)
    try {
      addItem({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discountedPrice: product.price, // Sin descuento por defecto
        quantity: 1,
        imageUrl: product.imageUrl,
        media: product.media,
        isService: product.isService,
        sellerId: product.sellerId,
        stock: product.stock,
        condition: product.condition,
        freeShipping: product.freeShipping,
        shippingCost: product.shippingCost
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setAddingToCart(null)
    }
  }

  const handleAddToFavorites = async (productId: string) => {
    if (!currentUser) {
      window.location.href = "/login"
      return
    }

    setFavoriting(productId)
    try {
      // Aquí implementarías la lógica para agregar a favoritos
      // Por ahora solo simulamos
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error("Error adding to favorites:", error)
    } finally {
      setFavoriting(null)
    }
  }

  // Verificar si el usuario actual es el propietario de la tienda
  const isOwner = currentUser?.firebaseUser.uid === sellerId

  const handleContactSeller = async () => {
    if (!currentUser) {
      window.location.href = "/login"
      return
    }

    // No permitir contactarse a sí mismo
    if (isOwner) {
      return
    }

    // Aquí implementarías la lógica para iniciar chat
    window.location.href = `/chat/${sellerId}`
  }

  const handleDeleteProduct = async (productId: string, isService: boolean) => {
    if (!isOwner) return

    if (confirm(`¿Estás seguro de que quieres eliminar este ${isService ? 'servicio' : 'producto'}?`)) {
      try {
        await deleteDoc(doc(db, "products", productId))
        // Actualizar la lista local
        if (isService) {
          setServices(prev => prev.filter(s => s.id !== productId))
        } else {
          setProducts(prev => prev.filter(p => p.id !== productId))
        }
      } catch (error) {
        console.error("Error deleting product:", error)
        alert("Error al eliminar el producto")
      }
    }
  }

  const handleEditProduct = (productId: string) => {
    if (!isOwner) return
    // Redirigir a la página de edición
    window.location.href = `/dashboard/seller/edit/${productId}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    )
  }

  if (error || !seller) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Vendedor no encontrado"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const filteredProducts = getFilteredItems(products)
  const filteredServices = getFilteredItems(services)
  const categories = [...new Set([...products, ...services].map(item => item.category))]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del vendedor */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar y info básica */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={seller.photoURL || "/placeholder-user.jpg"}
                  alt={seller.displayName || "Vendedor"}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-6 w-6 text-orange-600" />
                  {seller.displayName || "Vendedor"}
                </h1>
                <p className="text-gray-600 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Vendedor desde {seller.createdAt?.toDate?.()?.toLocaleDateString() || "recientemente"}
                </p>
                {seller.location && (
                  <p className="text-gray-600 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {seller.location}
                  </p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 ml-auto">
              {!isOwner && (
                <Button onClick={handleContactSeller} className="bg-orange-600 hover:bg-orange-700">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contactar
                </Button>
              )}
              {isOwner && (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/dashboard/seller">
                    <User className="h-4 w-4 mr-2" />
                    Mi Dashboard
                  </Link>
                </Button>
              )}
              {seller.isSubscribed && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Star className="h-3 w-3 mr-1" />
                  Vendedor Verificado
                </Badge>
              )}
            </div>
          </div>

          {/* Descripción */}
          {seller.description && (
            <div className="mt-6">
              <p className="text-gray-700 leading-relaxed">{seller.description}</p>
            </div>
          )}

          {/* Estadísticas */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{products.length}</div>
              <div className="text-sm text-gray-600">Productos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{services.length}</div>
              <div className="text-sm text-gray-600">Servicios</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {seller.createdAt?.toDate?.() ? 
                  Math.floor((Date.now() - seller.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24)) : 
                  0
                }
              </div>
              <div className="text-sm text-gray-600">Días activo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">4.8</div>
              <div className="text-sm text-gray-600">Calificación</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar productos o servicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Todos los precios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los precios</SelectItem>
                <SelectItem value="0-1000">Hasta $1,000</SelectItem>
                <SelectItem value="1000-5000">$1,000 - $5,000</SelectItem>
                <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                <SelectItem value="10000-">Más de $10,000</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="price-low">Precio: menor a mayor</SelectItem>
                <SelectItem value="price-high">Precio: mayor a menor</SelectItem>
                <SelectItem value="name">Nombre A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs de productos y servicios */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos ({filteredProducts.length})
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Servicios ({filteredServices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos disponibles</h3>
                  <p className="text-gray-500 text-center">
                    Este vendedor aún no ha publicado productos.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={getProductThumbnail(product.media, product.imageUrl, product.name)}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {!isOwner && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 bg-white/80 hover:bg-white"
                              onClick={() => handleAddToFavorites(product.id)}
                              disabled={favoriting === product.id}
                            >
                              {favoriting === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Heart className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwner && (
                            <>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-blue-500/80 hover:bg-blue-500 text-white"
                                onClick={() => handleEditProduct(product.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-red-500/80 hover:bg-red-500 text-white"
                                onClick={() => handleDeleteProduct(product.id, false)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        {product.condition && (
                          <Badge 
                            variant="secondary" 
                            className="absolute top-2 left-2 bg-white/80 text-xs"
                          >
                            {product.condition}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">
                          <Link href={`/product/${product.id}`} className="hover:text-orange-600">
                            {product.name}
                          </Link>
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-orange-600">
                            {formatPrice(product.price)}
                          </span>
                          {!isOwner && (
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(product)}
                              disabled={addingToCart === product.id}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              {addingToCart === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwner && (
                            <div className="text-sm text-gray-500">
                              Tu producto
                            </div>
                          )}
                        </div>
                        {product.freeShipping && (
                          <Badge variant="outline" className="text-xs">
                            Envío gratis
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services">
            {filteredServices.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Store className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay servicios disponibles</h3>
                  <p className="text-gray-500 text-center">
                    Este vendedor aún no ha publicado servicios.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredServices.map((service) => (
                  <Card key={service.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={getProductThumbnail(service.media, service.imageUrl, service.name)}
                          alt={service.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {!isOwner && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 bg-white/80 hover:bg-white"
                              onClick={() => handleAddToFavorites(service.id)}
                              disabled={favoriting === service.id}
                            >
                              {favoriting === service.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Heart className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwner && (
                            <>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-blue-500/80 hover:bg-blue-500 text-white"
                                onClick={() => handleEditProduct(service.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-red-500/80 hover:bg-red-500 text-white"
                                onClick={() => handleDeleteProduct(service.id, true)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        <Badge className="absolute top-2 left-2 bg-blue-600 text-xs">
                          Servicio
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">
                          <Link href={`/product/${service.id}`} className="hover:text-orange-600">
                            {service.name}
                          </Link>
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-orange-600">
                            {formatPrice(service.price)}
                          </span>
                          {!isOwner && (
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(service)}
                              disabled={addingToCart === service.id}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              {addingToCart === service.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwner && (
                            <div className="text-sm text-gray-500">
                              Tu servicio
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 