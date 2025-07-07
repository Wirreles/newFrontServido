"use client"

import Link from "next/link"
import {
  Home,
  ShoppingBag,
  PlusCircle,
  Edit,
  Trash2,
  XCircle,
  BarChart3,
  LogOut,
  ListFilter,
  Store,
  ImageIcon as ImageIconLucide,
  MessageSquare,
  UserIcon,
  Video,
  AlertTriangle,
  CheckCircle,
  Tag,
  LineChart,
  User,
  Clock,
  Package,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { useState, useEffect, type FormEvent, type ChangeEvent, type DragEvent } from "react"
import { db, storage, auth } from "@/lib/firebase"
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  getDoc,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ChatList } from "@/components/chat-list"
import { hasWhiteBackground, isValidVideoFile, getVideoDuration } from "@/lib/image-validation"
import { ConnectMercadoPagoButton } from "@/components/ui/connect-mercadopago-button"
import { useToast } from "@/components/ui/use-toast"
import { ApiService } from "@/lib/services/api"
import type { 
  PurchaseWithShipping, 
  ShippingStatus, 
  ShippingUpdateRequest,
  SHIPPING_STATUS_LABELS, 
  SHIPPING_STATUS_COLORS 
} from "@/types/shipping"
import { getSellerShipments, updateShippingStatus, initializeShipping } from "@/lib/shipping"
// Los iconos ya están importados arriba

interface UserProfile {
  uid: string
  displayName?: string | null
  email?: string | null
  role?: "user" | "seller" | "admin"
  isSubscribed?: boolean | null // Permitir que sea null o undefined
  productUploadLimit?: number
  photoURL?: string
  photoPath?: string
}

interface ProductMedia {
  type: "image" | "video"
  url: string
  path: string
  thumbnail?: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  media: ProductMedia[]
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
  couponId?: string | null
  couponStartDate?: any | null
  couponEndDate?: any | null
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface ConnectionStatus {
  isConnected: boolean
  lastChecked: string
}

interface Coupon {
  id: string
  code: string
  name: string
  description?: string | null
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchase?: number | null
  maxDiscount?: number | null
  usageLimit?: number | null
  applicableTo: "all" | "sellers" | "buyers"
  startDate?: any | null
  endDate?: any | null
  isActive: boolean
  createdAt: any
}

// Función utilitaria para limpiar campos undefined, null vacíos
function cleanUndefinedFields<T extends object>(obj: T): any {
  const cleanObj: any = { ...obj }
  Object.keys(cleanObj).forEach((key) => {
    const value = cleanObj[key]
    // Eliminar campos undefined, null, o strings vacíos
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      delete cleanObj[key]
    }
  })
  return cleanObj
}

