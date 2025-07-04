"use client"

import Link from "next/link"
import Image from "next/image"
import {
  Home,
  Users,
  Tag,
  List,
  Package2,
  ShoppingBag,
  Trash2,
  ImageIcon,
  XCircle,
  ShoppingCart,
  User,
  PlusCircle,
  Star,
  Megaphone,
  AlertTriangle,
  Percent,
  Calendar,
  Eye,
  EyeOff,
  Edit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

import { useState, useEffect, type ChangeEvent, useMemo } from "react"
import { db, storage } from "@/lib/firebase"
import {
  collection,
  addDoc, // Keep if adding categories/brands
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  where,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: Date
  role?: string
  photoURL?: string
  isSubscribed?: boolean
  productUploadLimit?: number
}

interface Category {
  id: string
  name: string
  description?: string
  imageUrl?: string
  imagePath?: string
}

interface Brand {
  id: string
  name: string
  imageUrl?: string
  imagePath?: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  imageUrl?: string
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
  imagePath?: string
  seller?: UserData
  averageRating?: number // Added for reviews filter
}

interface Banner {
  id: string
  title: string
  description?: string
  imageUrl: string
  imagePath: string
  linkUrl?: string
  isActive: boolean
  order: number
  createdAt: any
  updatedAt?: any
}

interface OfferAlert {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
  isActive: boolean
  startDate: any
  endDate?: any
  createdAt: any
  updatedAt?: any
}

interface Coupon {
  id: string
  code: string
  name: string
  description?: string
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchase?: number
  maxDiscount?: number
  usageLimit?: number
  usedCount: number
  isActive: boolean
  startDate: any
  endDate?: any
  applicableTo: "all" | "sellers" | "buyers"
  createdAt: any
  updatedAt?: any
}

export default function AdminDashboard() {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("overview")
  const [users, setUsers] = useState<UserData[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [products, setProducts] = useState<Product[]>([]) // Still used for overview count
  const [allProducts, setAllProducts] = useState<Product[]>([])

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null)
  const [newCategoryImagePreviewUrl, setNewCategoryImagePreviewUrl] = useState<string | null>(null)
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false)

  // Brand Form State
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImageFile, setNewBrandImageFile] = useState<File | null>(null)
  const [newBrandImagePreviewUrl, setNewBrandImagePreviewUrl] = useState<string | null>(null)
  const [uploadingBrandImage, setUploadingBrandImage] = useState(false)

  const [loading, setLoading] = useState(true)
  const [addingCategory, setAddingCategory] = useState(false)
  const [addingBrand, setAddingBrand] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para los filtros de todos los productos
  const [allProductsSearchTerm, setAllProductsSearchTerm] = useState("")
  const [allProductsFilterCategory, setAllProductsFilterCategory] = useState("all")
  const [allProductsFilterSeller, setAllProductsFilterSeller] = useState("all")
  const [allProductsFilterIsService, setAllProductsFilterIsService] = useState("all")
  const [allProductsSortOrder, setAllProductsSortOrder] = useState("default") // New state for sorting
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

  // Estados para banners
  const [banners, setBanners] = useState<Banner[]>([])
  const [newBannerTitle, setNewBannerTitle] = useState("")
  const [newBannerDescription, setNewBannerDescription] = useState("")
  const [newBannerImageFile, setNewBannerImageFile] = useState<File | null>(null)
  const [newBannerImagePreviewUrl, setNewBannerImagePreviewUrl] = useState<string | null>(null)
  const [newBannerLinkUrl, setNewBannerLinkUrl] = useState("")
  const [newBannerOrder, setNewBannerOrder] = useState(1)
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false)
  const [addingBanner, setAddingBanner] = useState(false)

  // Estados para alertas de ofertas
  const [offerAlerts, setOfferAlerts] = useState<OfferAlert[]>([])
  const [newAlertTitle, setNewAlertTitle] = useState("")
  const [newAlertMessage, setNewAlertMessage] = useState("")
  const [newAlertType, setNewAlertType] = useState<"info" | "warning" | "success" | "error">("info")
  const [newAlertStartDate, setNewAlertStartDate] = useState("")
  const [newAlertEndDate, setNewAlertEndDate] = useState("")
  const [addingAlert, setAddingAlert] = useState(false)

  // Estados para cupones
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [newCouponCode, setNewCouponCode] = useState("")
  const [newCouponName, setNewCouponName] = useState("")
  const [newCouponDescription, setNewCouponDescription] = useState("")
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [newCouponDiscountValue, setNewCouponDiscountValue] = useState("")
  const [newCouponMinPurchase, setNewCouponMinPurchase] = useState("")
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState("")
  const [newCouponUsageLimit, setNewCouponUsageLimit] = useState("")
  const [newCouponApplicableTo, setNewCouponApplicableTo] = useState<"all" | "sellers" | "buyers">("all")
  const [newCouponStartDate, setNewCouponStartDate] = useState("")
  const [newCouponEndDate, setNewCouponEndDate] = useState("")
  const [addingCoupon, setAddingCoupon] = useState(false)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
      return
    }
    if (currentUser?.role !== "admin") {
      router.push(currentUser?.role === "seller" ? "/dashboard/seller" : "/?error=unauthorized_admin")
      return
    }
    if (currentUser) {
      fetchAdminData()
    }
  }, [currentUser, authLoading, router])

  const fetchAdminData = async () => {
    setLoading(true)
    setError(null)
    try {
      const usersCollection = collection(db, "users")
      const userSnapshot = await getDocs(usersCollection)
      const usersData = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as UserData[]
      setUsers(usersData)

      const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
      const categorySnapshot = await getDocs(categoriesQuery)
      setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Category))

      const brandsQuery = query(collection(db, "brands"), orderBy("name"))
      const brandSnapshot = await getDocs(brandsQuery)
      setBrands(brandSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Brand))

      const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"))
      const productSnapshot = await getDocs(productsQuery)
      const productsData = productSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            averageRating: Number.parseFloat((Math.random() * 5).toFixed(1)), // Simulate average rating
          }) as Product,
      )
      setProducts(productsData) // Update products state for overview count

      // Obtener todos los productos con información del vendedor
      const allProductsWithSellers = await Promise.all(
        productsData.map(async (product) => {
          const seller = usersData.find((user) => user.id === product.sellerId)
          return {
            ...product,
            seller,
          }
        }),
      )
      setAllProducts(allProductsWithSellers)

      // Cargar banners
      const bannersQuery = query(collection(db, "banners"), orderBy("order"))
      const bannerSnapshot = await getDocs(bannersQuery)
      setBanners(bannerSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Banner))

      // Cargar alertas de ofertas
      const alertsQuery = query(collection(db, "offerAlerts"), orderBy("createdAt", "desc"))
      const alertSnapshot = await getDocs(alertsQuery)
      setOfferAlerts(alertSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OfferAlert))

      // Cargar cupones
      const couponsQuery = query(collection(db, "coupons"), orderBy("createdAt", "desc"))
      const couponSnapshot = await getDocs(couponsQuery)
      setCoupons(couponSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Coupon))
    } catch (err) {
      console.error("Error fetching admin data:", err)
      setError("Error al cargar los datos del panel. Verifica tu conexión y permisos.")
    } finally {
      setLoading(false)
    }
  }

  const uploadImageToStorage = async (
    file: File,
    pathPrefix: string,
  ): Promise<{ downloadURL: string; filePath: string }> => {
    if (!currentUser) throw new Error("Usuario no autenticado.")
    const filePath = `${pathPrefix}/${Date.now()}-${file.name}`
    const storageRef = ref(storage, filePath)
    try {
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      return { downloadURL, filePath }
    } catch (error) {
      console.error("Error uploading image: ", error)
      throw new Error("Error al subir la imagen.")
    }
  }

  const handleNewCategoryImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewCategoryImageFile(file)
      setNewCategoryImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveCategoryImage = () => {
    setNewCategoryImageFile(null)
    setNewCategoryImagePreviewUrl(null)
  }

  const handleAddCategory = async () => {
    if (newCategoryName.trim() === "") {
      setError("El nombre de la categoría no puede estar vacío.")
      return
    }
    setAddingCategory(true)
    setUploadingCategoryImage(true)
    setError(null)
    let imageUrl: string | undefined
    let imagePath: string | undefined

    try {
      if (newCategoryImageFile) {
        const { downloadURL, filePath } = await uploadImageToStorage(newCategoryImageFile, "categories")
        imageUrl = downloadURL
        imagePath = filePath
      }

      const categoryData: any = {
        name: newCategoryName,
        createdAt: serverTimestamp(),
      }
      if (newCategoryDescription.trim() !== "") {
        categoryData.description = newCategoryDescription
      }
      if (imageUrl) {
        categoryData.imageUrl = imageUrl
        categoryData.imagePath = imagePath
      }

      const docRef = await addDoc(collection(db, "categories"), categoryData)
      setCategories((prevCategories) => [
        ...prevCategories,
        { id: docRef.id, ...categoryData, createdAt: new Date() } as Category,
      ])
      setNewCategoryName("")
      setNewCategoryDescription("")
      handleRemoveCategoryImage()
    } catch (err) {
      console.error("Error adding category:", err)
      setError("Error al añadir la categoría. Revisa la consola para más detalles.")
    } finally {
      setAddingCategory(false)
      setUploadingCategoryImage(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string, imagePath?: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoryName}"?`)) {
      return
    }
    try {
      if (imagePath) {
        const imageRef = ref(storage, imagePath)
        await deleteObject(imageRef)
        console.log("Image deleted from storage:", imagePath)
      }

      await deleteDoc(doc(db, "categories", categoryId))
      setCategories((prevCategories) => prevCategories.filter((cat) => cat.id !== categoryId))
      setError(null)
      console.log("Category deleted:", categoryId)
    } catch (err) {
      console.error("Error deleting category:", err)
      setError(`Error al eliminar la categoría "${categoryName}".`)
    }
  }

  const handleNewBrandImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewBrandImageFile(file)
      setNewBrandImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveBrandImage = () => {
    setNewBrandImageFile(null)
    setNewBrandImagePreviewUrl(null)
  }

  const handleAddBrand = async () => {
    if (newBrandName.trim() === "") {
      setError("El nombre de la marca no puede estar vacío.")
      return
    }
    setAddingBrand(true)
    setUploadingBrandImage(true)
    setError(null)
    let imageUrl: string | undefined
    let imagePath: string | undefined

    try {
      if (newBrandImageFile) {
        const { downloadURL, filePath } = await uploadImageToStorage(newBrandImageFile, "brands")
        imageUrl = downloadURL
        imagePath = filePath
      }

      const brandData: any = {
        name: newBrandName,
        createdAt: serverTimestamp(),
      }
      if (imageUrl) {
        brandData.imageUrl = imageUrl
        brandData.imagePath = imagePath
      }

      const docRef = await addDoc(collection(db, "brands"), brandData)
      setBrands((prevBrands) => [...prevBrands, { id: docRef.id, ...brandData, createdAt: new Date() } as Brand])
      setNewBrandName("")
      handleRemoveBrandImage()
    } catch (err) {
      console.error("Error adding brand:", err)
      setError("Error al añadir la marca. Revisa la consola para más detalles.")
    } finally {
      setAddingBrand(false)
      setUploadingBrandImage(false)
    }
  }

  const handleDeleteBrand = async (brandId: string, brandName: string, imagePath?: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la marca "${brandName}"?`)) {
      return
    }
    try {
      if (imagePath) {
        const imageRef = ref(storage, imagePath)
        await deleteObject(imageRef)
        console.log("Image deleted from storage:", imagePath)
      }

      await deleteDoc(doc(db, "brands", brandId))
      setBrands((prevBrands) => prevBrands.filter((brand) => brand.id !== brandId))
      setError(null)
      console.log("Brand deleted:", brandId)
    } catch (err) {
      console.error("Error deleting brand:", err)
      setError(`Error al eliminar la marca "${brandName}".`)
    }
  }

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, { isActive: !currentStatus })
      setUsers(users.map((user) => (user.id === userId ? { ...user, isActive: !currentStatus } : user)))
    } catch (error) {
      console.error("Error updating user status:", error)
      setError("Error al actualizar el estado del usuario.")
    }
  }

  // Función para eliminar productos desde la pestaña "Todos los Productos"
  const handleDeleteAllProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el producto "${productName}"?`)) {
      return
    }
    setDeletingProductId(productId)
    try {
      await deleteDoc(doc(db, "products", productId))
      setAllProducts((prevProducts) => prevProducts.filter((prod) => prod.id !== productId))
      setProducts((prevProducts) => prevProducts.filter((prod) => prod.id !== productId)) // Also update the main products list
      setError(null)
      console.log("Product deleted:", productId)
    } catch (err) {
      console.error("Error deleting product:", err)
      setError(`Error al eliminar el producto "${productName}".`)
    } finally {
      setDeletingProductId(null)
    }
  }

  // Funciones para manejar banners
  const handleNewBannerImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewBannerImageFile(file)
      setNewBannerImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveBannerImage = () => {
    setNewBannerImageFile(null)
    setNewBannerImagePreviewUrl(null)
  }

  const handleAddBanner = async () => {
    if (newBannerTitle.trim() === "") {
      setError("El título del banner no puede estar vacío.")
      return
    }
    if (!newBannerImageFile) {
      setError("Debes seleccionar una imagen para el banner.")
      return
    }

    setAddingBanner(true)
    setUploadingBannerImage(true)
    setError(null)

    try {
      const { downloadURL, filePath } = await uploadImageToStorage(newBannerImageFile, "banners")

      const bannerData: any = {
        title: newBannerTitle,
        imageUrl: downloadURL,
        imagePath: filePath,
        isActive: true,
        order: newBannerOrder,
        createdAt: serverTimestamp(),
      }

      // Solo agregar campos opcionales si tienen valor
      if (newBannerDescription.trim()) {
        bannerData.description = newBannerDescription.trim()
      }
      if (newBannerLinkUrl.trim()) {
        bannerData.linkUrl = newBannerLinkUrl.trim()
      }

      const docRef = await addDoc(collection(db, "banners"), bannerData)
      setBanners((prevBanners) => [
        ...prevBanners,
        { id: docRef.id, ...bannerData, createdAt: new Date() } as Banner,
      ])

      // Reset form
      setNewBannerTitle("")
      setNewBannerDescription("")
      setNewBannerLinkUrl("")
      setNewBannerOrder(1)
      handleRemoveBannerImage()
    } catch (err) {
      console.error("Error adding banner:", err)
      setError("Error al añadir el banner. Revisa la consola para más detalles.")
    } finally {
      setAddingBanner(false)
      setUploadingBannerImage(false)
    }
  }

  const handleToggleBannerActive = async (bannerId: string, currentStatus: boolean) => {
    try {
      const bannerRef = doc(db, "banners", bannerId)
      await updateDoc(bannerRef, { isActive: !currentStatus })
      setBanners(banners.map((banner) => (banner.id === bannerId ? { ...banner, isActive: !currentStatus } : banner)))
    } catch (error) {
      console.error("Error updating banner status:", error)
      setError("Error al actualizar el estado del banner.")
    }
  }

  const handleDeleteBanner = async (bannerId: string, bannerTitle: string, imagePath?: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el banner "${bannerTitle}"?`)) {
      return
    }
    try {
      if (imagePath) {
        const imageRef = ref(storage, imagePath)
        await deleteObject(imageRef)
      }

      await deleteDoc(doc(db, "banners", bannerId))
      setBanners((prevBanners) => prevBanners.filter((banner) => banner.id !== bannerId))
      setError(null)
    } catch (err) {
      console.error("Error deleting banner:", err)
      setError(`Error al eliminar el banner "${bannerTitle}".`)
    }
  }

  // Funciones para manejar alertas de ofertas
  const handleAddAlert = async () => {
    if (newAlertTitle.trim() === "") {
      setError("El título de la alerta no puede estar vacío.")
      return
    }
    if (newAlertMessage.trim() === "") {
      setError("El mensaje de la alerta no puede estar vacío.")
      return
    }

    setAddingAlert(true)
    setError(null)

    try {
      const alertData: any = {
        title: newAlertTitle,
        message: newAlertMessage,
        type: newAlertType,
        isActive: true,
        createdAt: serverTimestamp(),
      }

      // Solo agregar campos opcionales si tienen valor
      if (newAlertStartDate) {
        alertData.startDate = new Date(newAlertStartDate)
      } else {
        alertData.startDate = serverTimestamp()
      }
      if (newAlertEndDate) {
        alertData.endDate = new Date(newAlertEndDate)
      }

      const docRef = await addDoc(collection(db, "offerAlerts"), alertData)
      setOfferAlerts((prevAlerts) => [
        { id: docRef.id, ...alertData, createdAt: new Date() } as OfferAlert,
        ...prevAlerts,
      ])

      // Reset form
      setNewAlertTitle("")
      setNewAlertMessage("")
      setNewAlertType("info")
      setNewAlertStartDate("")
      setNewAlertEndDate("")
    } catch (err) {
      console.error("Error adding alert:", err)
      setError("Error al añadir la alerta. Revisa la consola para más detalles.")
    } finally {
      setAddingAlert(false)
    }
  }

  const handleToggleAlertActive = async (alertId: string, currentStatus: boolean) => {
    try {
      const alertRef = doc(db, "offerAlerts", alertId)
      await updateDoc(alertRef, { isActive: !currentStatus })
      setOfferAlerts(offerAlerts.map((alert) => (alert.id === alertId ? { ...alert, isActive: !currentStatus } : alert)))
    } catch (error) {
      console.error("Error updating alert status:", error)
      setError("Error al actualizar el estado de la alerta.")
    }
  }

  const handleDeleteAlert = async (alertId: string, alertTitle: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la alerta "${alertTitle}"?`)) {
      return
    }
    try {
      await deleteDoc(doc(db, "offerAlerts", alertId))
      setOfferAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== alertId))
      setError(null)
    } catch (err) {
      console.error("Error deleting alert:", err)
      setError(`Error al eliminar la alerta "${alertTitle}".`)
    }
  }

  // Funciones para manejar cupones
  const handleAddCoupon = async () => {
    if (newCouponCode.trim() === "") {
      setError("El código del cupón no puede estar vacío.")
      return
    }
    if (newCouponName.trim() === "") {
      setError("El nombre del cupón no puede estar vacío.")
      return
    }
    if (!newCouponDiscountValue || parseFloat(newCouponDiscountValue) <= 0) {
      setError("El valor del descuento debe ser mayor a 0.")
      return
    }

    setAddingCoupon(true)
    setError(null)

    try {
      const couponData: any = {
        code: newCouponCode.toUpperCase(),
        name: newCouponName,
        discountType: newCouponDiscountType,
        discountValue: parseFloat(newCouponDiscountValue),
        usedCount: 0,
        isActive: true,
        applicableTo: newCouponApplicableTo,
        createdAt: serverTimestamp(),
      }

      // Solo agregar campos opcionales si tienen valor
      if (newCouponDescription.trim()) {
        couponData.description = newCouponDescription.trim()
      }
      if (newCouponMinPurchase) {
        couponData.minPurchase = parseFloat(newCouponMinPurchase)
      }
      if (newCouponMaxDiscount) {
        couponData.maxDiscount = parseFloat(newCouponMaxDiscount)
      }
      if (newCouponUsageLimit) {
        couponData.usageLimit = parseInt(newCouponUsageLimit)
      }
      if (newCouponStartDate) {
        couponData.startDate = new Date(newCouponStartDate)
      } else {
        couponData.startDate = serverTimestamp()
      }
      if (newCouponEndDate) {
        couponData.endDate = new Date(newCouponEndDate)
      }

      const docRef = await addDoc(collection(db, "coupons"), couponData)
      setCoupons((prevCoupons) => [
        { id: docRef.id, ...couponData, createdAt: new Date() } as Coupon,
        ...prevCoupons,
      ])

      // Reset form
      setNewCouponCode("")
      setNewCouponName("")
      setNewCouponDescription("")
      setNewCouponDiscountType("percentage")
      setNewCouponDiscountValue("")
      setNewCouponMinPurchase("")
      setNewCouponMaxDiscount("")
      setNewCouponUsageLimit("")
      setNewCouponApplicableTo("all")
      setNewCouponStartDate("")
      setNewCouponEndDate("")
    } catch (err) {
      console.error("Error adding coupon:", err)
      setError("Error al añadir el cupón. Revisa la consola para más detalles.")
    } finally {
      setAddingCoupon(false)
    }
  }

  const handleToggleCouponActive = async (couponId: string, currentStatus: boolean) => {
    try {
      const couponRef = doc(db, "coupons", couponId)
      await updateDoc(couponRef, { isActive: !currentStatus })
      setCoupons(coupons.map((coupon) => (coupon.id === couponId ? { ...coupon, isActive: !currentStatus } : coupon)))
    } catch (error) {
      console.error("Error updating coupon status:", error)
      setError("Error al actualizar el estado del cupón.")
    }
  }

  const handleDeleteCoupon = async (couponId: string, couponName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el cupón "${couponName}"?`)) {
      return
    }
    try {
      await deleteDoc(doc(db, "coupons", couponId))
      setCoupons((prevCoupons) => prevCoupons.filter((coupon) => coupon.id !== couponId))
      setError(null)
    } catch (err) {
      console.error("Error deleting coupon:", err)
      setError(`Error al eliminar el cupón "${couponName}".`)
    }
  }

  // Lógica de filtrado y ordenamiento para todos los productos
  const filteredAllProducts = useMemo(() => {
    const tempProducts = allProducts.filter((product) => {
      const matchesSearchTerm =
        allProductsSearchTerm === "" ||
        product.name.toLowerCase().includes(allProductsSearchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(allProductsSearchTerm.toLowerCase())

      const matchesCategory = allProductsFilterCategory === "all" || product.category === allProductsFilterCategory

      const matchesSeller = allProductsFilterSeller === "all" || product.sellerId === allProductsFilterSeller

      const matchesType =
        allProductsFilterIsService === "all" ||
        (allProductsFilterIsService === "product" && !product.isService) ||
        (allProductsFilterIsService === "service" && product.isService)

      return matchesSearchTerm && matchesCategory && matchesSeller && matchesType
    })

    // Apply sorting
    if (allProductsSortOrder === "reviews_desc") {
      tempProducts.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    } else if (allProductsSortOrder === "price_asc") {
      tempProducts.sort((a, b) => a.price - b.price)
    } else if (allProductsSortOrder === "price_desc") {
      tempProducts.sort((a, b) => b.price - a.price)
    }
    // Default sort by createdAt if no specific sort is applied
    else {
      tempProducts.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
    }

    return tempProducts
  }, [
    allProducts,
    allProductsSearchTerm,
    allProductsFilterCategory,
    allProductsFilterSeller,
    allProductsFilterIsService,
    allProductsSortOrder,
  ])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            No tienes permisos para acceder a esta página. Por favor,{" "}
            <Link href="/login" className="underline">
              inicia sesión
            </Link>{" "}
            con una cuenta de administrador.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-lg text-gray-700">Cargando panel administrativo...</span>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr] bg-gray-100">
      {/* Sidebar */}
      <div className="hidden border-r bg-white lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-purple-600" prefetch={false}>
              <Package2 className="h-6 w-6" />
              <span>Servido Admin</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              {[
                { tab: "overview", label: "Resumen", icon: Home },
                { tab: "users", label: "Usuarios", icon: Users },
                { tab: "categories", label: "Categorías", icon: List },
                { tab: "brands", label: "Marcas", icon: Tag },
                { tab: "allProducts", label: "Todos los Productos", icon: ShoppingCart },
                { tab: "banners", label: "Banners", icon: ImageIcon },
                { tab: "alerts", label: "Alertas", icon: Megaphone },
                { tab: "coupons", label: "Cupones", icon: Percent },
              ].map((item) => (
                <Button
                  key={item.tab}
                  variant={activeTab === item.tab ? "secondary" : "ghost"}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-purple-600 justify-start"
                  onClick={() => setActiveTab(item.tab)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
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
                <Link href="/" className="flex items-center gap-2 font-semibold text-purple-600" prefetch={false}>
                  <Package2 className="h-6 w-6" />
                  <span>Servido Admin</span>
                </Link>
              </div>
              <nav className="grid gap-2 p-4 text-base font-medium">
                {[
                  { tab: "overview", label: "Resumen", icon: Home },
                  { tab: "users", label: "Usuarios", icon: Users },
                  { tab: "categories", label: "Categorías", icon: List },
                  { tab: "brands", label: "Marcas", icon: Tag },
                  { tab: "allProducts", label: "Todos los Productos", icon: ShoppingCart },
                  { tab: "banners", label: "Banners", icon: ImageIcon },
                  { tab: "alerts", label: "Alertas", icon: Megaphone },
                  { tab: "coupons", label: "Cupones", icon: Percent },
                ].map((item) => (
                  <Button
                    key={item.tab}
                    variant={activeTab === item.tab ? "secondary" : "ghost"}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-purple-600 justify-start"
                    onClick={() => {
                      setActiveTab(item.tab) /* Consider closing sheet here */
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-lg md:text-2xl text-gray-800 flex-1 text-center lg:text-left">
            Panel Administrativo
          </h1>
        </header>

        {/* Main Area with Tabs */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Responsive TabsList */}
            <TabsList className="flex w-full overflow-x-auto justify-start sm:justify-center md:justify-start bg-white border-b pb-2">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="categories">Categorías</TabsTrigger>
              <TabsTrigger value="brands">Marcas</TabsTrigger>
              <TabsTrigger value="allProducts">Todos los Productos</TabsTrigger>
              <TabsTrigger value="banners">Banners</TabsTrigger>
              <TabsTrigger value="alerts">Alertas</TabsTrigger>
              <TabsTrigger value="coupons">Cupones</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Categorías</CardTitle>
                    <List className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{categories.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Marcas</CardTitle>
                    <Tag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{brands.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                    <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{products.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Banners Activos</CardTitle>
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{banners.filter(b => b.isActive).length}</div>
                    <p className="text-xs text-muted-foreground">de {banners.length} total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
                    <Megaphone className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{offerAlerts.filter(a => a.isActive).length}</div>
                    <p className="text-xs text-muted-foreground">de {offerAlerts.length} total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Cupones Activos</CardTitle>
                    <Percent className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{coupons.filter(c => c.isActive).length}</div>
                    <p className="text-xs text-muted-foreground">de {coupons.length} total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Usos de Cupones</CardTitle>
                    <Percent className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{coupons.reduce((total, coupon) => total + coupon.usedCount, 0)}</div>
                    <p className="text-xs text-muted-foreground">total de usos</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {" "}
                    {/* Added for responsiveness */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.name} />
                                <AvatarFallback>
                                  <User className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === "admin"
                                    ? "destructive"
                                    : user.role === "seller"
                                      ? "outline"
                                      : "secondary"
                                }
                              >
                                {user.role || "user"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {user.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserActive(user.id, user.isActive)}
                              >
                                {user.isActive ? "Desactivar" : "Activar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Categorías</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddCategory()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">Añadir Nueva Categoría</h3>
                    <div>
                      <Label htmlFor="newCategoryName">Nombre de Categoría</Label>
                      <Input
                        id="newCategoryName"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newCategoryDescription">Descripción (Opcional)</Label>
                      <Textarea
                        id="newCategoryDescription"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                        placeholder="Breve descripción de la categoría..."
                      />
                    </div>
                    {/* Image Upload for Category */}
                    <div>
                      <Label htmlFor="newCategoryImage">Imagen de Categoría (Opcional)</Label>
                      <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                        <div className="w-24 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                          {newCategoryImagePreviewUrl ? (
                            <Image
                              src={newCategoryImagePreviewUrl || "/placeholder.svg"}
                              alt="Vista previa de categoría"
                              layout="fill"
                              objectFit="cover"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="newCategoryImage"
                          type="file"
                          accept="image/*"
                          onChange={handleNewCategoryImageChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 cursor-pointer"
                        />
                        {newCategoryImagePreviewUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveCategoryImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Quitar Imagen
                          </Button>
                        )}
                      </div>
                      {uploadingCategoryImage && (
                        <p className="text-sm text-purple-600 mt-2 flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo imagen...
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={addingCategory || uploadingCategoryImage}>
                      {addingCategory || uploadingCategoryImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Añadir Categoría
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    {" "}
                    {/* Added for responsiveness */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Imagen</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell>
                              {cat.imageUrl ? (
                                <Image
                                  src={cat.imageUrl || "/placeholder.svg"}
                                  alt={cat.name}
                                  width={50}
                                  height={50}
                                  className="rounded object-cover aspect-square"
                                />
                              ) : (
                                <div className="w-[50px] h-[50px] bg-gray-200 rounded flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                              {cat.description || "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteCategory(cat.id, cat.name, cat.imagePath)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Brands Tab */}
            <TabsContent value="brands" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Marcas</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddBrand()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">Añadir Nueva Marca</h3>
                    <div>
                      <Label htmlFor="newBrandName">Nombre de Marca</Label>
                      <Input
                        id="newBrandName"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        required
                      />
                    </div>
                    {/* Image Upload for Brand */}
                    <div>
                      <Label htmlFor="newBrandImage">Logo de Marca (Opcional)</Label>
                      <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                        <div className="w-24 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                          {newBrandImagePreviewUrl ? (
                            <Image
                              src={newBrandImagePreviewUrl || "/placeholder.svg"}
                              alt="Vista previa de marca"
                              layout="fill"
                              objectFit="contain"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="newBrandImage"
                          type="file"
                          accept="image/*"
                          onChange={handleNewBrandImageChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 cursor-pointer"
                        />
                        {newBrandImagePreviewUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveBrandImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Quitar Imagen
                          </Button>
                        )}
                      </div>
                      {uploadingBrandImage && (
                        <p className="text-sm text-purple-600 mt-2 flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo imagen...
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={addingBrand || uploadingBrandImage}>
                      {addingBrand || uploadingBrandImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Añadir Marca
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    {" "}
                    {/* Added for responsiveness */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Logo</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brands.map((brand) => (
                          <TableRow key={brand.id}>
                            <TableCell>
                              {brand.imageUrl ? (
                                <Image
                                  src={brand.imageUrl || "/placeholder.svg"}
                                  alt={brand.name}
                                  width={50}
                                  height={50}
                                  className="rounded object-contain aspect-square"
                                />
                              ) : (
                                <div className="w-[50px] h-[50px] bg-gray-200 rounded flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{brand.name}</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteBrand(brand.id, brand.name, brand.imagePath)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Todos los Productos Tab */}
            <TabsContent value="allProducts" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Todos los Productos de la Plataforma</CardTitle>
                  <CardDescription>
                    Visualiza y gestiona todos los productos y servicios de todos los vendedores.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filtros para todos los productos */}
                  <div className="mb-6 p-4 border rounded-lg bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="allProductsSearchTerm">Buscar</Label>
                      <Input
                        id="allProductsSearchTerm"
                        placeholder="Nombre o descripción..."
                        value={allProductsSearchTerm}
                        onChange={(e) => setAllProductsSearchTerm(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="allProductsFilterCategory">Categoría</Label>
                      <Select value={allProductsFilterCategory} onValueChange={setAllProductsFilterCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las categorías</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="allProductsFilterSeller">Vendedor</Label>
                      <Select value={allProductsFilterSeller} onValueChange={setAllProductsFilterSeller}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los vendedores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los vendedores</SelectItem>
                          {users
                            .filter((user) => user.role === "seller")
                            .map((seller) => (
                              <SelectItem key={seller.id} value={seller.id}>
                                {seller.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="allProductsFilterType">Tipo</Label>
                      <Select value={allProductsFilterIsService} onValueChange={setAllProductsFilterIsService}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="product">Productos</SelectItem>
                          <SelectItem value="service">Servicios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="allProductsSortOrder">Ordenar por</Label>
                      <Select value={allProductsSortOrder} onValueChange={setAllProductsSortOrder}>
                        <SelectTrigger>
                          <SelectValue placeholder="Orden predeterminado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Predeterminado</SelectItem>
                          <SelectItem value="reviews_desc">Reseñas (Mayor a Menor)</SelectItem>
                          <SelectItem value="price_asc">Precio (Menor a Mayor)</SelectItem>
                          <SelectItem value="price_desc">Precio (Mayor a Mayor)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tabla de todos los productos */}
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      {" "}
                      {/* Added for responsiveness */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Vendedor</TableHead>
                            <TableHead>Reseñas</TableHead> {/* New column for reviews */}
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAllProducts.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-10">
                                No se encontraron productos que coincidan con los filtros.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAllProducts.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {product.imageUrl ? (
                                        <Image
                                          src={product.imageUrl || "/placeholder.svg"}
                                          alt={product.name}
                                          width={40}
                                          height={40}
                                          className="object-cover"
                                        />
                                      ) : (
                                        <ShoppingBag className="h-5 w-5 text-gray-400" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium">{product.name}</div>
                                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                        {product.description}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>${product.price.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={product.isService ? "outline" : "secondary"}>
                                    {product.isService ? "Servicio" : "Producto"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={product.seller?.photoURL || "/placeholder.svg"} />
                                      <AvatarFallback>
                                        <User className="h-4 w-4" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="text-sm">{product.seller?.name || "Vendedor desconocido"}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span>{product.averageRating?.toFixed(1) || "N/A"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteAllProduct(product.id, product.name)}
                                    disabled={deletingProductId === product.id}
                                  >
                                    {deletingProductId === product.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Banners Tab */}
            <TabsContent value="banners" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Banners</CardTitle>
                  <CardDescription>
                    Administra los banners que aparecen en la página principal de la aplicación.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddBanner()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">Añadir Nuevo Banner</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newBannerTitle">Título del Banner</Label>
                        <Input
                          id="newBannerTitle"
                          value={newBannerTitle}
                          onChange={(e) => setNewBannerTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newBannerOrder">Orden de Visualización</Label>
                        <Input
                          id="newBannerOrder"
                          type="number"
                          min="1"
                          value={newBannerOrder}
                          onChange={(e) => setNewBannerOrder(parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newBannerDescription">Descripción (Opcional)</Label>
                      <Textarea
                        id="newBannerDescription"
                        value={newBannerDescription}
                        onChange={(e) => setNewBannerDescription(e.target.value)}
                        placeholder="Descripción del banner..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="newBannerLinkUrl">URL de Enlace (Opcional)</Label>
                      <Input
                        id="newBannerLinkUrl"
                        type="url"
                        value={newBannerLinkUrl}
                        onChange={(e) => setNewBannerLinkUrl(e.target.value)}
                        placeholder="https://ejemplo.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newBannerImage">Imagen del Banner</Label>
                      <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                        <div className="w-48 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                          {newBannerImagePreviewUrl ? (
                            <Image
                              src={newBannerImagePreviewUrl}
                              alt="Vista previa del banner"
                              layout="fill"
                              objectFit="cover"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="newBannerImage"
                          type="file"
                          accept="image/*"
                          onChange={handleNewBannerImageChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 cursor-pointer"
                          required
                        />
                        {newBannerImagePreviewUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveBannerImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Quitar Imagen
                          </Button>
                        )}
                      </div>
                      {uploadingBannerImage && (
                        <p className="text-sm text-purple-600 mt-2 flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo imagen...
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={addingBanner || uploadingBannerImage}>
                      {addingBanner || uploadingBannerImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Añadir Banner
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Imagen</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Orden</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {banners.map((banner) => (
                          <TableRow key={banner.id}>
                            <TableCell>
                              <div className="w-32 h-16 relative rounded-md overflow-hidden">
                                <Image
                                  src={banner.imageUrl}
                                  alt={banner.title}
                                  layout="fill"
                                  objectFit="cover"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{banner.title}</div>
                                {banner.description && (
                                  <div className="text-sm text-gray-500">{banner.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{banner.order}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={banner.isActive}
                                  onCheckedChange={() => handleToggleBannerActive(banner.id, banner.isActive)}
                                />
                                <Badge variant={banner.isActive ? "default" : "secondary"}>
                                  {banner.isActive ? "Activo" : "Inactivo"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteBanner(banner.id, banner.title, banner.imagePath)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alertas Tab */}
            <TabsContent value="alerts" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Alertas de Ofertas</CardTitle>
                  <CardDescription>
                    Crea y administra alertas que aparecen en la aplicación para informar sobre ofertas especiales.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddAlert()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">Crear Nueva Alerta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newAlertTitle">Título de la Alerta</Label>
                        <Input
                          id="newAlertTitle"
                          value={newAlertTitle}
                          onChange={(e) => setNewAlertTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newAlertType">Tipo de Alerta</Label>
                        <Select value={newAlertType} onValueChange={(value: "info" | "warning" | "success" | "error") => setNewAlertType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Información</SelectItem>
                            <SelectItem value="warning">Advertencia</SelectItem>
                            <SelectItem value="success">Éxito</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newAlertMessage">Mensaje</Label>
                      <Textarea
                        id="newAlertMessage"
                        value={newAlertMessage}
                        onChange={(e) => setNewAlertMessage(e.target.value)}
                        placeholder="Mensaje de la alerta..."
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newAlertStartDate">Fecha de Inicio</Label>
                        <Input
                          id="newAlertStartDate"
                          type="datetime-local"
                          value={newAlertStartDate}
                          onChange={(e) => setNewAlertStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="newAlertEndDate">Fecha de Fin (Opcional)</Label>
                        <Input
                          id="newAlertEndDate"
                          type="datetime-local"
                          value={newAlertEndDate}
                          onChange={(e) => setNewAlertEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={addingAlert}>
                      {addingAlert ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Crear Alerta
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Mensaje</TableHead>
                          <TableHead>Fechas</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {offerAlerts.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>
                              <Badge
                                variant={
                                  alert.type === "info"
                                    ? "default"
                                    : alert.type === "warning"
                                    ? "secondary"
                                    : alert.type === "success"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {alert.type === "info" && "Info"}
                                {alert.type === "warning" && "Advertencia"}
                                {alert.type === "success" && "Éxito"}
                                {alert.type === "error" && "Error"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{alert.title}</TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">{alert.message}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>Inicio: {alert.startDate?.toDate?.()?.toLocaleDateString() || "Ahora"}</div>
                                {alert.endDate && (
                                  <div>Fin: {alert.endDate?.toDate?.()?.toLocaleDateString()}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={alert.isActive}
                                  onCheckedChange={() => handleToggleAlertActive(alert.id, alert.isActive)}
                                />
                                <Badge variant={alert.isActive ? "default" : "secondary"}>
                                  {alert.isActive ? "Activa" : "Inactiva"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteAlert(alert.id, alert.title)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cupones Tab */}
            <TabsContent value="coupons" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Cupones</CardTitle>
                  <CardDescription>
                    Crea y administra cupones de descuento que los vendedores pueden utilizar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddCoupon()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">Crear Nuevo Cupón</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newCouponCode">Código del Cupón</Label>
                        <Input
                          id="newCouponCode"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                          placeholder="DESCUENTO20"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponName">Nombre del Cupón</Label>
                        <Input
                          id="newCouponName"
                          value={newCouponName}
                          onChange={(e) => setNewCouponName(e.target.value)}
                          placeholder="Descuento del 20%"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newCouponDescription">Descripción (Opcional)</Label>
                      <Textarea
                        id="newCouponDescription"
                        value={newCouponDescription}
                        onChange={(e) => setNewCouponDescription(e.target.value)}
                        placeholder="Descripción del cupón..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="newCouponDiscountType">Tipo de Descuento</Label>
                        <Select value={newCouponDiscountType} onValueChange={(value: "percentage" | "fixed") => setNewCouponDiscountType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                            <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="newCouponDiscountValue">Valor del Descuento</Label>
                        <Input
                          id="newCouponDiscountValue"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCouponDiscountValue}
                          onChange={(e) => setNewCouponDiscountValue(e.target.value)}
                          placeholder={newCouponDiscountType === "percentage" ? "20" : "10.00"}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponApplicableTo">Aplicable a</Label>
                        <Select value={newCouponApplicableTo} onValueChange={(value: "all" | "sellers" | "buyers") => setNewCouponApplicableTo(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="sellers">Solo Vendedores</SelectItem>
                            <SelectItem value="buyers">Solo Compradores</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="newCouponMinPurchase">Compra Mínima (Opcional)</Label>
                        <Input
                          id="newCouponMinPurchase"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCouponMinPurchase}
                          onChange={(e) => setNewCouponMinPurchase(e.target.value)}
                          placeholder="50.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponMaxDiscount">Descuento Máximo (Opcional)</Label>
                        <Input
                          id="newCouponMaxDiscount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCouponMaxDiscount}
                          onChange={(e) => setNewCouponMaxDiscount(e.target.value)}
                          placeholder="100.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponUsageLimit">Límite de Uso (Opcional)</Label>
                        <Input
                          id="newCouponUsageLimit"
                          type="number"
                          min="1"
                          value={newCouponUsageLimit}
                          onChange={(e) => setNewCouponUsageLimit(e.target.value)}
                          placeholder="100"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newCouponStartDate">Fecha de Inicio</Label>
                        <Input
                          id="newCouponStartDate"
                          type="datetime-local"
                          value={newCouponStartDate}
                          onChange={(e) => setNewCouponStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponEndDate">Fecha de Fin (Opcional)</Label>
                        <Input
                          id="newCouponEndDate"
                          type="datetime-local"
                          value={newCouponEndDate}
                          onChange={(e) => setNewCouponEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={addingCoupon}>
                      {addingCoupon ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Crear Cupón
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Descuento</TableHead>
                          <TableHead>Uso</TableHead>
                          <TableHead>Fechas</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupons.map((coupon) => (
                          <TableRow key={coupon.id}>
                            <TableCell>
                              <div className="font-mono font-bold">{coupon.code}</div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{coupon.name}</div>
                                {coupon.description && (
                                  <div className="text-sm text-gray-500">{coupon.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `$${coupon.discountValue.toFixed(2)}`}
                                </div>
                                {coupon.minPurchase && (
                                  <div className="text-sm text-gray-500">Mín: ${coupon.minPurchase.toFixed(2)}</div>
                                )}
                                {coupon.maxDiscount && (
                                  <div className="text-sm text-gray-500">Máx: ${coupon.maxDiscount.toFixed(2)}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{coupon.usedCount} usos</div>
                                {coupon.usageLimit && (
                                  <div className="text-sm text-gray-500">de {coupon.usageLimit}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>Inicio: {coupon.startDate?.toDate?.()?.toLocaleDateString() || "Ahora"}</div>
                                {coupon.endDate && (
                                  <div>Fin: {coupon.endDate?.toDate?.()?.toLocaleDateString()}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={coupon.isActive}
                                  onCheckedChange={() => handleToggleCouponActive(coupon.id, coupon.isActive)}
                                />
                                <Badge variant={coupon.isActive ? "default" : "secondary"}>
                                  {coupon.isActive ? "Activo" : "Inactivo"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteCoupon(coupon.id, coupon.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
