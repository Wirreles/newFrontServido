"use client"

import { Separator } from "@/components/ui/separator"

import Link from "next/link"
import {
  Home,
  ShoppingBag,
  Heart,
  User,
  LogOut,
  Clock,
  Settings,
  CreditCard,
  MapPin,
  Package,
  MessageSquare,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

import { useState, useEffect, type ChangeEvent } from "react"
import { db, storage } from "@/lib/firebase"
import { doc, collection, query, where, getDocs, deleteDoc, orderBy, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { updateProfile, getAuth } from "firebase/auth" // Import updateProfile
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ChatList } from "@/components/chat-list"
import { Input } from "@/components/ui/input" // Import Input

interface UserProfile {
  uid: string
  displayName?: string | null
  email?: string | null
  role?: "user" | "seller" | "admin"
  photoURL?: string // Added for profile picture URL
  photoPath?: string // Added for profile picture storage path
}

interface Order {
  id: string
  products: OrderProduct[]
  total: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  createdAt: any
  address?: string
}

interface OrderProduct {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

interface FavoriteProduct {
  id: string // This is the favorite document ID
  productId: string // This is the actual product ID
  name: string
  price: number
  imageUrl?: string
  addedAt: any
}

export default function BuyerDashboardPage() {
  const { currentUser, authLoading, handleLogout, refreshUserProfile } = useAuth() // Use useAuth hook
  const router = useRouter()
  const auth = getAuth()

  const [activeTab, setActiveTab] = useState("dashboard")
  const [orders, setOrders] = useState<Order[]>([])
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])

  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Profile Image Upload State
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<string | null>(null)
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false)
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<string | null>(null)
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
      return
    }
    if (currentUser?.role === "seller") {
      router.push("/dashboard/seller")
      return
    }
    if (currentUser) {
      fetchBuyerData(currentUser.uid)
      // Set initial profile image preview if available
      if (currentUser.photoURL) {
        setProfileImagePreviewUrl(currentUser.photoURL)
      }
    }
  }, [currentUser, authLoading, router])

  const fetchBuyerData = async (userId: string) => {
    setLoadingData(true)
    setError(null)
    try {
      // Simulamos datos de órdenes ya que aún no tenemos esta colección
      // En una implementación real, obtendríamos estos datos de Firestore
      setOrders([
        {
          id: "order1",
          products: [
            {
              id: "prod1",
              name: "Smartphone XYZ",
              price: 299.99,
              quantity: 1,
              imageUrl: "/placeholder.svg?height=50&width=50",
            },
          ],
          total: 299.99,
          status: "delivered",
          createdAt: new Date(2023, 5, 15),
          address: "Calle Principal 123, Ciudad",
        },
        {
          id: "order2",
          products: [
            {
              id: "prod2",
              name: "Auriculares Bluetooth",
              price: 49.99,
              quantity: 1,
              imageUrl: "/placeholder.svg?height=50&width=50",
            },
            {
              id: "prod3",
              name: "Cargador USB-C",
              price: 19.99,
              quantity: 2,
              imageUrl: "/placeholder.svg?height=50&width=50",
            },
          ],
          total: 89.97,
          status: "shipped",
          createdAt: new Date(2023, 6, 20),
          address: "Avenida Central 456, Ciudad",
        },
      ] as Order[])

      // Fetch real favorites from Firestore
      const favoritesQuery = query(
        collection(db, "favorites"),
        where("userId", "==", userId),
        orderBy("addedAt", "desc"),
      )
      const favoriteSnapshot = await getDocs(favoritesQuery)
      setFavorites(favoriteSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FavoriteProduct))
    } catch (err) {
      console.error("Error fetching buyer data:", err)
      setError("Error al cargar tus datos de comprador.")
    } finally {
      setLoadingData(false)
    }
  }

  const handleRemoveFavorite = async (favoriteId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este producto de tus favoritos?")) {
      return
    }
    try {
      await deleteDoc(doc(db, "favorites", favoriteId))
      setFavorites((prevFavorites) => prevFavorites.filter((fav) => fav.id !== favoriteId))
      setSuccessMessage("Producto eliminado de favoritos.")
    } catch (err) {
      console.error("Error removing favorite:", err)
      setError("Error al eliminar el producto de favoritos.")
    }
  }

  const getStatusBadgeClass = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "processing":
        return "Procesando"
      case "shipped":
        return "Enviado"
      case "delivered":
        return "Entregado"
      case "cancelled":
        return "Cancelado"
      default:
        return status
    }
  }

  // --- Profile Image Functions ---
  const handleProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfileImageFile(file)
      setProfileImagePreviewUrl(URL.createObjectURL(file))
      setProfileUpdateError(null)
      setProfileUpdateSuccess(null)
    }
  }

  const handleUploadProfileImage = async () => {
    if (!currentUser || !profileImageFile) {
      setProfileUpdateError("No hay imagen seleccionada o usuario no autenticado.")
      return
    }

    setUploadingProfileImage(true)
    setProfileUpdateError(null)
    setProfileUpdateSuccess(null)

    const filePath = `users/${currentUser.uid}/profile.jpg` // Consistent file name
    const storageRef = ref(storage, filePath)

    try {
      // Delete previous image if it exists
      if (currentUser.photoPath) {
        const prevImageRef = ref(storage, currentUser.photoPath)
        await deleteObject(prevImageRef).catch((err) => console.warn("Error deleting old profile image:", err))
      }

      await uploadBytes(storageRef, profileImageFile)
      const downloadURL = await getDownloadURL(storageRef)

      // Update Firestore user document
      const userDocRef = doc(db, "users", currentUser.uid)
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
        photoPath: filePath,
      })

      // Update Firebase Auth profile (optional, but good for consistency)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL })
      }

      await refreshUserProfile() // Refresh context state
      setProfileUpdateSuccess("Foto de perfil actualizada exitosamente.")
      setProfileImageFile(null) // Clear file input
    } catch (err) {
      console.error("Error uploading profile image:", err)
      setProfileUpdateError("Error al subir la foto de perfil. Inténtalo de nuevo.")
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const handleRemoveProfileImage = async () => {
    if (!currentUser || !currentUser.photoPath) {
      setProfileUpdateError("No hay foto de perfil para eliminar.")
      return
    }

    if (!window.confirm("¿Estás seguro de que quieres eliminar tu foto de perfil?")) {
      return
    }

    setUploadingProfileImage(true) // Use this for loading state during deletion too
    setProfileUpdateError(null)
    setProfileUpdateSuccess(null)

    try {
      const imageRef = ref(storage, currentUser.photoPath)
      await deleteObject(imageRef)

      // Update Firestore user document
      const userDocRef = doc(db, "users", currentUser.uid)
      await updateDoc(userDocRef, {
        photoURL: null,
        photoPath: null,
      })

      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: null })
      }

      await refreshUserProfile() // Refresh context state
      setProfileImagePreviewUrl(null) // Clear preview
      setProfileUpdateSuccess("Foto de perfil eliminada exitosamente.")
    } catch (err) {
      console.error("Error removing profile image:", err)
      setProfileUpdateError("Error al eliminar la foto de perfil. Inténtalo de nuevo.")
    } finally {
      setUploadingProfileImage(false)
    }
  }
  // --- End Profile Image Functions ---

  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr] bg-gray-100">
      {/* Sidebar */}
      <div className="hidden border-r bg-white lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-blue-600">
              <User className="h-6 w-6" />
              <span>Panel Comprador</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              <Button
                variant={activeTab === "dashboard" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                onClick={() => setActiveTab("dashboard")}
              >
                <Home className="h-4 w-4" />
                Resumen
              </Button>
              <Button
                variant={activeTab === "orders" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                onClick={() => setActiveTab("orders")}
              >
                <ShoppingBag className="h-4 w-4" />
                Mis Compras
              </Button>
              <Button
                variant={activeTab === "favorites" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                onClick={() => setActiveTab("favorites")}
              >
                <Heart className="h-4 w-4" />
                Favoritos
              </Button>
              <Button
                variant={activeTab === "chats" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                onClick={() => setActiveTab("chats")}
              >
                <MessageSquare className="h-4 w-4" />
                Mis Chats
              </Button>
              <Button
                variant={activeTab === "profile" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                onClick={() => setActiveTab("profile")}
              >
                <Settings className="h-4 w-4" />
                Mi Perfil
              </Button>
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Header for mobile sidebar */}
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-white px-6 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="lg:hidden w-72">
              <div className="flex h-[60px] items-center border-b px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold text-blue-600">
                  <User className="h-6 w-6" />
                  <span>Panel Comprador</span>
                </Link>
              </div>
              <nav className="grid gap-2 p-4 text-base font-medium">
                <Button
                  variant={activeTab === "dashboard" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("dashboard")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Resumen
                </Button>
                <Button
                  variant={activeTab === "orders" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("orders")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Mis Compras
                </Button>
                <Button
                  variant={activeTab === "favorites" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("favorites")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                >
                  <Heart className="mr-2 h-5 w-5" />
                  Favoritos
                </Button>
                <Button
                  variant={activeTab === "chats" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("chats")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Mis Chats
                </Button>
                <Button
                  variant={activeTab === "profile" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("profile")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-600 justify-start"
                >
                  <Settings className="mr-2 h-5 w-5" />
                  Mi Perfil
                </Button>
              </nav>
              <div className="mt-auto p-4">
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-lg md:text-2xl text-gray-800 flex-1 text-center lg:text-left">
            Bienvenido a tu Panel, {currentUser?.displayName || "Comprador"}
          </h1>
        </header>

        {/* Main Area with Tabs */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert
              variant="default"
              className="mb-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700"
            >
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Éxito</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {activeTab === "dashboard" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Compras Totales</CardTitle>
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orders.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Productos Favoritos</CardTitle>
                  <Heart className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{favorites.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">En Camino</CardTitle>
                  <Package className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.filter((order) => order.status === "shipped").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Entregados</CardTitle>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.filter((order) => order.status === "delivered").length}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "dashboard" && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Tus últimas compras y actividades</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-lg text-muted-foreground mb-6">Aún no has realizado compras.</p>
                    <Button asChild>
                      <Link href="/">Explorar productos</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {orders.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="rounded-full bg-gray-100 p-2">
                              <ShoppingBag className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Pedido #{order.id}</p>
                              <p className="text-xs text-muted-foreground">{order.createdAt.toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                order.status,
                              )}`}
                            >
                              {getStatusText(order.status)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-10">
                          <p className="text-sm">
                            {order.products.length} producto{order.products.length > 1 ? "s" : ""} - Total: $
                            {order.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {orders.length > 3 && (
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab("orders")}>
                        Ver todas mis compras
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "orders" && (
            <Card>
              <CardHeader>
                <CardTitle>Mis Compras</CardTitle>
                <CardDescription>Historial de tus pedidos y su estado</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-lg text-muted-foreground mb-6">Aún no has realizado compras.</p>
                    <Button asChild>
                      <Link href="/">Explorar productos</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orders.map((order) => (
                      <Card key={order.id} className="overflow-hidden">
                        <CardHeader className="bg-gray-50 py-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                Pedido #{order.id} -{" "}
                                <span className="text-muted-foreground">{order.createdAt.toLocaleDateString()}</span>
                              </p>
                            </div>
                            <div className="mt-2 sm:mt-0">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                  order.status,
                                )}`}
                              >
                                {getStatusText(order.status)}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {order.products.map((product) => (
                              <div key={product.id} className="flex items-center space-x-4">
                                <div className="h-12 w-12 relative flex-shrink-0">
                                  <Image
                                    src={product.imageUrl || "/placeholder.svg"}
                                    alt={product.name}
                                    layout="fill"
                                    objectFit="cover"
                                    className="rounded-md"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Cantidad: {product.quantity} x ${product.price.toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-sm font-medium">
                                  ${(product.price * product.quantity).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center space-x-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{order.address}</span>
                            </div>
                            <div className="mt-2 sm:mt-0 text-right">
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="text-base font-medium">${order.total.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "favorites" && (
            <Card>
              <CardHeader>
                <CardTitle>Mis Favoritos</CardTitle>
                <CardDescription>Productos que has guardado para más tarde</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-lg text-muted-foreground mb-6">No tienes productos favoritos.</p>
                    <Button asChild>
                      <Link href="/">Explorar productos</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {favorites.map((product) => (
                      <Card key={product.id} className="overflow-hidden">
                        <div className="aspect-square relative">
                          <Image
                            src={product.imageUrl || "/placeholder.svg"}
                            alt={product.name}
                            layout="fill"
                            objectFit="cover"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 rounded-full"
                            onClick={() => handleRemoveFavorite(product.id)}
                          >
                            <Heart className="h-5 w-5 fill-current" />
                          </Button>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium truncate">{product.name}</h3>
                          <p className="text-lg font-bold mt-1">${product.price.toFixed(2)}</p>
                          <div className="mt-3 flex justify-between">
                            <Button variant="outline" size="sm" className="w-[48%]" asChild>
                              <Link href={`/product/${product.productId}`}>Ver Detalles</Link>
                            </Button>
                            <Button size="sm" className="w-[48%]">
                              Comprar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "chats" && (
            <Card>
              <CardHeader>
                <CardTitle>Mis Chats</CardTitle>
                <CardDescription>Conversaciones con vendedores.</CardDescription>
              </CardHeader>
              <CardContent>{currentUser && <ChatList userId={currentUser.uid} role="buyer" />}</CardContent>
            </Card>
          )}

          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Mi Perfil</CardTitle>
                <CardDescription>Gestiona tu información personal y preferencias</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="personal">Datos Personales</TabsTrigger>
                    <TabsTrigger value="addresses">Direcciones</TabsTrigger>
                    <TabsTrigger value="payment">Métodos de Pago</TabsTrigger>
                  </TabsList>
                  <TabsContent value="personal" className="mt-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <h3 className="text-lg font-medium">Información de Cuenta</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Nombre</p>
                            <p className="font-medium">{currentUser?.displayName || "No especificado"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{currentUser?.email}</p>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      {/* Profile Picture Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Foto de Perfil</h3>
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                            {profileImagePreviewUrl ? (
                              <Image
                                src={profileImagePreviewUrl || "/placeholder.svg"}
                                alt="Foto de perfil"
                                layout="fill"
                                objectFit="cover"
                              />
                            ) : (
                              <User className="h-16 w-16 text-gray-400" />
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm items-center">
                            <Input
                              id="profileImage"
                              type="file"
                              accept="image/*"
                              onChange={handleProfileImageChange}
                              className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100 cursor-pointer"
                            />
                            {profileImageFile && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setProfileImageFile(null)
                                  setProfileImagePreviewUrl(currentUser?.photoURL || null)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="mr-1 h-4 w-4" /> Cancelar
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleUploadProfileImage}
                              disabled={!profileImageFile || uploadingProfileImage}
                            >
                              {uploadingProfileImage ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...
                                </>
                              ) : (
                                "Subir Foto"
                              )}
                            </Button>
                            {currentUser?.photoURL && (
                              <Button
                                variant="destructive"
                                onClick={handleRemoveProfileImage}
                                disabled={uploadingProfileImage}
                              >
                                Eliminar Foto
                              </Button>
                            )}
                          </div>
                          {profileUpdateError && (
                            <Alert variant="destructive" className="mt-2 w-full max-w-sm">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{profileUpdateError}</AlertDescription>
                            </Alert>
                          )}
                          {profileUpdateSuccess && (
                            <Alert
                              variant="default"
                              className="mt-2 w-full max-w-sm bg-green-50 border-green-300 text-green-700"
                            >
                              <AlertCircle className="h-4 w-4 text-green-600" />
                              <AlertTitle>Éxito</AlertTitle>
                              <AlertDescription>{profileUpdateSuccess}</AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-end">
                        <Button>Editar Perfil</Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="addresses" className="mt-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <h3 className="text-lg font-medium">Mis Direcciones</h3>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">Casa</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Calle Principal 123, Colonia Centro
                                  <br />
                                  Ciudad de México, 06000
                                  <br />
                                  México
                                </p>
                              </div>
                              <div className="space-x-2">
                                <Button variant="outline" size="sm">
                                  Editar
                                </Button>
                                <Button variant="ghost" size="sm">
                                  Eliminar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="flex justify-end">
                        <Button>Añadir Nueva Dirección</Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="payment" className="mt-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <h3 className="text-lg font-medium">Métodos de Pago</h3>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-4">
                                <CreditCard className="h-8 w-8 text-blue-600" />
                                <div>
                                  <p className="font-medium">Visa terminada en 1234</p>
                                  <p className="text-sm text-muted-foreground">Expira: 12/2025</p>
                                </div>
                              </div>
                              <div className="space-x-2">
                                <Button variant="outline" size="sm">
                                  Editar
                                </Button>
                                <Button variant="ghost" size="sm">
                                  Eliminar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="flex justify-end">
                        <Button>Añadir Método de Pago</Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