export default function SellerDashboardPage() {
  const { currentUser, authLoading, handleLogout, refreshUserProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("dashboard")
  const [myProducts, setMyProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])

  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Product Form State
  const [isEditing, setIsEditing] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productCategory, setProductCategory] = useState("")
  const [productBrand, setProductBrand] = useState("")

  // Media Upload State (for products)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([])
  const [currentProductMedia, setCurrentProductMedia] = useState<ProductMedia[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [validatingImages, setValidatingImages] = useState(false)
  const [mediaValidationErrors, setMediaValidationErrors] = useState<string[]>([])

  const [submittingProduct, setSubmittingProduct] = useState(false)

  const [productIsService, setProductIsService] = useState(false)
  const [productStock, setProductStock] = useState("")

  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Profile picture states
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<string | null>(null)
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false)

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Shipping management state
  const [shipments, setShipments] = useState<PurchaseWithShipping[]>([])
  const [loadingShipments, setLoadingShipments] = useState(false)
  const [shippingFilter, setShippingFilter] = useState<ShippingStatus | "all">("all")
  const [updatingShipment, setUpdatingShipment] = useState<string | null>(null)
  
  // Shipping update modal state
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false)
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
  const [selectedNewStatus, setSelectedNewStatus] = useState<ShippingStatus | null>(null)
  const [trackingNumber, setTrackingNumber] = useState("")
  const [carrierName, setCarrierName] = useState("")
  const [shippingNotes, setShippingNotes] = useState("")

  // 1. Añadir estado para la pestaña activa de añadir: producto o servicio
  const [activeAddTab, setActiveAddTab] = useState<'product' | 'service'>('product')

  // 1. Añadir estado para controlar el loading de suscripción
  const [subscribing, setSubscribing] = useState(false)

  // Estado para gestión de cupones
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [couponApplyStartDate, setCouponApplyStartDate] = useState<Date | undefined>(undefined)
  const [couponApplyEndDate, setCouponApplyEndDate] = useState<Date | undefined>(undefined)
  const [associatingCoupon, setAssociatingCoupon] = useState(false)
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)

  // Estados para validación visual de formularios
  const [productFormErrors, setProductFormErrors] = useState<{[key:string]:string}>({})
  const [serviceFormErrors, setServiceFormErrors] = useState<{[key:string]:string}>({})
  const [productFormTouched, setProductFormTouched] = useState(false)
  const [serviceFormTouched, setServiceFormTouched] = useState(false)

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Function to close mobile menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Shipping management functions
  const fetchShipments = async () => {
    if (!currentUser) return
    
    setLoadingShipments(true)
    try {
      const shipmentsData = await getSellerShipments(currentUser.firebaseUser.uid)
      setShipments(shipmentsData)
      
      // Inicializar envíos para compras aprobadas que no tengan información de envío
      const shipmentsToInitialize = shipmentsData.filter(
        shipment => shipment.status === "approved" && 
                   !shipment.productIsService && 
                   !shipment.shipping
      )
      
      if (shipmentsToInitialize.length > 0) {
        console.log(`Inicializando ${shipmentsToInitialize.length} envíos...`)
        for (const shipment of shipmentsToInitialize) {
          try {
            await initializeShipping(shipment.id, currentUser.firebaseUser.uid)
          } catch (error) {
            console.error(`Error inicializando envío ${shipment.id}:`, error)
          }
        }
        // Recargar datos después de inicializar
        const updatedShipments = await getSellerShipments(currentUser.firebaseUser.uid)
        setShipments(updatedShipments)
      }
    } catch (error) {
      console.error("Error fetching shipments:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los envíos",
        variant: "destructive",
      })
    } finally {
      setLoadingShipments(false)
    }
  }

  const handleUpdateShippingStatus = async (
    purchaseId: string, 
    newStatus: ShippingStatus,
    trackingNumber?: string,
    carrierName?: string,
    notes?: string
  ) => {
    if (!currentUser) return

    setUpdatingShipment(purchaseId)
    try {
      const result = await updateShippingStatus(
        purchaseId,
        {
          status: newStatus,
          trackingNumber,
          carrierName,
          notes
        },
        currentUser.firebaseUser.uid
      )

      if (result.success) {
        // Mensaje de éxito personalizado según el estado
        const statusMessages = {
          pending: "Estado cambiado a pendiente",
          preparing: "Producto en preparación",
          shipped: "Producto enviado",
          delivered: "Producto entregado",
          cancelled: "Envío cancelado"
        }
        
        toast({
          title: "Envío actualizado",
          description: statusMessages[newStatus] || "Estado de envío actualizado correctamente",
        })
        
        // Mostrar información adicional si se agregó tracking
        if (trackingNumber && newStatus === "shipped") {
          toast({
            title: "Número de seguimiento",
            description: `Tracking: ${trackingNumber}${carrierName ? ` - ${carrierName}` : ''}`,
          })
        }
        
        await fetchShipments() // Recargar datos
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar el estado de envío",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating shipping status:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el estado de envío",
        variant: "destructive",
      })
    } finally {
      setUpdatingShipment(null)
    }
  }

  const getShippingIcon = (status: ShippingStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "preparing":
        return <Package className="h-4 w-4" />
      case "shipped":
        return <Truck className="h-4 w-4" />
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getShippingBadgeClass = (status: ShippingStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "preparing":
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

  const getShippingStatusText = (status: ShippingStatus) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "preparing":
        return "En preparación"
      case "shipped":
        return "Enviado"
      case "delivered":
        return "Entregado"
      case "cancelled":
        return "Cancelado"
      default:
        return "Desconocido"
    }
  }

  const getFilteredShipments = () => {
    if (shippingFilter === "all") {
      return shipments
    }
    return shipments.filter(shipment => shipment.shipping?.status === shippingFilter)
  }

  // Abrir modal de actualización de envío
  const openShippingUpdateModal = (shipmentId: string, newStatus: ShippingStatus) => {
    const shipment = shipments.find(s => s.id === shipmentId)
    setSelectedShipmentId(shipmentId)
    setSelectedNewStatus(newStatus)
    
    // Pre-llenar con datos existentes si los hay
    if (shipment?.shipping) {
      setTrackingNumber(shipment.shipping.trackingNumber || "")
      setCarrierName(shipment.shipping.carrierName || "")
      setShippingNotes(shipment.shipping.notes || "")
    } else {
      setTrackingNumber("")
      setCarrierName("")
      setShippingNotes("")
    }
    
    setIsShippingModalOpen(true)
  }

  // Cerrar modal y limpiar estado
  const closeShippingUpdateModal = () => {
    setIsShippingModalOpen(false)
    setSelectedShipmentId(null)
    setSelectedNewStatus(null)
    setTrackingNumber("")
    setCarrierName("")
    setShippingNotes("")
  }

  // Confirmar actualización de envío con datos del modal
  const confirmShippingUpdate = async () => {
    if (!selectedShipmentId || !selectedNewStatus) return

    await handleUpdateShippingStatus(
      selectedShipmentId,
      selectedNewStatus,
      trackingNumber || undefined,
      carrierName || undefined,
      shippingNotes || undefined
    )

    closeShippingUpdateModal()
  }

  useEffect(() => {
    if (currentUser) {
      setProfileImagePreviewUrl(currentUser.firebaseUser.photoURL || null)
    }
  }, [currentUser])

  useEffect(() => {
    if (authLoading) {
      // Todavía cargando el usuario, no hacer nada
      return;
    }
    if (!currentUser) {
      // Si no hay usuario, no intentes chequear conexión
      setConnectionStatus(null);
      setIsLoading(false);
      return;
    }
  
    const checkConnectionStatus = async () => {
      try {
        const response = await ApiService.getConnectionStatus(currentUser.firebaseUser.uid)
        if (response.error) {
          throw new Error(response.error)
        }
        if (response.data) {
          setConnectionStatus({
            isConnected: response.data.isConnected,
            lastChecked: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error("Error al verificar el estado de conexión:", error)
        toast({
          title: "Error",
          description: "No se pudo verificar el estado de conexión con MercadoPago",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
  
    checkConnectionStatus()
  }, [authLoading, currentUser, toast])

  // Fetch coupons on component mount
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const q = query(collection(db, "coupons"), where("isActive", "==", true))
        const querySnapshot = await getDocs(q)
        const couponsData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            code: data.code,
            name: data.name,
            description: data.description || null,
            discountType: data.discountType,
            discountValue: data.discountValue,
            minPurchase: data.minPurchase || null,
            maxDiscount: data.maxDiscount || null,
            usageLimit: data.usageLimit || null,
            applicableTo: data.applicableTo,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            isActive: data.isActive === false ? false : true, // Ensure isActive is boolean
            createdAt: data.createdAt,
          } as Coupon
        })
        setAvailableCoupons(couponsData.filter(c => c.applicableTo === "all" || c.applicableTo === "sellers"))
      } catch (error) {
        console.error("Error fetching coupons:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los cupones.",
          variant: "destructive",
        })
      }
    }
    fetchCoupons()
  }, [toast])

  // 2. Refrescar el perfil del usuario al entrar a la pestaña de añadir servicio
  useEffect(() => {
    if (activeTab === 'addService' && refreshUserProfile) {
      refreshUserProfile();
    }
  }, [activeTab, refreshUserProfile]);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("mp_connecting")) {
      refreshUserProfile().then(() => {
        localStorage.removeItem("mp_connecting");
      });
    }
  }, [refreshUserProfile]);

  // Fetch shipments when shipping tab is active
  useEffect(() => {
    if (activeTab === "shipping" && currentUser) {
      fetchShipments()
    }
  }, [activeTab, currentUser])

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files)
      handleMediaFiles(files)
    }
  }

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
      return
    }
    if (currentUser?.role !== "seller") {
      router.push(currentUser?.role === "admin" ? "/admin" : "/?error=not_seller")
      return
    }

    if (currentUser) {
      fetchSellerData(currentUser.firebaseUser.uid)
      fetchCategoriesAndBrands()
    }
  }, [currentUser, authLoading, router])

  const fetchSellerData = async (sellerUid: string) => {
    setLoadingData(true)
    setError(null)
    try {
      const productsQuery = query(
        collection(db, "products"),
        where("sellerId", "==", sellerUid),
        orderBy("createdAt", "desc"),
      )
      const productSnapshot = await getDocs(productsQuery)
      const products = productSnapshot.docs.map((doc) => {
        const data = doc.data()
        // Handle backward compatibility - convert old imageUrl to media array
        if (data.imageUrl && !data.media) {
          data.media = [
            {
              type: "image",
              url: data.imageUrl,
              path: data.imagePath || "",
            },
          ]
        }
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          brand: data.brand || undefined,
          media: data.media || [],
          isService: data.isService || false,
          stock: data.stock || undefined,
          sellerId: data.sellerId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || undefined,
          couponId: data.couponId || null,
          couponStartDate: data.couponStartDate || null,
          couponEndDate: data.couponEndDate || null,
        } as Product
      })
      setMyProducts(products)
    } catch (err) {
      console.error("Error fetching seller products:", err)
      setError("Error al cargar tus productos.")
    } finally {
      setLoadingData(false)
    }
  }

  const handleAssociateCouponClick = (couponId: string) => {
    setSelectedCouponId(couponId)
    setSelectedProductIds([]) // Clear previous selections
    setCouponApplyStartDate(undefined)
    setCouponApplyEndDate(undefined)
    setIsCouponModalOpen(true)
  }

  const handleProductSelection = (productId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedProductIds(prev => [...prev, productId])
    } else {
      setSelectedProductIds(prev => prev.filter(id => id !== productId))
    }
  }

  const associateCouponToProducts = async () => {
    if (!selectedCouponId || selectedProductIds.length === 0 || !currentUser) {
      toast({
        title: "Error",
        description: "Selecciona un cupón, al menos un producto y asegura tu sesión.",
        variant: "destructive",
      })
      return
    }

    if (!couponApplyStartDate || !couponApplyEndDate) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un rango de fechas de validez para el cupón.",
        variant: "destructive",
      })
      return
    }

    if (couponApplyStartDate > couponApplyEndDate) {
      toast({
        title: "Error",
        description: "La fecha de inicio no puede ser posterior a la fecha de fin.",
        variant: "destructive",
      })
      return
    }

    setAssociatingCoupon(true)
    try {
      for (const productId of selectedProductIds) {
        const productRef = doc(db, "products", productId)
        const couponData = cleanUndefinedFields({
          couponId: selectedCouponId,
          couponStartDate: couponApplyStartDate,
          couponEndDate: couponApplyEndDate,
          updatedAt: serverTimestamp(),
        })
        await updateDoc(productRef, couponData)
      }

      await fetchSellerData(currentUser.firebaseUser.uid) // Refresh product list
      setIsCouponModalOpen(false)
      toast({
        title: "Éxito",
        description: `Cupón asociado a ${selectedProductIds.length} producto(s) correctamente.`,
      })
    } catch (error) {
      console.error("Error associating coupon to products:", error)
      toast({
        title: "Error",
        description: "No se pudo asociar el cupón a los productos.",
        variant: "destructive",
      })
    } finally {
      setAssociatingCoupon(false)
    }
  }

  const removeCouponFromProduct = async (productId: string) => {
    if (!currentUser) return

    try {
      const productRef = doc(db, "products", productId)
      const couponRemovalData = cleanUndefinedFields({
        couponId: null,
        couponStartDate: null,
        couponEndDate: null,
        updatedAt: serverTimestamp(),
      })
      await updateDoc(productRef, couponRemovalData)

      await fetchSellerData(currentUser.firebaseUser.uid) // Refresh product list
      toast({
        title: "Éxito",
        description: "Cupón eliminado del producto correctamente.",
      })
    } catch (error) {
      console.error("Error removing coupon from product:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cupón del producto.",
        variant: "destructive",
      })
    }
  }

  const fetchCategoriesAndBrands = async () => {
    try {
      const categoriesSnapshot = await getDocs(collection(db, "categories"))
      const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]
      setCategories(categoriesData)

      const brandsSnapshot = await getDocs(collection(db, "brands"))
      const brandsData = brandsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Brand[]
      setBrands(brandsData)
    } catch (error) {
      console.error("Error fetching categories and brands:", error)
      setError("Error al cargar categorías y marcas.")
    }
  }

  const handleMediaFiles = async (files: File[]) => {
    setValidatingImages(true)
    setMediaValidationErrors([])
    const validFiles: File[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (file.type.startsWith("image/")) {
        // Validate image has white background
        try {
          const hasWhiteBg = await hasWhiteBackground(file)
          if (!hasWhiteBg) {
            errors.push(`${file.name}: La imagen debe tener fondo blanco`)
            continue
          }
        } catch (err) {
          errors.push(`${file.name}: Error al validar la imagen`)
          continue
        }
      } else if (file.type.startsWith("video/")) {
        // Validate video file
        if (!isValidVideoFile(file)) {
          errors.push(`${file.name}: Formato de video no válido o archivo muy grande (máx. 50MB)`)
          continue
        }

        try {
          const duration = await getVideoDuration(file)
          if (duration > 60) {
            // 60 seconds max
            errors.push(`${file.name}: El video no puede durar más de 60 segundos`)
            continue
          }
        } catch (err) {
          errors.push(`${file.name}: Error al procesar el video`)
          continue
        }
      } else {
        errors.push(`${file.name}: Solo se permiten imágenes y videos`)
        continue
      }

      validFiles.push(file)
    }

    setMediaValidationErrors(errors)

    if (validFiles.length > 0) {
      const newMediaFiles = [...mediaFiles, ...validFiles]
      const newPreviewUrls = [...mediaPreviewUrls, ...validFiles.map((file) => URL.createObjectURL(file))]

      setMediaFiles(newMediaFiles)
      setMediaPreviewUrls(newPreviewUrls)
      setCurrentProductMedia([]) // Clear current media when adding new files
    }

    setValidatingImages(false)
  }

  const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleMediaFiles(files)
    }
  }

  const uploadMediaToStorage = async (file: File): Promise<ProductMedia> => {
    if (!currentUser) throw new Error("Usuario no autenticado.")
    setUploadingMedia(true)

    const isVideo = file.type.startsWith("video/")
    const filePath = `products/${currentUser.firebaseUser.uid}/${Date.now()}-${file.name}`
    const storageRef = ref(storage, filePath)

    try {
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)

      let thumbnail: string | undefined

      if (isVideo) {
        // Generate thumbnail for video
        thumbnail = await generateVideoThumbnail(file)
      }

      const result = {
        type: isVideo ? "video" : "image",
        url: downloadURL,
        path: filePath,
        thumbnail,
      }
      
      // Verificar si hay campos undefined y eliminarlos
      const undefinedFields = Object.keys(result).filter(key => result[key as keyof typeof result] === undefined)
      if (undefinedFields.length > 0) {
        // Eliminar campos undefined
        undefinedFields.forEach(field => delete result[field as keyof typeof result])
      }

      return result as ProductMedia
    } catch (error) {
      console.error("Error uploading media: ", error)
      throw new Error("Error al subir el archivo.")
    } finally {
      setUploadingMedia(false)
    }
  }

  const generateVideoThumbnail = (videoFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      video.addEventListener("loadedmetadata", () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        video.currentTime = 1 // Capture frame at 1 second
      })

      video.addEventListener("seeked", () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8)
          resolve(thumbnailDataUrl)
        } else {
          reject(new Error("Could not get canvas context"))
        }
      })

      video.addEventListener("error", () => {
        reject(new Error("Error loading video"))
      })

      video.src = URL.createObjectURL(videoFile)
    })
  }

  const deleteMediaFromStorage = async (filePath: string) => {
    if (!filePath) return
    const mediaRef = ref(storage, filePath)
    try {
      await deleteObject(mediaRef)
      console.log("Previous media deleted from storage:", filePath)
    } catch (error) {
      console.error("Error deleting previous media from storage:", error)
    }
  }

  const resetForm = () => {
    setIsEditing(false)
    setEditingProductId(null)
    setProductName("")
    setProductDescription("")
    setProductPrice("")
    setProductCategory("")
    setProductBrand("")
    setMediaFiles([])
    setMediaPreviewUrls([])
    setCurrentProductMedia([])
    setProductIsService(false)
    setProductStock("")
    setError(null)
    setSuccessMessage(null)
    setMediaValidationErrors([])
  }

  const handleRemoveMedia = (index: number) => {
    const newMediaFiles = mediaFiles.filter((_, i) => i !== index)
    const newPreviewUrls = mediaPreviewUrls.filter((_, i) => i !== index)
    setMediaFiles(newMediaFiles)
    setMediaPreviewUrls(newPreviewUrls)
  }

  const handleRemoveCurrentMedia = (index: number) => {
    const newCurrentMedia = currentProductMedia.filter((_, i) => i !== index)
    setCurrentProductMedia(newCurrentMedia)
  }

  const handleEditProduct = (product: Product) => {
    resetForm()
    setIsEditing(true)
    setEditingProductId(product.id)
    setProductName(product.name)
    setProductDescription(product.description)
    setProductPrice(product.price.toString())
    setProductCategory(product.category)
    setProductBrand(product.brand || "")
    setCurrentProductMedia(product.media || [])
    setProductIsService(product.isService)
    setProductStock(product.stock?.toString() || "")
    setActiveTab("addProduct")
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.")) {
      return
    }
    try {
      const productToDelete = myProducts.find((p) => p.id === productId)
      if (productToDelete?.media) {
        for (const media of productToDelete.media) {
          await deleteMediaFromStorage(media.path)
        }
      }
      await deleteDoc(doc(db, "products", productId))
      setMyProducts((prevProducts) => prevProducts.filter((p) => p.id !== productId))
      setSuccessMessage("Producto eliminado exitosamente.")
    } catch (err) {
      console.error("Error deleting product:", err)
      setError("Error al eliminar el producto.")
    }
  }

  // Nueva función de validación para productos
  const validateProductForm = () => {
    const errors: {[key:string]:string} = {}
    if (!productName.trim()) errors.name = "El nombre es obligatorio"
    if (!productDescription.trim()) errors.description = "La descripción es obligatoria"
    if (!productPrice || isNaN(Number(productPrice)) || Number(productPrice) <= 0) errors.price = "El precio es obligatorio y debe ser mayor a 0"
    if (!productCategory) errors.category = "La categoría es obligatoria"
    if (!productIsService && (!productStock || isNaN(Number(productStock)) || Number(productStock) < 0)) errors.stock = "El stock es obligatorio y debe ser 0 o mayor"
    if (mediaFiles.length === 0 && currentProductMedia.length === 0) errors.media = "Debes subir al menos una imagen o video"
    return errors
  }

  // Modificar handleSubmitProduct para usar validación visual
  const handleSubmitProduct = async (e: FormEvent) => {
    e.preventDefault()
    setProductFormTouched(true)
    const errors = validateProductForm()
    setProductFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError("Por favor, corrige los errores antes de continuar.")
      return
    }

    if (!productName || !productPrice || !productCategory || !currentUser) {
      setError("Nombre, precio y categoría son obligatorios.")
      return
    }

    if (mediaFiles.length === 0 && currentProductMedia.length === 0) {
      setError("Debes subir al menos una imagen o video del producto.")
      return
    }

    setSubmittingProduct(true)
    setError(null)
    setSuccessMessage(null)

    let newMedia: ProductMedia[] = [...currentProductMedia]

    try {
      // Upload new media files
      if (mediaFiles.length > 0) {
        // Delete old media if editing
        if (isEditing && currentProductMedia.length > 0) {
          for (const media of currentProductMedia) {
            await deleteMediaFromStorage(media.path)
          }
          newMedia = []
        }

        // Upload new media
        for (const file of mediaFiles) {
          const uploadedMedia = await uploadMediaToStorage(file)
          newMedia.push(uploadedMedia)
        }
      }

      const productData: any = {
        name: productName,
        description: productDescription,
        price: Number.parseFloat(productPrice),
        category: productCategory,
        media: newMedia,
        isService: productIsService,
        sellerId: currentUser.firebaseUser.uid,
        updatedAt: serverTimestamp(),
      }

      // Solo agregar brand si tiene valor
      if (productBrand && productBrand.trim()) {
        productData.brand = productBrand
      }

      // Solo agregar stock si no es servicio y tiene valor
      if (!productIsService && productStock && productStock.trim()) {
        productData.stock = Number.parseInt(productStock)
      }

      if (isEditing && editingProductId) {
        const productRef = doc(db, "products", editingProductId)
        await updateDoc(productRef, productData)
        setMyProducts((prevProducts) =>
          prevProducts.map((p) => (p.id === editingProductId ? { ...p, ...productData, updatedAt: new Date() } : p)),
        )
        setSuccessMessage("Producto actualizado exitosamente.")
      } else {
        const productDataWithTimestamp = { ...productData, createdAt: serverTimestamp() }
        const docRef = await addDoc(collection(db, "products"), productDataWithTimestamp)
        setMyProducts((prevProducts) => [
          { id: docRef.id, ...productDataWithTimestamp, createdAt: new Date(), updatedAt: new Date() } as Product,
          ...prevProducts,
        ])
        setSuccessMessage("Producto añadido exitosamente.")
      }
      resetForm()
      setActiveTab("products")
    } catch (err) {
      console.error("Error submitting product:", err)
      setError(
        `Error al ${isEditing ? "actualizar" : "añadir"} el producto. ${err instanceof Error ? err.message : ""}`,
      )
    } finally {
      setSubmittingProduct(false)
    }
  }

  // Profile picture functions (keeping existing code)
  const handleProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfileImageFile(file)
      setProfileImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const uploadProfileImageToStorage = async (file: File): Promise<{ downloadURL: string; filePath: string }> => {
    if (!currentUser) throw new Error("Usuario no autenticado.")
    setUploadingProfileImage(true)
    const filePath = `users/${currentUser.firebaseUser.uid}/profile/${Date.now()}-${file.name}`
    const storageRef = ref(storage, filePath)
    try {
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      return { downloadURL, filePath }
    } catch (error) {
      console.error("Error uploading profile image: ", error)
      throw new Error("Error al subir la imagen de perfil.")
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const deleteProfileImageFromStorage = async (filePath: string) => {
    if (!filePath) return
    const imageRef = ref(storage, filePath)
    try {
      await deleteObject(imageRef)
      console.log("Previous profile image deleted from storage:", filePath)
    } catch (error) {
      console.error("Error deleting previous profile image from storage:", error)
    }
  }

  const handleSaveProfileImage = async () => {
    if (!currentUser || !profileImageFile) {
      setError("Por favor, selecciona una imagen para subir.")
      return
    }

    setUploadingProfileImage(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (currentUser.photoPath) {
        await deleteProfileImageFromStorage(currentUser.photoPath)
      }

      const { downloadURL, filePath } = await uploadProfileImageToStorage(profileImageFile)

      const userRef = doc(db, "users", currentUser.firebaseUser.uid)
      const userData = cleanUndefinedFields({
        photoURL: downloadURL,
        photoPath: filePath,
        updatedAt: serverTimestamp(),
      })
      await updateDoc(userRef, userData)

      await refreshUserProfile()

      setSuccessMessage("Imagen de perfil actualizada exitosamente.")
      setProfileImageFile(null)
    } catch (err) {
      console.error("Error saving profile image:", err)
      setError(`Error al actualizar la imagen de perfil. ${err instanceof Error ? err.message : ""}`)
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const handleRemoveCurrentProfileImage = async () => {
    if (!currentUser) {
      setError("No hay usuario autenticado.")
      return
    }
    if (!currentUser.photoPath) {
      setError("No hay imagen de perfil para eliminar.")
      return
    }

    setUploadingProfileImage(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await deleteProfileImageFromStorage(currentUser.photoPath) // currentUser.photoPath ya está validado como string aquí

      const userRef = doc(db, "users", currentUser.firebaseUser.uid)
      const userData = cleanUndefinedFields({
        photoURL: null,
        photoPath: null,
        updatedAt: serverTimestamp(),
      })
      await updateDoc(userRef, userData)

      await refreshUserProfile()

      setSuccessMessage("Imagen de perfil eliminada exitosamente.")
      setProfileImageFile(null)
      setProfileImagePreviewUrl(null)
    } catch (err) {
      console.error("Error removing profile image:", err)
      setError(`Error al eliminar la imagen de perfil. ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const handleDisconnect = async () => {
    if (!currentUser) return

    try {
      setIsDisconnecting(true)
      const response = await ApiService.disconnectAccount(currentUser.firebaseUser.uid)

      if (response.error) {
        throw new Error(response.error)
      }

      setConnectionStatus({
        isConnected: false,
        lastChecked: new Date().toISOString()
      })
      // Guardar flag para refrescar al volver
      if (typeof window !== "undefined") {
        localStorage.setItem("mp_disconnected", "1");
      }
      await refreshUserProfile();
      toast({
        title: "Éxito",
        description: "Tu cuenta de MercadoPago ha sido desconectada exitosamente"
      })
    } catch (error) {
      console.error("Error al desconectar la cuenta:", error)
      toast({
        title: "Error",
        description: "No se pudo desconectar la cuenta de MercadoPago",
        variant: "destructive"
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  // 3. Función para suscribirse
  const handleSubscribe = async () => {
    console.log("[handleSubscribe] Click en Suscribirse");
    if (!currentUser) {
      console.error("[handleSubscribe] No hay usuario autenticado (contexto)");
      toast({ title: 'Error', description: 'No hay usuario autenticado', variant: 'destructive' });
      return;
    }
    setSubscribing(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendUrl) {
        console.error("[handleSubscribe] No se encontró la URL del backend en las variables de entorno");
        toast({ title: 'Error', description: 'No se encontró la URL del backend', variant: 'destructive' });
        return;
      }
      const user = auth.currentUser;
      if (!user || typeof user.getIdToken !== 'function') {
        console.error("[handleSubscribe] No hay usuario de Firebase Auth o getIdToken no está disponible");
        toast({ title: 'Error', description: 'No hay usuario de Firebase Auth o getIdToken no está disponible', variant: 'destructive' });
        return;
      }
      const token = await user.getIdToken();
      if (!token) {
        console.error("[handleSubscribe] No se pudo obtener el token de autenticación");
        toast({ title: 'Error', description: 'No se pudo obtener el token de autenticación', variant: 'destructive' });
        return;
      }
      console.log("[handleSubscribe] Token obtenido:", token);
      const res = await fetch(`${backendUrl}/api/mercadopago/subscription/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: currentUser.firebaseUser.uid,
          planType: 'BASICO',
        }),
      });
      console.log("[handleSubscribe] Respuesta HTTP status:", res.status);
      const data = await res.json();
      console.log("[handleSubscribe] Respuesta de la API:", data);
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        toast({ title: 'Error', description: data.error || 'No se recibió un punto de inicio de suscripción', variant: 'destructive' });
      }
    } catch (err) {
      console.error("[handleSubscribe] Error en la suscripción:", err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("mp_disconnected")) {
      refreshUserProfile().then(() => {
        localStorage.removeItem("mp_disconnected");
      });
    }
  }, [refreshUserProfile]);

  // Nueva función de validación para servicios
  const validateServiceForm = () => {
    const errors: {[key:string]:string} = {}
    if (!productName.trim()) errors.name = "El nombre es obligatorio"
    if (!productDescription.trim()) errors.description = "La descripción es obligatoria"
    if (!productPrice || isNaN(Number(productPrice)) || Number(productPrice) <= 0) errors.price = "El precio es obligatorio y debe ser mayor a 0"
    if (!productCategory) errors.category = "La categoría es obligatoria"
    if (mediaFiles.length === 0 && currentProductMedia.length === 0) errors.media = "Debes subir al menos una imagen o video"
    return errors
  }

  // Nuevo handleSubmitService para validación visual
  const handleSubmitService = async (e: FormEvent) => {
    e.preventDefault()
    setServiceFormTouched(true)
    const errors = validateServiceForm()
    setServiceFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError("Por favor, corrige los errores antes de continuar.")
      return
    }

    if (!productName || !productPrice || !productCategory || !currentUser) {
      setError("Nombre, precio y categoría son obligatorios.")
      return
    }

    if (mediaFiles.length === 0 && currentProductMedia.length === 0) {
      setError("Debes subir al menos una imagen o video del servicio.")
      return
    }

    setSubmittingProduct(true)
    setError(null)
    setSuccessMessage(null)

    let newMedia: ProductMedia[] = [...currentProductMedia]

    try {
      // Upload new media files
      if (mediaFiles.length > 0) {
        // Delete old media if editing
        if (isEditing && currentProductMedia.length > 0) {
          for (const media of currentProductMedia) {
            await deleteMediaFromStorage(media.path)
          }
          newMedia = []
        }

        // Upload new media
        for (const file of mediaFiles) {
          const uploadedMedia = await uploadMediaToStorage(file)
          newMedia.push(uploadedMedia)
        }
      }

      const serviceData: any = {
        name: productName,
        description: productDescription,
        price: Number.parseFloat(productPrice),
        category: productCategory,
        media: newMedia,
        isService: true, // Siempre true para servicios
        sellerId: currentUser.firebaseUser.uid,
        updatedAt: serverTimestamp(),
      }

      // Solo agregar brand si tiene valor
      if (productBrand && productBrand.trim()) {
        serviceData.brand = productBrand
      }

      if (isEditing && editingProductId) {
        const serviceRef = doc(db, "products", editingProductId)
        await updateDoc(serviceRef, serviceData)
        setMyProducts((prevProducts) =>
          prevProducts.map((p) => (p.id === editingProductId ? { ...p, ...serviceData, updatedAt: new Date() } : p)),
        )
        setSuccessMessage("Servicio actualizado exitosamente.")
      } else {
        const serviceDataWithTimestamp = { ...serviceData, createdAt: serverTimestamp() }
        const docRef = await addDoc(collection(db, "products"), serviceDataWithTimestamp)
        setMyProducts((prevProducts) => [
          { id: docRef.id, ...serviceDataWithTimestamp, createdAt: new Date(), updatedAt: new Date() } as Product,
          ...prevProducts,
        ])
        setSuccessMessage("Servicio añadido exitosamente.")
      }
      resetForm()
      setActiveTab("products")
    } catch (err) {
      console.error("Error submitting service:", err)
      setError(
        `Error al ${isEditing ? "actualizar" : "añadir"} el servicio. ${err instanceof Error ? err.message : ""}`,
      )
    } finally {
      setSubmittingProduct(false)
    }
  }

  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
      </div>
    )
  }

  const totalProductsValue = myProducts.reduce(
    (sum, product) => sum + product.price * (product.stock || (product.isService ? 1 : 0)),
    0,
  )

  // Estadísticas de envíos
  const shippingStats = {
    total: shipments.length,
    pending: shipments.filter(s => s.shipping?.status === "pending").length,
    preparing: shipments.filter(s => s.shipping?.status === "preparing").length,
    shipped: shipments.filter(s => s.shipping?.status === "shipped").length,
    delivered: shipments.filter(s => s.shipping?.status === "delivered").length,
    cancelled: shipments.filter(s => s.shipping?.status === "cancelled").length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] min-h-screen w-full bg-gray-100">
      {/* Sidebar - keeping existing code */}
      <div className="hidden border-r bg-white lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-orange-600">
              <Store className="h-6 w-6" />
              <span>Panel Vendedor</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              <Button
                variant={activeTab === "dashboard" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => setActiveTab("dashboard")}
              >
                <Home className="h-4 w-4" />
                Resumen
              </Button>
              <Button
                variant={activeTab === "products" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => {
                  resetForm()
                  setActiveTab("products")
                }}
              >
                <ShoppingBag className="h-4 w-4" />
                Mis Productos
              </Button>
              <Button
                variant={activeTab === "addProduct" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => {
                  resetForm()
                  setActiveTab("addProduct")
                }}
              >
                <PlusCircle className="h-4 w-4" />
                {isEditing ? "Editar Producto" : "Añadir Producto"}
              </Button>
              <Button
                variant={activeTab === "addService" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => {
                  resetForm()
                  setActiveTab("addService")
                  setActiveAddTab("service")
                }}
              >
                <PlusCircle className="h-4 w-4" />
                Añadir Servicio
              </Button>
              <Button
                variant={activeTab === "shipping" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => setActiveTab("shipping")}
              >
                <Truck className="h-4 w-4" />
                Gestión de Envíos
              </Button>
              <Button
                variant={activeTab === "chats" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => setActiveTab("chats")}
              >
                <MessageSquare className="h-4 w-4" />
                Chats
              </Button>
              <Button
                variant={activeTab === "coupons" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => setActiveTab("coupons")}
              >
                <Tag className="h-4 w-4" />
                Cupones
              </Button>
              <Button
                variant={activeTab === "stats" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => setActiveTab("stats")}
              >
                <LineChart className="h-4 w-4" />
                Estadísticas
              </Button>
              <Button
                variant={activeTab === "profile" ? "secondary" : "ghost"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                onClick={() => setActiveTab("profile")}
              >
                <User className="h-4 w-4" />
                Configuración
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
        {/* Header for mobile sidebar - keeping existing code */}
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-white px-6 lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="lg:hidden w-72">
              <SheetTitle className="sr-only">Menú de navegación del panel vendedor</SheetTitle>
              {/* Mobile navigation - keeping existing code */}
              <div className="flex h-[60px] items-center border-b px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold text-orange-600">
                  <Store className="h-6 w-6" />
                  <span>Panel Vendedor</span>
                </Link>
              </div>
              <nav className="grid gap-2 p-4 text-base font-medium">
                <Button
                  variant={activeTab === "dashboard" ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveTab("dashboard")
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Resumen
                </Button>
                <Button
                  variant={activeTab === "products" ? "secondary" : "ghost"}
                  onClick={() => {
                    resetForm()
                    setActiveTab("products")
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Mis Productos
                </Button>
                <Button
                  variant={activeTab === "addProduct" ? "secondary" : "ghost"}
                  onClick={() => {
                    resetForm()
                    setActiveTab("addProduct")
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  {isEditing ? "Editar" : "Añadir"} Producto
                </Button>
                <Button
                  variant={activeTab === "addService" ? "secondary" : "ghost"}
                  onClick={() => {
                    resetForm()
                    setActiveTab("addService")
                    setActiveAddTab("service")
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Servicio
                </Button>
                <Button
                  variant={activeTab === "shipping" ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveTab("shipping")
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <Truck className="mr-2 h-5 w-5" />
                  Gestión de Envíos
                </Button>
                <Button
                  variant={activeTab === "chats" ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveTab("chats")
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Mis Chats
                </Button>
                <Button
                  variant={activeTab === "stats" ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveTab("stats")
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Estadísticas
                </Button>
                <Button
                  variant={activeTab === "profile" ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveTab("profile")
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <UserIcon className="mr-2 h-5 w-5" />
                  Configuración
                </Button>
              </nav>
              <div className="mt-auto p-4">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    handleLogout()
                    closeMobileMenu()
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-sm sm:text-lg md:text-xl text-gray-800 flex-1 text-left truncate">
            Panel - {currentUser?.firebaseUser?.displayName || "Vendedor"}
          </h1>
        </header>

        {/* Main Area with Tabs */}
        <main className="flex flex-1 flex-col gap-4 p-4 pb-20 md:gap-8 md:p-6 md:pb-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="default" className="mb-4 bg-green-50 border-green-300 text-green-700">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Éxito</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}



          {/* Dashboard Tab - keeping existing code */}
          {activeTab === "dashboard" && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen del Vendedor</CardTitle>
                <CardDescription>Un vistazo rápido a tu actividad.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Productos Publicados</CardTitle>
                    <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{myProducts.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Valor Total (Stock x Precio)</CardTitle>
                    <ListFilter className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${totalProductsValue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Estimación basada en stock y precio actual.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Gestión de Envíos</CardTitle>
                    <Truck className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{shippingStats.total}</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Pendientes:</span>
                        <span className="font-medium">{shippingStats.pending}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Enviados:</span>
                        <span className="font-medium">{shippingStats.shipped}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entregados:</span>
                        <span className="font-medium text-green-600">{shippingStats.delivered}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* Products Tab - Updated to show media */}
          {activeTab === "products" && (
            <Card>
              <CardHeader>
                <CardTitle>Mis Productos y Servicios</CardTitle>
                <CardDescription>Gestiona los ítems que tienes a la venta.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  </div>
                ) : myProducts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-lg text-muted-foreground mb-6">Aún no tienes productos publicados.</p>
                    <Button
                      onClick={() => {
                        resetForm()
                        setActiveTab("addProduct")
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Publicar mi primer producto
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Media</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myProducts.map((prod) => (
                            <TableRow key={prod.id}>
                              <TableCell>
                                <div className="flex gap-1">
                                  {prod.media && prod.media.length > 0 ? (
                                    prod.media.slice(0, 2).map((media, index) => (
                                      <div key={index} className="relative w-8 h-8 rounded-md overflow-hidden">
                                        {media.type === "image" ? (
                                          <Image
                                            src={media.url || "/placeholder.svg"}
                                            alt={`${prod.name} ${index + 1}`}
                                            width={32}
                                            height={32}
                                            className="object-cover"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center">
                                            <Video className="h-4 w-4 text-gray-600" />
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center">
                                      <ShoppingBag className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  {prod.media && prod.media.length > 2 && (
                                    <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center text-xs">
                                      +{prod.media.length - 2}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{prod.name}</TableCell>
                              <TableCell>${prod.price.toFixed(2)}</TableCell>
                              <TableCell>{prod.isService ? "Servicio" : "Producto"}</TableCell>
                              <TableCell className="text-center">
                                {prod.isService ? "N/A" : (prod.stock ?? 0)}
                              </TableCell>
                              <TableCell className="space-x-1">
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => handleEditProduct(prod)}
                                  >
                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => handleDeleteProduct(prod.id)}
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Product Tab - Updated with new media upload */}
          {activeTab === "addProduct" && (
            <Card>
              <CardHeader>
                <CardTitle>Añadir Nuevo Producto</CardTitle>
                <CardDescription>Completa los detalles para agregar un ítem.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Notificación de MercadoPago */}
                {!currentUser?.mercadopagoConnected ? (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Conecta MercadoPago para habilitar la publicación
                      </span>
                    </div>
                    <Button
                      onClick={() => setActiveTab("profile")}
                      variant="outline"
                      size="sm"
                      className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                    >
                      Ir a Configuración
                    </Button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-800">
                      MercadoPago conectado - Formulario habilitado
                    </span>
                  </div>
                )}
                {/* Resumen de errores */}
                {productFormTouched && Object.keys(productFormErrors).length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Faltan campos obligatorios</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {Object.values(productFormErrors).map((err, idx) => <li key={idx}>{err}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleSubmitProduct} className="space-y-6">
                  <fieldset disabled={!currentUser?.mercadopagoConnected} style={{ opacity: !currentUser?.mercadopagoConnected ? 0.5 : 1 }}>
                  {/* Media Upload Section */}
                  <div>
                    <Label htmlFor="productMedia" className="text-base">
                      Imágenes y Videos del Producto
                    </Label>
                    <div className="mt-2 space-y-4">
                      {/* Validation Requirements */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Requisitos importantes:</AlertTitle>
                        <AlertDescription className="text-blue-700">
                          <ul className="list-disc list-inside space-y-1 mt-2">
                              <li><strong>Imágenes:</strong> Deben tener fondo blanco obligatoriamente</li>
                              <li><strong>Videos:</strong> Máximo 60 segundos y 50MB de tamaño</li>
                            <li>Formatos soportados: JPG, PNG, WebP para imágenes | MP4, WebM para videos</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      {/* Validation Errors */}
                      {mediaValidationErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Errores de validación:</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {mediaValidationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                        {/* Input File */}
                        <Input
                          id="productMedia"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleMediaChange}
                          className="block w-full max-w-xs text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-orange-100 file:text-orange-700
                            hover:file:bg-orange-200
                            cursor-pointer"
                          disabled={validatingImages}
                        />

                        {/* Preview */}
                      {mediaPreviewUrls.length > 0 && (
                        <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Nuevos archivos seleccionados:</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {mediaPreviewUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                                  {mediaFiles[index].type.startsWith("image/") ? (
                                    <Image
                                      src={url || "/placeholder.svg"}
                                      alt={`Preview ${index + 1}`}
                                      layout="fill"
                                      objectFit="cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                      <div className="text-center">
                                        <Video className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                        <span className="text-xs text-gray-600">Video</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveMedia(index)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                                  {mediaFiles[index].type.startsWith("image/") ? "imagen" : "video"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                        {/* Loading States */}
                        {validatingImages && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Validando archivos...</span>
                        </div>
                      )}
                        {/* Error de media */}
                        {productFormTouched && productFormErrors.media && (
                          <p className="text-xs text-red-600 mt-1">{productFormErrors.media}</p>
                        )}
                    </div>
                  </div>

                  <div>
                      <Label htmlFor="productName" className="text-base">Nombre</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                        className={productFormTouched && productFormErrors.name ? 'border-red-500' : ''}
                    />
                      {productFormTouched && productFormErrors.name && (
                        <p className="text-xs text-red-600 mt-1">{productFormErrors.name}</p>
                      )}
                  </div>
                  <div>
                      <Label htmlFor="productDescription" className="text-base">Descripción</Label>
                    <Textarea
                      id="productDescription"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      rows={4}
                        className={productFormTouched && productFormErrors.description ? 'border-red-500' : ''}
                    />
                      {productFormTouched && productFormErrors.description && (
                        <p className="text-xs text-red-600 mt-1">{productFormErrors.description}</p>
                      )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="productPrice" className="text-base">Precio ($)</Label>
                      <Input
                        id="productPrice"
                        type="number"
                        step="0.01"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        required
                          className={productFormTouched && productFormErrors.price ? 'border-red-500' : ''}
                      />
                        {productFormTouched && productFormErrors.price && (
                          <p className="text-xs text-red-600 mt-1">{productFormErrors.price}</p>
                        )}
                    </div>
                    {!productIsService && (
                      <div>
                          <Label htmlFor="productStock" className="text-base">Stock (Unidades)</Label>
                        <Input
                          id="productStock"
                          type="number"
                          value={productStock}
                          onChange={(e) => setProductStock(e.target.value)}
                            className={productFormTouched && productFormErrors.stock ? 'border-red-500' : ''}
                        />
                          {productFormTouched && productFormErrors.stock && (
                            <p className="text-xs text-red-600 mt-1">{productFormErrors.stock}</p>
                          )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="productCategory" className="text-base">Categoría</Label>
                      <Select value={productCategory} onValueChange={setProductCategory} required>
                          <SelectTrigger className={productFormTouched && productFormErrors.category ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                        {productFormTouched && productFormErrors.category && (
                          <p className="text-xs text-red-600 mt-1">{productFormErrors.category}</p>
                        )}
                    </div>
                    <div>
                      <Label htmlFor="productBrand" className="text-base">
                        Marca (Opcional)
                      </Label>
                      <Select value={productBrand} onValueChange={setProductBrand}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una marca" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={submittingProduct}>
                      {submittingProduct ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : isEditing ? (
                        "Actualizar Producto"
                      ) : (
                        "Añadir Producto"
                      )}
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetForm} disabled={submittingProduct}>
                      Cancelar
                    </Button>
                  </div>
                  </fieldset>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Service Tab - Updated with new media upload */}
          {activeTab === "addService" && (
            <Card>
              <CardHeader>
                <CardTitle>Añadir Nuevo Servicio</CardTitle>
                <CardDescription>Completa los detalles para agregar un servicio.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Notificación de suscripción */}
                {currentUser && !currentUser.isSubscribed && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Suscripción requerida para crear servicios
                      </span>
                    </div>
                    <Button
                      onClick={() => setActiveTab("profile")}
                      variant="outline"
                      size="sm"
                      className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                    >
                      Ir a Configuración
                    </Button>
                  </div>
                )}
                {currentUser && currentUser.isSubscribed && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-800">
                      Suscripción activa - Puedes crear servicios
                    </span>
                  </div>
                )}
                {/* Resumen de errores */}
                {serviceFormTouched && Object.keys(serviceFormErrors).length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Faltan campos obligatorios</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {Object.values(serviceFormErrors).map((err, idx) => <li key={idx}>{err}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleSubmitService} className="space-y-6 relative">
                  <fieldset disabled={!!currentUser && !currentUser.isSubscribed} style={{ opacity: !!currentUser && !currentUser.isSubscribed ? 0.5 : 1 }}>
                    {/* Media Upload Section */}
                    <div>
                      <Label htmlFor="serviceMedia" className="text-base">Imágenes y Videos del Servicio</Label>
                      <div className="mt-2 space-y-4">
                        {/* Validation Requirements */}
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertTriangle className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Requisitos importantes:</AlertTitle>
                          <AlertDescription className="text-blue-700">
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              <li>
                                <strong>Imágenes:</strong> Deben tener fondo blanco obligatoriamente
                              </li>
                              <li>
                                <strong>Videos:</strong> Máximo 60 segundos y 50MB de tamaño
                              </li>
                              <li>Formatos soportados: JPG, PNG, WebP para imágenes | MP4, WebM para videos</li>
                            </ul>
                          </AlertDescription>
                        </Alert>

                        {/* Validation Errors */}
                        {mediaValidationErrors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Errores de validación:</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside space-y-1 mt-2">
                                {mediaValidationErrors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Drag and Drop Area */}
                        <div
                          className={`flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-lg transition-colors
                            ${isDraggingOver ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-400"}
                            ${validatingImages ? "opacity-50" : ""}`}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                        >
                          <div className="text-center">
                            <div className="flex justify-center gap-4 mb-4">
                              <ImageIconLucide className="h-12 w-12 text-gray-400" />
                              <Video className="h-12 w-12 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-700 mb-2">
                              {isDraggingOver ? "¡Suelta los archivos aquí!" : "Arrastra imágenes y videos aquí"}
                            </p>
                            <p className="text-sm text-gray-500 mb-4">o haz clic para seleccionar archivos</p>
                          </div>

                          <Input
                            id="serviceMedia"
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaChange}
                            className="block w-full max-w-xs text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-orange-100 file:text-orange-700
                              hover:file:bg-orange-200
                              cursor-pointer"
                            disabled={validatingImages}
                          />

                          {validatingImages && (
                            <div className="flex items-center gap-2 text-orange-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Validando archivos...</span>
                            </div>
                          )}
                          {/* Error de media */}
                          {serviceFormTouched && serviceFormErrors.media && (
                            <p className="text-xs text-red-600 mt-1">{serviceFormErrors.media}</p>
                          )}
                        </div>

                        {/* Current Media Preview */}
                        {currentProductMedia.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Media actual:</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {currentProductMedia.map((media, index) => (
                                <div key={index} className="relative group">
                                  <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                                    {media.type === "image" ? (
                                      <Image
                                        src={media.url || "/placeholder.svg"}
                                        alt={`Media ${index + 1}`}
                                        layout="fill"
                                        objectFit="cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                        <div className="text-center">
                                          <Video className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                          <span className="text-xs text-gray-600">Video</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveCurrentMedia(index)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                                    {media.type}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* New Media Preview */}
                        {mediaPreviewUrls.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Nuevos archivos seleccionados:
                      </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {mediaPreviewUrls.map((url, index) => (
                                <div key={index} className="relative group">
                                  <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                                    {mediaFiles[index].type.startsWith("image/") ? (
                                      <Image
                                        src={url || "/placeholder.svg"}
                                        alt={`Preview ${index + 1}`}
                                        layout="fill"
                                        objectFit="cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                        <div className="text-center">
                                          <Video className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                          <span className="text-xs text-gray-600">Video</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveMedia(index)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                                    {mediaFiles[index].type.startsWith("image/") ? "imagen" : "video"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {uploadingMedia && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Subiendo archivos...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="serviceName" className="text-base">Nombre del Servicio</Label>
                      <Input
                        id="serviceName"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                        className={serviceFormTouched && serviceFormErrors.name ? 'border-red-500' : ''}
                      />
                      {serviceFormTouched && serviceFormErrors.name && (
                        <p className="text-xs text-red-600 mt-1">{serviceFormErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="serviceDescription" className="text-base">Descripción</Label>
                    <Textarea
                      id="serviceDescription"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      rows={4}
                        className={serviceFormTouched && serviceFormErrors.description ? 'border-red-500' : ''}
                      required
                    />
                      {serviceFormTouched && serviceFormErrors.description && (
                        <p className="text-xs text-red-600 mt-1">{serviceFormErrors.description}</p>
                      )}
                  </div>
                  <div>
                      <Label htmlFor="servicePrice" className="text-base">Precio</Label>
                    <Input
                      id="servicePrice"
                      type="number"
                      step="0.01"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      required
                        className={serviceFormTouched && serviceFormErrors.price ? 'border-red-500' : ''}
                    />
                      {serviceFormTouched && serviceFormErrors.price && (
                        <p className="text-xs text-red-600 mt-1">{serviceFormErrors.price}</p>
                      )}
                  </div>
                  <div>
                      <Label htmlFor="serviceCategory" className="text-base">Categoría</Label>
                    <Select
                      value={productCategory}
                      onValueChange={setProductCategory}
                      required
                    >
                        <SelectTrigger className={serviceFormTouched && serviceFormErrors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      {serviceFormTouched && serviceFormErrors.category && (
                        <p className="text-xs text-red-600 mt-1">{serviceFormErrors.category}</p>
                      )}
                  </div>
                  <div>
                    <Label htmlFor="serviceBrand" className="text-base">
                      Marca (Opcional)
                    </Label>
                    <Select
                      value={productBrand}
                      onValueChange={setProductBrand}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={submittingProduct || validatingImages || uploadingMedia || (!!currentUser && !currentUser.isSubscribed)}>
                    {submittingProduct ? "Guardando..." : isEditing ? "Actualizar Servicio" : "Añadir Servicio"}
                  </Button>
                </fieldset>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Other tabs - keeping existing code */}
          {activeTab === "chats" && (
            <Card>
              <CardHeader>
                <CardTitle>Mis Chats</CardTitle>
                <CardDescription>Comunícate con tus clientes y resuelve sus dudas.</CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser?.firebaseUser.uid && <ChatList userId={currentUser.firebaseUser.uid} role="seller" />}
                {!currentUser?.firebaseUser.uid && <p className="text-center text-gray-500">Inicia sesión para ver tus chats.</p>}
              </CardContent>
            </Card>
          )}

          {activeTab === "stats" && (
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
                <CardDescription>Análisis de ventas y rendimiento.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Funcionalidad de estadísticas próximamente.</p>
              </CardContent>
            </Card>
          )}

          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
                <CardDescription>Gestiona tu perfil y configuración de cuenta.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
                    <TabsTrigger value="subscription">Suscripción</TabsTrigger>
                    <TabsTrigger value="mercadopago">MercadoPago</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="profile" className="space-y-6 mt-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image
                      src={profileImagePreviewUrl || currentUser?.firebaseUser.photoURL || "/placeholder-user.jpg"}
                      alt="Foto de perfil"
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="block w-full max-w-xs text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-orange-100 file:text-orange-700
                        hover:file:bg-orange-200
                        cursor-pointer"
                    />
                    <Button
                      onClick={handleSaveProfileImage}
                      disabled={!profileImageFile || uploadingProfileImage}
                      className="bg-orange-600 text-white hover:bg-orange-700"
                    >
                      {uploadingProfileImage ? "Subiendo..." : "Guardar Imagen de Perfil"}
                    </Button>
                    {currentUser?.firebaseUser.photoURL && (
                      <Button
                        onClick={handleRemoveCurrentProfileImage}
                        variant="outline"
                        disabled={uploadingProfileImage}
                      >
                        Eliminar Imagen Actual
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="displayName" className="text-base">Nombre de Vendedor</Label>
                  <Input id="displayName" value={currentUser?.firebaseUser.displayName || ""} disabled className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-base">Email</Label>
                  <Input id="email" value={currentUser?.firebaseUser.email || ""} disabled className="mt-1" />
                </div>

                  </TabsContent>
                  
                  <TabsContent value="subscription" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Gestión de Suscripción</h3>
                      
                      {currentUser?.isSubscribed ? (
                        <div className="space-y-4">
                                                     <Alert className="border-green-200 bg-green-50">
                             <CheckCircle className="h-4 w-4 text-green-600" />
                             <AlertTitle className="text-green-800">Suscripción Activa</AlertTitle>
                             <AlertDescription className="text-green-700">
                               Tu suscripción está activa y puedes crear y ofrecer servicios sin restricciones.
                             </AlertDescription>
                           </Alert>
                           
                           <Card>
                             <CardHeader>
                               <CardTitle>Estado de tu Suscripción</CardTitle>
                               <CardDescription>
                                 Tu suscripción para servicios está activa y funcionando.
                               </CardDescription>
                             </CardHeader>
                             <CardContent className="space-y-3">
                               <div className="flex items-center gap-2">
                                 <CheckCircle className="h-5 w-5 text-green-600" />
                                 <span className="font-semibold">Suscripción Activa</span>
                               </div>
                               <div className="text-sm text-gray-600">
                                 <p>• <strong>Servicios:</strong> Puedes crear y gestionar servicios</p>
                                 <p>• <strong>Pagos:</strong> Recibe pagos por tus servicios</p>
                                 <p>• <strong>Gestión:</strong> Administra todas tus ofertas</p>
                                 <p>• <strong>Soporte:</strong> Acceso a soporte prioritario</p>
                               </div>
                               <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                 <p className="text-sm text-green-800">
                                   <strong>Recordatorio:</strong> Los productos físicos no requieren suscripción.
                                 </p>
                               </div>
                             </CardContent>
                           </Card>
                        </div>
                      ) : (
                        <div className="space-y-4">
                                                     <Alert variant="destructive">
                             <AlertTriangle className="h-4 w-4" />
                             <AlertTitle>Suscripción Requerida</AlertTitle>
                             <AlertDescription>
                               Para crear y ofrecer servicios en la plataforma, necesitas activar tu suscripción.
                             </AlertDescription>
                           </Alert>
                           
                           <Card>
                             <CardHeader>
                               <CardTitle>Suscripción para Servicios</CardTitle>
                               <CardDescription>
                                 Activa tu suscripción para poder crear y ofrecer servicios.
                               </CardDescription>
                             </CardHeader>
                             <CardContent className="space-y-4">
                               <div className="text-sm text-gray-600">
                                 <p className="font-semibold mb-2">¿Para qué necesitas la suscripción?</p>
                                 <ul className="space-y-1">
                                   <li>• <strong>Crear servicios:</strong> Publica tus servicios profesionales</li>
                                   <li>• <strong>Gestionar ofertas:</strong> Administra tus servicios activos</li>
                                   <li>• <strong>Recibir pagos:</strong> Cobra por tus servicios de forma segura</li>
                                   <li>• <strong>Acceso completo:</strong> Usa todas las herramientas de vendedor</li>
                                 </ul>
                               </div>
                               <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                 <p className="text-sm text-blue-800">
                                   <strong>Nota:</strong> Los productos físicos no requieren suscripción, solo los servicios.
                                 </p>
                               </div>
                               <Button
                                 onClick={handleSubscribe}
                                 disabled={subscribing}
                                 className="w-full bg-purple-700 text-white hover:bg-purple-800"
                               >
                                 {subscribing ? "Redirigiendo..." : "Activar Suscripción"}
                               </Button>
                             </CardContent>
                           </Card>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="mercadopago" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Cuenta de MercadoPago</h3>
                      {currentUser?.mercadopagoConnected ? (
                        <div className="flex flex-col gap-2">
                          <div className="bg-green-100 text-green-800 p-3 rounded flex items-center gap-2">
                            <span className="font-semibold">✅ Cuenta conectada correctamente.</span>
                            <span className="text-xs">Ya puedes recibir pagos y vender productos.</span>
                          </div>
                          <Button
                            variant="destructive"
                            disabled={isDisconnecting}
                            onClick={() => {
                              if (window.confirm('¿Seguro que quieres desconectar tu cuenta de MercadoPago? No podrás vender productos hasta volver a conectar tu cuenta.')) {
                                handleDisconnect();
                              }
                            }}
                            className="w-full mt-2"
                          >
                            {isDisconnecting ? 'Desconectando...' : 'Desconectar cuenta de MercadoPago'}
                          </Button>
                          <div className="text-xs text-orange-700 mt-1">
                            <AlertTriangle className="inline w-4 h-4 mr-1 align-text-bottom" />
                            Si desconectas tu cuenta, no podrás vender productos ni recibir pagos hasta volver a conectar.
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="bg-yellow-100 text-yellow-800 p-3 rounded flex items-center gap-2">
                            <span className="font-semibold">⚠️ Debes conectar tu cuenta de MercadoPago para vender productos y recibir pagos.</span>
                          </div>
                          <ConnectMercadoPagoButton />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {activeTab === "coupons" && (
            <Card>
              <CardHeader>
                <CardTitle>Gestionar Cupones de Descuento</CardTitle>
                <CardDescription>Asocia cupones a tus productos y define el período de validez.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <h3 className="text-lg font-semibold">Cupones Disponibles</h3>
                {availableCoupons.length === 0 ? (
                  <p className="text-gray-500">No hay cupones activos disponibles en este momento.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descuento</TableHead>
                        <TableHead>Aplicable a</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableCoupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                          <TableCell className="font-medium">{coupon.code}</TableCell>
                          <TableCell>{coupon.name}</TableCell>
                          <TableCell>
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}%`
                              : `$${coupon.discountValue.toFixed(2)}`}
                          </TableCell>
                          <TableCell>{coupon.applicableTo === "all" ? "Todos" : "Vendedores"}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Asociar Productos
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
                  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Asociar Cupón a Productos</DialogTitle>
                      <DialogDescription>
                        Selecciona los productos a los que deseas aplicar el cupón.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label className="text-base">Productos</Label>
                        {myProducts.length === 0 ? (
                          <p className="text-gray-500">No tienes productos para asociar.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
                            {myProducts.map((product) => (
                              <div key={product.id} className="flex items-center space-x-2 border p-3 rounded-md">
                                <Checkbox
                                  id={`product-${product.id}`}
                                  checked={selectedProductIds.includes(product.id)}
                                  onCheckedChange={(checked) =>
                                    handleProductSelection(product.id, checked === true)}
                                />
                                <label
                                  htmlFor={`product-${product.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {product.name} - ${product.price.toFixed(2)}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">Fecha de Inicio</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={`w-full justify-start text-left font-normal ${!couponApplyStartDate && "text-muted-foreground"}
                                `}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {couponApplyStartDate ? format(couponApplyStartDate, "PPP") : <span className="text-gray-500">Selecciona una fecha</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={couponApplyStartDate}
                                onSelect={setCouponApplyStartDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">Fecha de Fin</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={`w-full justify-start text-left font-normal ${!couponApplyEndDate && "text-muted-foreground"}`}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {couponApplyEndDate ? format(couponApplyEndDate, "PPP") : <span className="text-gray-500">Selecciona una fecha</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={couponApplyEndDate}
                                onSelect={setCouponApplyEndDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                 
                    <DialogFooter>
                      <Button
                        onClick={associateCouponToProducts}
                        disabled={associatingCoupon || selectedProductIds.length === 0 || !couponApplyStartDate || !couponApplyEndDate}
                      >
                        {associatingCoupon ? "Asociando..." : "Confirmar Asociación"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsCouponModalOpen(false)}>
                        Cancelar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <h3 className="text-lg font-semibold mt-8">Mis Productos con Cupones</h3>
                {myProducts.filter(p => p.couponId).length === 0 ? (
                  <p className="text-gray-500">Aún no has asociado cupones a tus productos.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cupón</TableHead>
                        <TableHead>Válido Desde</TableHead>
                        <TableHead>Válido Hasta</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myProducts.filter(p => p.couponId).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            {availableCoupons.find(c => c.id === product.couponId)?.name || "N/A"}
                          </TableCell>
                          <TableCell>
                            {product.couponStartDate ? format(new Date(product.couponStartDate.toDate()), "PPP") : "N/A"}
                          </TableCell>
                          <TableCell>
                            {product.couponEndDate ? format(new Date(product.couponEndDate.toDate()), "PPP") : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Button variant="destructive" size="sm" onClick={() => removeCouponFromProduct(product.id)}>
                              Quitar Cupón
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipping Management Tab */}
          {activeTab === "shipping" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Gestión de Envíos
                </CardTitle>
                <CardDescription>
                  Administra el estado de envío de tus productos vendidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="shipping-filter">Filtrar por estado:</Label>
                    <Select
                      value={shippingFilter}
                      onValueChange={(value) => setShippingFilter(value as ShippingStatus | "all")}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="preparing">En preparación</SelectItem>
                        <SelectItem value="shipped">Enviado</SelectItem>
                        <SelectItem value="delivered">Entregado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={fetchShipments}
                    variant="outline"
                    disabled={loadingShipments}
                    className="flex items-center gap-2"
                  >
                    {loadingShipments ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    Actualizar
                  </Button>
                </div>

                {/* Lista de envíos */}
                {loadingShipments ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  </div>
                ) : getFilteredShipments().length === 0 ? (
                  <div className="text-center py-10">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg text-muted-foreground mb-2">
                      {shippingFilter === "all" 
                        ? "No tienes envíos que gestionar" 
                        : `No hay envíos con estado "${getShippingStatusText(shippingFilter as ShippingStatus)}"`
                      }
                    </p>
                    <p className="text-sm text-gray-500">
                      Los envíos aparecerán aquí cuando tengas productos físicos vendidos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredShipments().map((shipment) => (
                      <Card key={shipment.id} className="overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Información del producto y compra */}
                            <div className="flex items-start gap-4 flex-1">
                              <div className="w-16 h-16 relative flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                {shipment.productImageUrl ? (
                                  <Image
                                    src={shipment.productImageUrl}
                                    alt={shipment.productName || "Producto"}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-lg mb-1 truncate">
                                  {shipment.productName || "Producto desconocido"}
                                </h3>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p>Compra #{shipment.paymentId}</p>
                                  <p>Comprador: {shipment.vendorName || "Usuario"}</p>
                                  <p>Monto: ${shipment.amount.toFixed(2)}</p>
                                  <p>
                                    Fecha: {shipment.createdAt?.toDate ? 
                                      shipment.createdAt.toDate().toLocaleDateString() : 
                                      new Date(shipment.createdAt).toLocaleDateString()
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Estado actual y acciones */}
                            <div className="lg:w-80 space-y-4">
                              {/* Estado actual */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Estado actual:</span>
                                <Badge
                                  className={`flex items-center gap-1 ${
                                    shipment.shipping 
                                      ? getShippingBadgeClass(shipment.shipping.status)
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {shipment.shipping ? (
                                    <>
                                      {getShippingIcon(shipment.shipping.status)}
                                      {getShippingStatusText(shipment.shipping.status)}
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-4 w-4" />
                                      Sin envío
                                    </>
                                  )}
                                </Badge>
                              </div>

                              {/* Selector de nuevo estado */}
                              <div className="space-y-2">
                                <Label className="text-sm">Actualizar estado:</Label>
                                                               <Select
                                   onValueChange={(newStatus) => {
                                     openShippingUpdateModal(shipment.id, newStatus as ShippingStatus)
                                   }}
                                   disabled={updatingShipment === shipment.id}
                                 >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar nuevo estado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Pendiente
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="preparing">
                                      <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        En preparación
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="shipped">
                                      <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4" />
                                        Enviado
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="delivered">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        Entregado
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="cancelled">
                                      <div className="flex items-center gap-2">
                                        <XCircle className="h-4 w-4" />
                                        Cancelado
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Información adicional de envío */}
                              {shipment.shipping && (
                                <div className="pt-2 border-t space-y-2 text-sm">
                                  {shipment.shipping.trackingNumber && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Seguimiento:</span>
                                      <span className="font-mono text-xs">
                                        {shipment.shipping.trackingNumber}
                                      </span>
                                    </div>
                                  )}
                                  {shipment.shipping.carrierName && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Transportista:</span>
                                      <span>{shipment.shipping.carrierName}</span>
                                    </div>
                                  )}
                                  {shipment.shipping.estimatedDelivery && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Entrega estimada:</span>
                                      <span>
                                        {new Date(shipment.shipping.estimatedDelivery).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  {shipment.shipping.notes && (
                                    <div className="pt-2">
                                      <span className="text-gray-600">Notas:</span>
                                      <p className="text-xs mt-1 bg-gray-50 p-2 rounded">
                                        {shipment.shipping.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Indicador de carga */}
                          {updatingShipment === shipment.id && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center gap-2 text-sm text-orange-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Actualizando estado de envío...
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                                 )}

                 {/* Modal de actualización de envío */}
                 <Dialog open={isShippingModalOpen} onOpenChange={setIsShippingModalOpen}>
                   <DialogContent className="sm:max-w-[500px]">
                     <DialogHeader>
                       <DialogTitle>Actualizar Estado de Envío</DialogTitle>
                       <DialogDescription>
                         {selectedNewStatus && (
                           <>Cambiar estado a: <strong>{getShippingStatusText(selectedNewStatus)}</strong></>
                         )}
                       </DialogDescription>
                     </DialogHeader>
                     
                     <div className="grid gap-4 py-4">
                       {/* Número de seguimiento */}
                       <div className="grid gap-2">
                         <Label htmlFor="tracking">Número de seguimiento (opcional)</Label>
                         <Input
                           id="tracking"
                           value={trackingNumber}
                           onChange={(e) => setTrackingNumber(e.target.value)}
                           placeholder="Ej: ABC123456789"
                         />
                       </div>

                       {/* Transportista */}
                       <div className="grid gap-2">
                         <Label htmlFor="carrier">Empresa transportista (opcional)</Label>
                         <Input
                           id="carrier"
                           value={carrierName}
                           onChange={(e) => setCarrierName(e.target.value)}
                           placeholder="Ej: Correos de México, DHL, FedEx"
                         />
                       </div>

                       {/* Notas */}
                       <div className="grid gap-2">
                         <Label htmlFor="notes">Notas adicionales (opcional)</Label>
                         <Textarea
                           id="notes"
                           value={shippingNotes}
                           onChange={(e) => setShippingNotes(e.target.value)}
                           placeholder="Información adicional sobre el envío..."
                           rows={3}
                         />
                       </div>
                     </div>

                     <DialogFooter>
                       <Button variant="outline" onClick={closeShippingUpdateModal}>
                         Cancelar
                       </Button>
                       <Button 
                         onClick={confirmShippingUpdate}
                         disabled={updatingShipment === selectedShipmentId}
                       >
                         {updatingShipment === selectedShipmentId ? (
                           <>
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             Actualizando...
                           </>
                         ) : (
                           "Actualizar Estado"
                         )}
                       </Button>
                     </DialogFooter>
                   </DialogContent>
                 </Dialog>
               </CardContent>
             </Card>
           )}
        </main>
      </div>
    </div>
  )
}


