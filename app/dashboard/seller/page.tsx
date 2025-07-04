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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
        await updateDoc(productRef, {
          couponId: selectedCouponId,
          couponStartDate: couponApplyStartDate,
          couponEndDate: couponApplyEndDate,
          updatedAt: serverTimestamp(),
        })
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
      await updateDoc(productRef, {
        couponId: null,
        couponStartDate: null,
        couponEndDate: null,
        updatedAt: serverTimestamp(),
      })

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

      return {
        type: isVideo ? "video" : "image",
        url: downloadURL,
        path: filePath,
        thumbnail,
      }
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

  const handleSubmitProduct = async (e: FormEvent) => {
    e.preventDefault()
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

      const productData: Partial<Product> = {
        name: productName,
        description: productDescription,
        price: Number.parseFloat(productPrice),
        category: productCategory,
        brand: productBrand || undefined,
        media: newMedia,
        isService: productIsService,
        stock: !productIsService && productStock ? Number.parseInt(productStock) : undefined,
        sellerId: currentUser.firebaseUser.uid,
        updatedAt: serverTimestamp(),
      }

      if (isEditing && editingProductId) {
        const productRef = doc(db, "products", editingProductId)
        await updateDoc(productRef, productData)
        setMyProducts((prevProducts) =>
          prevProducts.map((p) => (p.id === editingProductId ? { ...p, ...productData, updatedAt: new Date() } : p)),
        )
        setSuccessMessage("Producto actualizado exitosamente.")
      } else {
        const fullProductData = { ...productData, createdAt: serverTimestamp() } as Omit<Product, "id">
        const docRef = await addDoc(collection(db, "products"), fullProductData)
        setMyProducts((prevProducts) => [
          { id: docRef.id, ...fullProductData, createdAt: new Date(), updatedAt: new Date() } as Product,
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
      if (currentUser.firebaseUser.photoPath) {
        await deleteProfileImageFromStorage(currentUser.firebaseUser.photoPath)
      }

      const { downloadURL, filePath } = await uploadProfileImageToStorage(profileImageFile)

      const userRef = doc(db, "users", currentUser.firebaseUser.uid)
      await updateDoc(userRef, {
        photoURL: downloadURL,
        photoPath: filePath,
        updatedAt: serverTimestamp(),
      })

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
    if (!currentUser.firebaseUser.photoPath) {
      setError("No hay imagen de perfil para eliminar.")
      return
    }

    setUploadingProfileImage(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await deleteProfileImageFromStorage(currentUser.firebaseUser.photoPath) // currentUser.photoPath ya está validado como string aquí

      const userRef = doc(db, "users", currentUser.firebaseUser.uid)
      await updateDoc(userRef, {
        photoURL: null,
        photoPath: null,
        updatedAt: serverTimestamp(),
      })

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
        {/* Header for mobile sidebar - keeping existing code */}
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-white px-6 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="lg:hidden w-72">
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
                  onClick={() => setActiveTab("dashboard")}
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
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Servicio
                </Button>
                <Button
                  variant={activeTab === "chats" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("chats")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Mis Chats
                </Button>
                <Button
                  variant={activeTab === "stats" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("stats")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Estadísticas
                </Button>
                <Button
                  variant={activeTab === "profile" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("profile")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-orange-600 justify-start"
                >
                  <UserIcon className="mr-2 h-5 w-5" />
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

          {/* Sección de MercadoPago */}
          {activeTab !== "addService" && (
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Cuenta de MercadoPago</h2>
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
          </Card>
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
                {!currentUser?.mercadopagoConnected && (
                  <Alert variant="warning" className="mb-4">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle>Conexión requerida</AlertTitle>
                    <AlertDescription>
                      Debes conectar tu cuenta de MercadoPago para poder crear y publicar productos en la plataforma.
                    </AlertDescription>
                    <ConnectMercadoPagoButton />
                  </Alert>
                )}
                <fieldset disabled={!currentUser?.mercadopagoConnected} style={{ opacity: !currentUser?.mercadopagoConnected ? 0.5 : 1 }}>
                  <form onSubmit={handleSubmitProduct} className="space-y-6">
                    <div>
                      <Label htmlFor="productName" className="text-base">
                        Nombre
                      </Label>
                      <Input
                        id="productName"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="productDescription" className="text-base">
                        Descripción
                      </Label>
                      <Textarea
                        id="productDescription"
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="productPrice" className="text-base">
                          Precio ($)
                        </Label>
                        <Input
                          id="productPrice"
                          type="number"
                          step="0.01"
                          value={productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          required
                        />
                      </div>
                      {!productIsService && (
                        <div>
                          <Label htmlFor="productStock" className="text-base">
                            Stock (Unidades)
                          </Label>
                          <Input
                            id="productStock"
                            type="number"
                            value={productStock}
                            onChange={(e) => setProductStock(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="productCategory" className="text-base">
                          Categoría
                        </Label>
                        <Select value={productCategory} onValueChange={setProductCategory} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <Button type="submit" disabled={submittingProduct || (!isEditing)}>
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
                {currentUser && currentUser.role === 'seller' && !currentUser.isSubscribed && (
                  <div className="mb-6">
                    <Alert className="bg-yellow-50 border-yellow-200 mb-4">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-800">Suscripción requerida</AlertTitle>
                      <AlertDescription className="text-yellow-700">
                        Debes suscribirte para poder crear y publicar servicios en la plataforma.
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleSubscribe}
                      disabled={!currentUser || authLoading || subscribing}
                      className="bg-purple-700 text-white px-4 py-2 rounded"
                    >
                      {subscribing ? 'Redirigiendo...' : 'Suscribirse con MercadoPago'}
                    </Button>
                  </div>
                )}
                <form
                  onSubmit={async (e) => {
                    if (currentUser && !currentUser.isSubscribed) {
                      e.preventDefault();
                      return;
                    }
                    // ... lógica original del submit ...
                  }}
                  className="space-y-6 relative"
                >
                  <fieldset disabled={!!currentUser && !currentUser.isSubscribed} style={{ opacity: !!currentUser && !currentUser.isSubscribed ? 0.5 : 1 }}>
                    <div>
                      <Label htmlFor="serviceName" className="text-base">
                        Nombre del Servicio
                      </Label>
                      <Input
                        id="serviceName"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="serviceDescription" className="text-base">
                        Descripción
                      </Label>
                    <Textarea
                      id="serviceDescription"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      rows={4}
                      className="resize-y"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="servicePrice" className="text-base">
                      Precio
                    </Label>
                    <Input
                      id="servicePrice"
                      type="number"
                      step="0.01"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="serviceCategory" className="text-base">
                      Categoría
                    </Label>
                    <Select
                      value={productCategory}
                      onValueChange={setProductCategory}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <CardTitle>Mi Perfil</CardTitle>
                <CardDescription>Actualiza tu información personal y de vendedor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <Input id="displayName" value={currentUser?.displayName || ""} disabled className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-base">Email</Label>
                  <Input id="email" value={currentUser?.email || ""} disabled className="mt-1" />
                </div>
                {currentUser?.isSubscribed === false && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Suscrito</AlertTitle>
                    <AlertDescription>
                      No tienes una suscripción activa. Para publicar más productos o servicios de los permitidos,
                      necesitas suscribirte.
                    </AlertDescription>
                  </Alert>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle>Suscripción</CardTitle>
                    <CardDescription>
                      Gestiona tu plan de suscripción para aumentar el límite de productos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentUser?.isSubscribed ? (
                      <div className="flex items-center gap-2 text-green-600 font-semibold">
                        <CheckCircle className="h-5 w-5" />
                        <span>Plan Básico Activo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-600 font-semibold">
                        <AlertTriangle className="h-5 w-5" />
                        <span>No Suscrito</span>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      Límite de productos: {currentUser?.productUploadLimit || 5}
                    </p>
                    {!currentUser?.isSubscribed && (
                      <Button
                        onClick={handleSubscribe}
                        disabled={subscribing}
                        className="mt-4 bg-purple-700 text-white hover:bg-purple-800"
                      >
                        {subscribing ? "Redirigiendo..." : "Suscribirse al Plan Básico"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
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
                      {selectedCouponId && (
                        <p className="text-sm text-gray-700">
                          Cupón seleccionado:{" "}
                          <span className="font-semibold">
                            {availableCoupons.find((c) => c.id === selectedCouponId)?.name || "N/A"}
                          </span>
                        </p>
                      )}
                      <div className="space-y-4">
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
        </main>
      </div>
    </div>
  )
}


