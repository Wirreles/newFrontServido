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
  DollarSign,
  CreditCard,
  TrendingUp,
  Filter,
  Download,
  CheckCircle,
  Clock,
  X,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

import { useState, useEffect, type ChangeEvent, useMemo, useRef } from "react"
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
  getDoc,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { 
  AdminSaleRecord, 
  AdminSalesSummary, 
  SalesFilters, 
  SalesSorting,
  CentralizedPurchase,
  PurchaseItem,
  SellerBankConfig,
  COMMISSION_RATE 
} from "@/types/centralized-payments"
import { 
  calculateCommissionReport, 
  calculateCommissionDistribution, 
  generateCommissionInvoice, 
  processCommissionPayments,
  getAdminSalesData,
  updatePurchasePaymentStatus,
  type CommissionDistribution
} from "@/lib/centralized-payments-api"
import * as XLSX from "xlsx"

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

// Tipos para los datos enriquecidos
interface Purchase {
  id: string
  buyerId: string
  createdAt: any
  paymentId: string
  productIds: string[]
  status: string
  totalAmount: number
  type: string
  vendedorIds: string[]
  products: any[] // <-- Añadido para reflejar el modelo real de Firestore
}
interface UserMap { [key: string]: any }
interface ProductMap { [key: string]: any }

// 1. Definir el tipo para la venta por producto
interface VentaProductoAdmin {
  compraId: string;
  paymentId: string;
  status: string;
  totalAmount: number;
  fechaCompra: string;
  buyerId: string;
  compradorNombre: string;
  compradorEmail: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  vendedorId: string;
  vendedorNombre: string;
  vendedorEmail: string;
  pagado: boolean; // <-- nuevo campo
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

  // Estados para la pestaña de Ventas
  const [salesData, setSalesData] = useState<VentaProductoAdmin[]>([])
  const [salesSummary, setSalesSummary] = useState({
    totalVentas: 0,
    totalComisiones: 0,
    totalPendientePago: 0,
    totalPagado: 0,
    ventasPorVendedor: [] as {
      vendedorId: string;
      vendedorNombre: string;
      totalVentas: number;
      totalComisiones: number;
    }[]
  })
  const [salesFilters, setSalesFilters] = useState<SalesFilters>({
    estadoPago: 'all',
    estadoEnvio: 'all'
  })
  const [salesSorting, setSalesSorting] = useState<SalesSorting>({
    field: 'fecha',
    order: 'desc'
  })
  const [loadingSales, setLoadingSales] = useState(false)
  const [markingPayment, setMarkingPayment] = useState<string | null>(null)
  const [updatingShipping, setUpdatingShipping] = useState<string | null>(null)
  
  // Estados para modal de marcado manual de pagos
  const [paymentMarkingModal, setPaymentMarkingModal] = useState<{
    isOpen: boolean
    compraId: string
    vendedorId: string
    vendedorNombre: string
    monto: number
  }>({
    isOpen: false,
    compraId: '',
    vendedorId: '',
    vendedorNombre: '',
    monto: 0
  })
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'mercadopago' | 'cash'>('bank_transfer')
  
  // Estados para historial de pagos manuales
  const [manualPayments, setManualPayments] = useState<any[]>([])
  const [loadingManualPayments, setLoadingManualPayments] = useState(false)
  
  // Estados para notificaciones
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  
  // Estados para acciones masivas
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedSales, setSelectedSales] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Estados para reportes de comisiones
  const [commissionReport, setCommissionReport] = useState<any>(null)
  const [commissionDistribution, setCommissionDistribution] = useState<CommissionDistribution[]>([])
  const [loadingCommissions, setLoadingCommissions] = useState(false)
  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [viewByPurchase, setViewByPurchase] = useState(false)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [usersMap, setUsersMap] = useState<UserMap>({})
  const [productsMap, setProductsMap] = useState<ProductMap>({})
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  const [filters, setFilters] = useState({
    estado: 'all',
    vendedor: '',
    comprador: '',
    producto: '',
    compra: '',
    fechaDesde: '',
    fechaHasta: ''
  })

  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Justo después de los useState
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [showSellerModal, setShowSellerModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingAdmin(true)
      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'))
      const users: UserMap = {}
      usersSnap.forEach(doc => { users[doc.id] = doc.data() })
      setUsersMap(users)
      console.log('USERS:', users)
      // Fetch products
      const productsSnap = await getDocs(collection(db, 'products'))
      const products: ProductMap = {}
      productsSnap.forEach(doc => { products[doc.id] = doc.data() })
      setProductsMap(products)
      console.log('PRODUCTS:', products)
      // Fetch purchases
      const purchasesSnap = await getDocs(collection(db, 'purchases'))
      const purchases: Purchase[] = purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Purchase)
      console.log('PURCHASES:', purchases)
      setPurchases(purchases)
      setLoadingAdmin(false)
    }
    fetchData()
  }, [])

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

  useEffect(() => {
    if (activeTab === "sales" && currentUser) {
      fetchSalesData()
    }
    if (activeTab === "manual-payments" && currentUser) {
      fetchManualPayments()
    }
    if (activeTab === "notifications" && currentUser) {
      fetchNotifications()
    }
    if (activeTab === "commissions" && currentUser) {
      fetchCommissionReport()
    }
  }, [activeTab, currentUser])

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

      // Cargar datos de ventas si está en la pestaña de ventas
      if (activeTab === "sales") {
        await fetchSalesData()
      }
    } catch (err) {
      console.error("Error fetching admin data:", err)
      setError("Error al cargar los datos del panel. Verifica tu conexión y permisos.")
    } finally {
      setLoading(false)
    }
  }

  const fetchSalesData = async () => {
    setLoadingSales(true)
    try {
      // Obtener todas las compras
      const purchasesSnap = await getDocs(collection(db, 'purchases'))
      const purchases = purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Purchase[]
      // Desglosar productos de cada compra
      const usersMap: { [key: string]: any } = users.reduce((acc, u) => { acc[u.id] = u; return acc }, {} as { [key: string]: any })
      const productsMap: { [key: string]: any } = products.reduce((acc, p) => { acc[p.id] = p; return acc }, {} as { [key: string]: any })
      const ventasPorProducto: VentaProductoAdmin[] = purchases.flatMap(compra => {
        if (!Array.isArray(compra.products)) return []
        return compra.products.map((prod: any) => ({
          compraId: compra.id || '',
          paymentId: compra.paymentId || '',
          status: compra.status || '',
          totalAmount: compra.totalAmount || 0,
          fechaCompra: compra.createdAt?.toDate?.() ? compra.createdAt.toDate().toISOString() : (typeof compra.createdAt === 'string' ? compra.createdAt : ''),
          buyerId: compra.buyerId || '',
          compradorNombre: usersMap?.[compra.buyerId]?.name || '',
          compradorEmail: usersMap?.[compra.buyerId]?.email || '',
          productId: prod?.productId || '',
          productName: prod?.nombre || productsMap?.[prod?.productId]?.name || '',
          productPrice: prod?.precio || productsMap?.[prod?.productId]?.price || 0,
          quantity: prod?.quantity || 0,
          vendedorId: prod?.vendedorId || '',
          vendedorNombre: usersMap?.[prod?.vendedorId]?.name || '',
          vendedorEmail: usersMap?.[prod?.vendedorId]?.email || '',
          pagado: typeof prod?.pagado === 'boolean' ? prod.pagado : false,
        }))
      })
      setSalesData(ventasPorProducto)
      setPurchases(purchases)

      // Calcular métricas de ventas
      const COMMISSION_RATE = 0.12;
      const approvedPurchases = purchases.filter(p => p.status === 'approved');
      const totalVentas = approvedPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalComisiones = totalVentas * COMMISSION_RATE;
      let totalPagado = 0;
      let totalPendiente = 0;
      approvedPurchases.forEach(p => {
        if (Array.isArray(p.products)) {
          p.products.forEach(prod => {
            const monto = (prod.precio || prod.price || 0) * (prod.quantity || 1);
            if (prod.pagado) {
              totalPagado += monto * (1 - COMMISSION_RATE);
            } else {
              totalPendiente += monto * (1 - COMMISSION_RATE);
            }
          });
        }
      });
      if (totalPagado === 0 && totalPendiente === 0) {
        totalPendiente = totalVentas - totalComisiones;
      }

      // Calcular ventas por vendedor
      const ventasPorVendedorMap: { [vendedorId: string]: { vendedorNombre: string, totalVentas: number, totalComisiones: number } } = {};
      ventasPorProducto.forEach(vp => {
        if (!vp.vendedorId) return;
        if (!ventasPorVendedorMap[vp.vendedorId]) {
          ventasPorVendedorMap[vp.vendedorId] = {
            vendedorNombre: vp.vendedorNombre || 'Desconocido',
            totalVentas: 0,
            totalComisiones: 0,
          };
        }
        ventasPorVendedorMap[vp.vendedorId].totalVentas += vp.productPrice * vp.quantity;
        ventasPorVendedorMap[vp.vendedorId].totalComisiones += vp.productPrice * vp.quantity * COMMISSION_RATE;
      });
      
      const ventasPorVendedor = Object.entries(ventasPorVendedorMap).map(([vendedorId, data]) => ({
        vendedorId,
        vendedorNombre: data.vendedorNombre,
        totalVentas: data.totalVentas,
        totalComisiones: data.totalComisiones,
      }));

      setSalesSummary({
        totalVentas,
        totalComisiones,
        totalPendientePago: totalPendiente,
        totalPagado,
        ventasPorVendedor
      });
    } catch (err) {
      console.error('Error fetching sales data:', err)
      setError('Error al cargar los datos de ventas')
    } finally {
      setLoadingSales(false)
    }
  }

  // Función para abrir el modal de marcado de pago
  const openPaymentMarkingModal = (sale: VentaProductoAdmin) => {
    setPaymentMarkingModal({
      isOpen: true,
      compraId: sale.compraId,
      vendedorId: sale.vendedorId,
      vendedorNombre: sale.vendedorNombre,
      monto: sale.totalAmount
    })
    setPaymentNotes('')
    setPaymentMethod('bank_transfer')
  }

  // Función para cerrar el modal de marcado de pago
  const closePaymentMarkingModal = () => {
    setPaymentMarkingModal({
      isOpen: false,
      compraId: '',
      vendedorId: '',
      vendedorNombre: '',
      monto: 0
    })
    setPaymentNotes('')
  }

  // Función mejorada para marcar pago como pagado
  const handleMarkPaymentAsPaid = async () => {
    if (!currentUser || !paymentMarkingModal.isOpen) return
    
    const { compraId, vendedorId } = paymentMarkingModal
    setMarkingPayment(`${compraId}-${vendedorId}`)
    
    try {
      // Usar la función de la API centralizada
      await updatePurchasePaymentStatus(
        compraId,
        vendedorId,
        'pagado',
        currentUser.firebaseUser.uid
      )

      // Crear registro de pago manual en Firebase
      const paymentRecord = {
        compraId,
        vendedorId,
        vendedorNombre: paymentMarkingModal.vendedorNombre,
        monto: paymentMarkingModal.monto,
        metodoPago: paymentMethod,
        notas: paymentNotes.trim() || 'Pago marcado manualmente por administrador',
        administradorId: currentUser.firebaseUser.uid,
        administradorNombre: currentUser.firebaseUser.displayName || 'Administrador',
        fechaPago: new Date().toISOString(),
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, "manualPayments"), paymentRecord)

      // Crear notificación para el vendedor
      const notificationData = {
        userId: vendedorId,
        type: "payment_completed",
        title: "Pago Procesado",
        description: `Se ha procesado tu pago de $${paymentMarkingModal.monto.toFixed(2)} por ${paymentMethod === 'bank_transfer' ? 'transferencia bancaria' : paymentMethod === 'mercadopago' ? 'MercadoPago' : 'efectivo'}`,
        compraId,
        monto: paymentMarkingModal.monto,
        metodoPago: paymentMethod,
        isRead: false,
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, "notifications"), notificationData)

      // Actualizar datos locales
      await fetchSalesData()
      await fetchManualPayments()
      
      setError(null)
      closePaymentMarkingModal()
      
    } catch (err) {
      console.error("Error marking payment as paid:", err)
      setError("Error al marcar el pago como realizado")
    } finally {
      setMarkingPayment(null)
    }
  }

  const fetchCommissionReport = async () => {
    setLoadingCommissions(true)
    try {
      const startDate = new Date(reportStartDate)
      const endDate = new Date(reportEndDate)
      
      const report = await calculateCommissionReport(startDate, endDate)
      setCommissionReport(report)
      
      const distribution = await calculateCommissionDistribution()
      setCommissionDistribution(distribution)
      
    } catch (err) {
      console.error("Error fetching commission report:", err)
      setError("Error al cargar el reporte de comisiones")
    } finally {
      setLoadingCommissions(false)
    }
  }

  // Función para cargar historial de pagos manuales
  const fetchManualPayments = async () => {
    setLoadingManualPayments(true)
    try {
      const q = query(
        collection(db, "manualPayments"),
        orderBy("fechaPago", "desc")
      )
      const querySnapshot = await getDocs(q)
      const payments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setManualPayments(payments)
    } catch (err) {
      console.error("Error fetching manual payments:", err)
      setError("Error al cargar el historial de pagos manuales")
    } finally {
      setLoadingManualPayments(false)
    }
  }

  // Función para cargar notificaciones del sistema
  const fetchNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const q = query(
        collection(db, "notifications"),
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(q)
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setNotifications(notificationsData)
    } catch (err) {
      console.error("Error fetching notifications:", err)
      setError("Error al cargar las notificaciones")
    } finally {
      setLoadingNotifications(false)
    }
  }

  const handleProcessPayment = async (vendedorId: string, paymentMethod: 'bank_transfer' | 'mercadopago' | 'cash') => {
    if (!currentUser) return
    
    setMarkingPayment(vendedorId)
    try {
      const result = await processCommissionPayments(vendedorId, currentUser.firebaseUser.uid, paymentMethod)
      
      if (result.success) {
        setError(null)
        // Actualizar datos
        await fetchSalesData()
        await fetchCommissionReport()
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error("Error processing payment:", err)
      setError("Error al procesar el pago")
    } finally {
      setMarkingPayment(null)
    }
  }

  // Función para actualizar el estado de envío
  const handleUpdateShippingStatus = async (compraId: string, newStatus: 'pendiente' | 'en_preparacion' | 'enviado' | 'entregado' | 'cancelado') => {
    if (!currentUser) return
    
    setUpdatingShipping(compraId)
    try {
      // Actualizar en Firebase
      const purchaseRef = doc(db, 'centralizedPurchases', compraId)
      await updateDoc(purchaseRef, {
        estadoEnvio: newStatus,
        updatedAt: serverTimestamp()
      })

      // Crear notificación para el comprador
      const sale = salesData.find(s => s.compraId === compraId)
      if (sale) {
        const notificationData = {
          userId: sale.compradorEmail,
          type: "shipping_update",
          title: "Actualización de Envío",
          description: `El estado de tu pedido ha cambiado a: ${
            newStatus === 'pendiente' ? 'Pendiente' :
            newStatus === 'en_preparacion' ? 'En Preparación' :
            newStatus === 'enviado' ? 'Enviado' :
            newStatus === 'entregado' ? 'Entregado' :
            'Cancelado'
          }`,
          compraId,
          estadoEnvio: newStatus,
          isRead: false,
          createdAt: serverTimestamp()
        }

        await addDoc(collection(db, "notifications"), notificationData)
      }

      // Actualizar datos locales
      await fetchSalesData()
      setError(null)
      
    } catch (err) {
      console.error("Error updating shipping status:", err)
      setError("Error al actualizar el estado de envío")
    } finally {
      setUpdatingShipping(null)
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

  // Funciones para acciones masivas
  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(u => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    }
  }

  const handleBulkUserAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) {
      setError("No hay usuarios seleccionados")
      return
    }

    const confirmMessage = 
      action === 'activate' ? `¿Activar ${selectedUsers.length} usuarios?` :
      action === 'deactivate' ? `¿Desactivar ${selectedUsers.length} usuarios?` :
      `¿Eliminar ${selectedUsers.length} usuarios? Esta acción no se puede deshacer.`

    if (!window.confirm(confirmMessage)) return

    setBulkActionLoading(true)
    try {
      for (const userId of selectedUsers) {
        if (action === 'delete') {
          await deleteDoc(doc(db, "users", userId))
        } else {
          await updateDoc(doc(db, "users", userId), {
            isActive: action === 'activate'
          })
        }
      }

      if (action === 'delete') {
        setUsers(users.filter(u => !selectedUsers.includes(u.id)))
      } else {
        setUsers(users.map(u => 
          selectedUsers.includes(u.id) 
            ? { ...u, isActive: action === 'activate' }
            : u
        ))
      }

      setSelectedUsers([])
      setError(null)
    } catch (err) {
      console.error("Error in bulk action:", err)
      setError("Error al realizar la acción masiva")
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredAllProducts.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId])
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId))
    }
  }

  const handleBulkProductAction = async (action: 'delete') => {
    if (selectedProducts.length === 0) {
      setError("No hay productos seleccionados")
      return
    }

    if (!window.confirm(`¿Eliminar ${selectedProducts.length} productos? Esta acción no se puede deshacer.`)) return

    setBulkActionLoading(true)
    try {
      for (const productId of selectedProducts) {
        await deleteDoc(doc(db, "products", productId))
      }

      setAllProducts(allProducts.filter(p => !selectedProducts.includes(p.id)))
      setSelectedProducts([])
      setError(null)
    } catch (err) {
      console.error("Error in bulk product action:", err)
      setError("Error al realizar la acción masiva")
    } finally {
      setBulkActionLoading(false)
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

  // Filtros visuales robustos sobre salesData
  const getFilteredSales = () => {
    return salesData.filter(sale => {
      // Filtro por estado de pago
      if (salesFilters.estadoPago && salesFilters.estadoPago !== 'all') {
        if (salesFilters.estadoPago === 'pendiente' && sale.pagado) return false
        if (salesFilters.estadoPago === 'pagado' && !sale.pagado) return false
      }
      
      // Filtro por estado de envío
      if (salesFilters.estadoEnvio && salesFilters.estadoEnvio !== 'all' && sale.status !== salesFilters.estadoEnvio) return false
      
      // Filtro por vendedor
      if (salesFilters.vendedorId && sale.vendedorId !== salesFilters.vendedorId) return false
      
      // Filtro por fecha
      if (salesFilters.fechaDesde) {
        const fechaCompra = new Date(sale.fechaCompra)
        const desde = new Date(salesFilters.fechaDesde)
        if (fechaCompra < desde) return false
      }
      if (salesFilters.fechaHasta) {
        const fechaCompra = new Date(sale.fechaCompra)
        const hasta = new Date(salesFilters.fechaHasta)
        if (fechaCompra > hasta) return false
      }
      
      // Filtro por monto
      if (salesFilters.montoMinimo && sale.productPrice < salesFilters.montoMinimo) return false
      if (salesFilters.montoMaximo && sale.productPrice > salesFilters.montoMaximo) return false
      
      return true
    })
  }
  
  const filteredSales = getFilteredSales()

  // Paginación
  const totalPages = Math.ceil(filteredSales.length / rowsPerPage)
  const paginatedSales = filteredSales.slice((page - 1) * rowsPerPage, page * rowsPerPage)
  
  // Exportar a Excel solo lo filtrado y robusto
  const handleExportExcel = () => {
    const exportData = filteredSales.map(sale => ({
      compraId: sale.compraId || 'N/A',
      paymentId: sale.paymentId || 'N/A',
      estado: sale.status || 'N/A',
      fechaCompra: sale.fechaCompra || 'N/A',
      buyerId: sale.buyerId || 'N/A',
      comprador: sale.compradorNombre || sale.buyerId || 'N/A',
      productId: sale.productId || 'N/A',
      producto: sale.productName || 'N/A',
      precio: sale.productPrice ?? 'N/A',
      cantidad: sale.quantity ?? 'N/A',
      vendedorId: sale.vendedorId || 'N/A',
      vendedor: sale.vendedorNombre || sale.vendedorId || 'N/A',
      totalCompra: sale.totalAmount ?? 'N/A'
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
    XLSX.writeFile(wb, 'ventas_admin.xlsx')
  }

  // 1. Agrupar ventas por compraId
  const comprasAgrupadas = useMemo(() => {
    const agrupadas: { [compraId: string]: { compra: Purchase, productos: VentaProductoAdmin[] } } = {}
    purchases.forEach(compra => {
      const productos = salesData.filter(s => s.compraId === compra.id)
      if (productos.length > 0) {
        agrupadas[compra.id] = { compra, productos }
      }
    })
    return agrupadas
  }, [purchases, salesData])

  // Handler temporal para el botón (al inicio del componente AdminDashboard)
  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowPurchaseModal(true);
  }

  const handleViewSeller = (vendedorId: string) => {
    setSelectedSellerId(vendedorId);
    setShowSellerModal(true);
  }

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

  if (loadingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-lg text-gray-700">Cargando panel administrativo...</span>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen w-full overflow-x-hidden max-w-full lg:grid-cols-[280px_1fr] bg-gray-100">
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
                { tab: "sales", label: "Ventas", icon: DollarSign },
                { tab: "manual-payments", label: "Pagos Manuales", icon: TrendingUp },
                { tab: "notifications", label: "Notificaciones", icon: AlertTriangle },
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
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
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
                  { tab: "sales", label: "Ventas", icon: DollarSign },
                  { tab: "manual-payments", label: "Pagos Manuales", icon: TrendingUp },
                  { tab: "notifications", label: "Notificaciones", icon: AlertTriangle },
                  { tab: "banners", label: "Banners", icon: ImageIcon },
                  { tab: "alerts", label: "Alertas", icon: Megaphone },
                  { tab: "coupons", label: "Cupones", icon: Percent },
                ].map((item) => (
                  <Button
                    key={item.tab}
                    variant={activeTab === item.tab ? "secondary" : "ghost"}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-purple-600 justify-start"
                    onClick={() => {
                      setActiveTab(item.tab)
                      setIsMobileMenuOpen(false)
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
            <TabsList className="flex w-full overflow-x-auto justify-start sm:justify-center md:justify-start bg-white border-b pb-2 hidden lg:flex">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="categories">Categorías</TabsTrigger>
              <TabsTrigger value="brands">Marcas</TabsTrigger>
              <TabsTrigger value="allProducts">Todos los Productos</TabsTrigger>
              <TabsTrigger value="sales">Ventas y Comisiones</TabsTrigger>
              <TabsTrigger value="manual-payments">Pagos Manuales</TabsTrigger>
              <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
              <TabsTrigger value="banners">Banners</TabsTrigger>
              <TabsTrigger value="alerts">Alertas</TabsTrigger>
              <TabsTrigger value="coupons">Cupones</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4">
              <div className="space-y-6">
                {/* Métricas principales */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {users.filter(u => u.isActive).length} activos
                      </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{products.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {products.filter(p => !p.isService).length} productos, {products.filter(p => p.isService).length} servicios
                      </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">${salesSummary.totalVentas.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        ${salesSummary.totalComisiones.toFixed(2)} en comisiones
                      </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Notificaciones</CardTitle>
                      <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{notifications.filter(n => !n.isRead).length}</div>
                      <p className="text-xs text-muted-foreground">
                        {notifications.length} total
                      </p>
                  </CardContent>
                </Card>
                </div>

                {/* Distribución por categorías */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución de Productos por Categoría</CardTitle>
                    <CardDescription>
                      Análisis de la distribución de productos en el marketplace
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categories.map((category) => {
                        const categoryProducts = products.filter(p => p.category === category.name)
                        const percentage = products.length > 0 ? (categoryProducts.length / products.length) * 100 : 0
                        return (
                          <div key={category.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-blue-500 rounded"></div>
                              <span className="text-sm font-medium">{category.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600 w-16 text-right">
                                {categoryProducts.length} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Estadísticas adicionales */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Categorías</CardTitle>
                      <List className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{categories.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Marcas</CardTitle>
                      <Tag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{brands.length}</div>
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
                    <CardTitle className="text-sm font-medium">Cupones Activos</CardTitle>
                    <Percent className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{coupons.filter(c => c.isActive).length}</div>
                      <p className="text-xs text-muted-foreground">
                        {coupons.reduce((total, coupon) => total + coupon.usedCount, 0)} usos totales
                      </p>
                  </CardContent>
                </Card>
                </div>

                {/* Top vendedores */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Vendedores</CardTitle>
                    <CardDescription>
                      Vendedores con más ventas en el período actual
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {salesSummary.ventasPorVendedor && salesSummary.ventasPorVendedor.length > 0 ? (
                        salesSummary.ventasPorVendedor
                          .sort((a, b) => b.totalVentas - a.totalVentas)
                          .slice(0, 5)
                          .map((vendedor, index) => (
                            <div key={vendedor.vendedorId} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{vendedor.vendedorNombre}</div>
                                  <div className="text-sm text-gray-500">${vendedor.totalVentas.toFixed(2)} en ventas</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-green-600">${vendedor.totalComisiones.toFixed(2)}</div>
                                <div className="text-sm text-gray-500">comisiones</div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No hay datos de ventas disponibles
                        </div>
                      )}
                    </div>
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
                  {/* Acciones masivas */}
                  {selectedUsers.length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">
                          {selectedUsers.length} usuario(s) seleccionado(s)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleBulkUserAction('activate')}
                            disabled={bulkActionLoading}
                          >
                            {bulkActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span className="ml-2">Activar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkUserAction('deactivate')}
                            disabled={bulkActionLoading}
                          >
                            <X className="h-4 w-4" />
                            <span className="ml-2">Desactivar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBulkUserAction('delete')}
                            disabled={bulkActionLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2">Eliminar</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px] p-1 md:p-2">
                            <Checkbox
                              checked={selectedUsers.length === users.length && users.length > 0}
                              onCheckedChange={handleSelectAllUsers}
                            />
                          </TableHead>
                          <TableHead className="w-[50px] p-1 md:p-2">Perfil</TableHead>
                          <TableHead className="p-1 md:p-2">Nombre</TableHead>
                          <TableHead className="p-1 md:p-2 max-w-[100px] truncate">Email</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Rol</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Estado</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2">
                              <Checkbox
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="p-1 md:p-2">
                              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                                <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.name} />
                                <AvatarFallback>
                                  <User className="h-4 w-4 md:h-5 md:w-5" />
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[80px] truncate">{user.name}</TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[100px] truncate">{user.email}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
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
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {user.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
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
                          <TableHead className="w-[40px] p-1 md:p-2">Imagen</TableHead>
                          <TableHead className="p-1 md:p-2">Nombre</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Descripción</TableHead>
                          <TableHead className="p-1 md:p-2">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((cat) => (
                          <TableRow key={cat.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2">
                              {cat.imageUrl ? (
                                <Image
                                  src={cat.imageUrl || "/placeholder.svg"}
                                  alt={cat.name}
                                  width={36}
                                  height={36}
                                  className="rounded object-cover aspect-square md:w-[50px] md:h-[50px]"
                                />
                              ) : (
                                <div className="w-[36px] h-[36px] md:w-[50px] md:h-[50px] bg-gray-200 rounded flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="p-1 md:p-2 font-medium">{cat.name}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2 text-sm text-muted-foreground truncate max-w-xs">{cat.description || "-"}</TableCell>
                            <TableCell className="p-1 md:p-2">
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
                            <TableHead className="p-1 md:p-2">Producto</TableHead>
                            <TableHead className="p-1 md:p-2">Precio</TableHead>
                            <TableHead className="hidden md:table-cell p-1 md:p-2">Tipo</TableHead>
                            <TableHead className="p-1 md:p-2">Vendedor</TableHead>
                            <TableHead className="hidden md:table-cell p-1 md:p-2">Reseñas</TableHead>
                            <TableHead className="hidden md:table-cell p-1 md:p-2">Acciones</TableHead>
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
                              <TableRow key={product.id} className="text-xs md:text-sm">
                                <TableCell className="p-1 md:p-2">
                                  <div className="flex items-center space-x-2 md:space-x-3">
                                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {product.imageUrl ? (
                                        <Image
                                          src={product.imageUrl || "/placeholder.svg"}
                                          alt={product.name}
                                          width={32}
                                          height={32}
                                          className="object-cover md:w-[40px] md:h-[40px]"
                                        />
                                      ) : (
                                        <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium max-w-[80px] truncate">{product.name}</div>
                                      <div className="text-xs text-gray-500 truncate max-w-[100px]">{product.description}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="p-1 md:p-2">${product.price.toFixed(2)}</TableCell>
                                <TableCell className="hidden md:table-cell p-1 md:p-2">
                                  <Badge variant={product.isService ? "outline" : "secondary"}>
                                    {product.isService ? "Servicio" : "Producto"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="p-1 md:p-2">
                                  <div className="flex items-center space-x-1 md:space-x-2">
                                    <Avatar className="h-6 w-6 md:h-8 md:w-8">
                                      <AvatarImage src={product.seller?.photoURL || "/placeholder.svg"} />
                                      <AvatarFallback>
                                        <User className="h-3 w-3 md:h-4 md:w-4" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="text-xs md:text-sm max-w-[80px] truncate">{product.seller?.name || "Vendedor desconocido"}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell p-1 md:p-2">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span>{product.averageRating?.toFixed(1) || "N/A"}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell p-1 md:p-2">
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
                    className="mb-6 flex flex-col gap-2 md:p-4 border rounded-lg"
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
                          <TableHead className="p-1 md:p-2">Imagen</TableHead>
                          <TableHead className="p-1 md:p-2">Título</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Orden</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Estado</TableHead>
                          <TableHead className="p-1 md:p-2">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {banners.map((banner) => (
                          <TableRow key={banner.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2">
                              <div className="w-20 h-10 md:w-32 md:h-16 relative rounded-md overflow-hidden">
                                <Image src={banner.imageUrl} alt={banner.title} layout="fill" objectFit="cover" />
                              </div>
                            </TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[100px] truncate">
                                <div className="font-medium">{banner.title}</div>
                              {banner.description && <div className="text-xs text-gray-500 truncate">{banner.description}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">{banner.order}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div className="flex items-center gap-2">
                                <Switch checked={banner.isActive} onCheckedChange={() => handleToggleBannerActive(banner.id, banner.isActive)} />
                                <Badge variant={banner.isActive ? "default" : "secondary"}>{banner.isActive ? "Activo" : "Inactivo"}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 md:p-2">
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteBanner(banner.id, banner.title, banner.imagePath)}>
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
                    className="mb-6 flex flex-col gap-2 md:p-4 border rounded-lg"
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
                          <TableHead className="p-1 md:p-2">Tipo</TableHead>
                          <TableHead className="p-1 md:p-2">Título</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Mensaje</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Fechas</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Estado</TableHead>
                          <TableHead className="p-1 md:p-2">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {offerAlerts.map((alert) => (
                          <TableRow key={alert.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2">
                              <Badge variant={alert.type === "info" ? "default" : alert.type === "warning" ? "secondary" : alert.type === "success" ? "default" : "destructive"}>
                                {alert.type === "info" && "Info"}
                                {alert.type === "warning" && "Advertencia"}
                                {alert.type === "success" && "Éxito"}
                                {alert.type === "error" && "Error"}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[80px] truncate font-medium">{alert.title}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2 max-w-[120px] truncate">{alert.message}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2 text-xs">
                                <div>Inicio: {alert.startDate?.toDate?.()?.toLocaleDateString() || "Ahora"}</div>
                              {alert.endDate && <div>Fin: {alert.endDate?.toDate?.()?.toLocaleDateString()}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div className="flex items-center gap-2">
                                <Switch checked={alert.isActive} onCheckedChange={() => handleToggleAlertActive(alert.id, alert.isActive)} />
                                <Badge variant={alert.isActive ? "default" : "secondary"}>{alert.isActive ? "Activa" : "Inactiva"}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 md:p-2">
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteAlert(alert.id, alert.title)}>
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
                    className="mb-6 flex flex-col gap-2 md:p-4 border rounded-lg"
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
                          <TableHead className="p-1 md:p-2">Código</TableHead>
                          <TableHead className="p-1 md:p-2">Nombre</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Descuento</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Uso</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Fechas</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">Estado</TableHead>
                          <TableHead className="p-1 md:p-2">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupons.map((coupon) => (
                          <TableRow key={coupon.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2 font-mono font-bold max-w-[60px] truncate">{coupon.code}</TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[80px] truncate">
                                <div className="font-medium">{coupon.name}</div>
                              {coupon.description && <div className="text-xs text-gray-500 truncate">{coupon.description}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div className="font-medium">{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `$${coupon.discountValue.toFixed(2)}`}</div>
                              {coupon.minPurchase && <div className="text-xs text-gray-500">Mín: ${coupon.minPurchase.toFixed(2)}</div>}
                              {coupon.maxDiscount && <div className="text-xs text-gray-500">Máx: ${coupon.maxDiscount.toFixed(2)}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div>{coupon.usedCount} usos</div>
                              {coupon.usageLimit && <div className="text-xs text-gray-500">de {coupon.usageLimit}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2 text-xs">
                              <div>Inicio: {coupon.startDate?.toDate?.()?.toLocaleDateString() || "Ahora"}</div>
                              {coupon.endDate && (
                                <div>Fin: {coupon.endDate?.toDate?.()?.toLocaleDateString()}</div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div className="flex items-center gap-2">
                                <Switch checked={coupon.isActive} onCheckedChange={() => handleToggleCouponActive(coupon.id, coupon.isActive)} />
                                <Badge variant={coupon.isActive ? "default" : "secondary"}>{coupon.isActive ? "Activo" : "Inactivo"}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 md:p-2">
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteCoupon(coupon.id, coupon.name)}>
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

            {/* Ventas y Comisiones Tab */}
            <TabsContent value="sales" className="mt-4">
              <div className="space-y-6">
                {/* Resumen de Ventas */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${salesSummary.totalVentas.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">Valor bruto de todas las ventas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Comisiones</CardTitle>
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${salesSummary.totalComisiones.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">12% de comisión total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Pendiente de Pago</CardTitle>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${salesSummary.totalPendientePago.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">A pagar a vendedores</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Pagado</CardTitle>
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${salesSummary.totalPagado.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">Ya pagado a vendedores</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Filtros y Ordenamiento */}
                <Card>
                  <CardHeader>
                    <CardTitle>Filtros y Ordenamiento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Primera fila de filtros */}
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                              <div>
                          <Label htmlFor="filterEstadoPago">Estado de Pago</Label>
                          <Select 
                            value={salesFilters.estadoPago} 
                            onValueChange={(value) => setSalesFilters({...salesFilters, estadoPago: value as any})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="pagado">Pagado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                                </div>
                        <div>
                          <Label htmlFor="filterEstadoEnvio">Estado de Envío</Label>
                          <Select 
                            value={salesFilters.estadoEnvio || "all"} 
                            onValueChange={(value) => setSalesFilters({...salesFilters, estadoEnvio: value === "all" ? undefined : value as any})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en_preparacion">En Preparación</SelectItem>
                              <SelectItem value="enviado">Enviado</SelectItem>
                              <SelectItem value="entregado">Entregado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="filterVendedor">Vendedor</Label>
                          <Select 
                            value={salesFilters.vendedorId || "all"} 
                            onValueChange={(value) => setSalesFilters({...salesFilters, vendedorId: value === "all" ? undefined : value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {salesSummary.ventasPorVendedor.map((vendedor) => (
                                <SelectItem key={vendedor.vendedorId} value={vendedor.vendedorId}>
                                  {vendedor.vendedorNombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="filterFechaDesde">Fecha Desde</Label>
                          <Input
                            id="filterFechaDesde"
                            type="date"
                            value={salesFilters.fechaDesde || ""}
                            onChange={(e) => setSalesFilters({...salesFilters, fechaDesde: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="filterFechaHasta">Fecha Hasta</Label>
                          <Input
                            id="filterFechaHasta"
                            type="date"
                            value={salesFilters.fechaHasta || ""}
                            onChange={(e) => setSalesFilters({...salesFilters, fechaHasta: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      {/* Segunda fila de filtros */}
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div>
                          <Label htmlFor="filterMontoMinimo">Monto Mínimo</Label>
                          <Input
                            id="filterMontoMinimo"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={salesFilters.montoMinimo || ""}
                            onChange={(e) => setSalesFilters({...salesFilters, montoMinimo: e.target.value ? parseFloat(e.target.value) : undefined})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="filterMontoMaximo">Monto Máximo</Label>
                          <Input
                            id="filterMontoMaximo"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="999999.99"
                            value={salesFilters.montoMaximo || ""}
                            onChange={(e) => setSalesFilters({...salesFilters, montoMaximo: e.target.value ? parseFloat(e.target.value) : undefined})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="sortField">Ordenar por</Label>
                          <Select 
                            value={salesSorting.field} 
                            onValueChange={(value) => setSalesSorting({...salesSorting, field: value as any})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fecha">Fecha</SelectItem>
                              <SelectItem value="monto">Monto</SelectItem>
                              <SelectItem value="vendedor">Vendedor</SelectItem>
                              <SelectItem value="comprador">Comprador</SelectItem>
                              <SelectItem value="estado">Estado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="sortOrder">Orden</Label>
                          <Select 
                            value={salesSorting.order} 
                            onValueChange={(value) => setSalesSorting({...salesSorting, order: value as any})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="desc">Descendente</SelectItem>
                              <SelectItem value="asc">Ascendente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSalesFilters({estadoPago: 'all', estadoEnvio: 'all'})
                              setSalesSorting({field: 'fecha', order: 'desc'})
                            }}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Limpiar
                          </Button>
                        </div>
                      </div>
                      
                      {/* Estadísticas de filtros */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Mostrando {salesData.length} de {salesData.length} ventas</span>
                        {(salesFilters.estadoPago !== 'all' || salesFilters.estadoEnvio !== 'all' || salesFilters.vendedorId || salesFilters.fechaDesde || salesFilters.fechaHasta || salesFilters.montoMinimo || salesFilters.montoMaximo) && (
                          <Badge variant="outline">
                            Filtros aplicados
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabla de Ventas */}
                {/* <Card>
                  <CardHeader>
                    <CardTitle>Gestión de Pagos a Vendedores</CardTitle>
                    <CardDescription>
                      Administra los pagos pendientes y realizados a los vendedores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingSales ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        <span className="ml-2">Cargando ventas...</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-1 md:p-2">Fecha</TableHead>
                              <TableHead className="p-1 md:p-2">Producto</TableHead>
                              <TableHead className="p-1 md:p-2">Vendedor</TableHead>
                              <TableHead className="hidden md:table-cell p-1 md:p-2">Comprador</TableHead>
                              <TableHead className="p-1 md:p-2">Precio</TableHead>
                              <TableHead className="p-1 md:p-2">Neto</TableHead>
                              <TableHead className="hidden md:table-cell p-1 md:p-2">Estado</TableHead>
                              <TableHead className="hidden md:table-cell p-1 md:p-2">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedSales.map((sale) => {
                              const neto = sale.productPrice * (1 - 0.12)
                              return (
                                <TableRow key={`${sale.compraId}-${sale.productId}`} className="text-xs md:text-sm">
                                  <TableCell className="p-1 md:p-2 max-w-[80px] truncate">
                                    {new Date(sale.fechaCompra).toLocaleDateString('es-ES')}
                                  </TableCell>
                                  <TableCell className="p-1 md:p-2 max-w-[100px] truncate">{sale.productName}</TableCell>
                                  <TableCell className="p-1 md:p-2 max-w-[80px] truncate">{sale.vendedorNombre}</TableCell>
                                  <TableCell className="hidden md:table-cell p-1 md:p-2 max-w-[80px] truncate">{sale.compradorNombre}</TableCell>
                                  <TableCell className="p-1 md:p-2">${sale.productPrice.toFixed(2)}</TableCell>
                                  <TableCell className="p-1 md:p-2 text-green-700 font-semibold">${neto.toFixed(2)}</TableCell>
                                  <TableCell className="hidden md:table-cell p-1 md:p-2">
                                    {sale.pagado ? (
                                      <Badge variant="default">Pagado</Badge>
                                    ) : (
                                      <Badge variant="secondary">Pendiente</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell p-1 md:p-2">
                                    {!sale.pagado && (
                                      <Button size="sm" variant="default" onClick={() => openPaymentMarkingModal(sale)}>
                                        Marcar como Pagado
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                        
                        {salesData.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No se encontraron ventas con los filtros aplicados
                              </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card> */}

                {/* Ventas y Comisiones Tab */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gestión de Compras (por compra)</CardTitle>
                    <CardDescription>
                      Administra las compras agrupadas por documento de la colección purchases
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingSales ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        <span className="ml-2">Cargando compras...</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-1 md:p-2">Fecha</TableHead>
                              <TableHead className="p-1 md:p-2">Productos</TableHead>
                              <TableHead className="p-1 md:p-2">Comprador</TableHead>
                              <TableHead className="p-1 md:p-2">Total</TableHead>
                              <TableHead className="p-1 md:p-2">Estado</TableHead>
                              <TableHead className="p-1 md:p-2">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchases.map((compra) => (
                              <TableRow key={compra.id}>
                                <TableCell>{new Date(compra.createdAt?.toDate?.() || compra.createdAt).toLocaleDateString('es-ES')}</TableCell>
                                <TableCell>
                                  <ul className="list-disc pl-4">
                                    {Array.isArray(compra.products) && compra.products.map((p, idx) => (
                                      <li key={idx}>{p.nombre || p.productName || p.productoNombre || 'Producto'} (x{p.quantity || p.cantidad || 1})</li>
                                    ))}
                                  </ul>
                            </TableCell>
                                <TableCell>{usersMap[compra.buyerId]?.name || compra.buyerId}</TableCell>
                                <TableCell>${compra.totalAmount?.toFixed(2)}</TableCell>
                            <TableCell>
                                  <Badge variant={compra.status === 'approved' ? 'default' : 'secondary'}>
                                    {compra.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(compra)}>
                                    Ver Detalles
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {purchases.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No se encontraron compras
                          </div>
                                )}
                              </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pagos Manuales Tab */}
            <TabsContent value="manual-payments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Pagos Manuales</CardTitle>
                  <CardDescription>
                    Registro de todos los pagos marcados manualmente por administradores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingManualPayments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <span className="ml-2">Cargando historial de pagos...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Vendedor</TableHead>
                            <TableHead>Compra ID</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead>Administrador</TableHead>
                            <TableHead>Notas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {manualPayments.map((payment) => (
                            <TableRow key={payment.id}>
                            <TableCell>
                              <div className="text-sm">
                                  {new Date(payment.fechaPago).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                              </div>
                            </TableCell>
                            <TableCell>
                                <div className="font-medium">{payment.vendedorNombre}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-sm">{payment.compraId}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-green-600">
                                  ${payment.monto.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={
                                  payment.metodoPago === 'bank_transfer' ? 'default' :
                                  payment.metodoPago === 'mercadopago' ? 'secondary' : 'outline'
                                }>
                                  {payment.metodoPago === 'bank_transfer' ? 'Transferencia' :
                                   payment.metodoPago === 'mercadopago' ? 'MercadoPago' : 'Efectivo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{payment.administradorNombre}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {payment.notas}
                                </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                      
                      {manualPayments.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No hay pagos manuales registrados
                  </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notificaciones Tab */}
            <TabsContent value="notifications" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sistema de Notificaciones</CardTitle>
                  <CardDescription>
                    Monitorea todas las notificaciones enviadas a los usuarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <span className="ml-2">Cargando notificaciones...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Estadísticas de notificaciones */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Notificaciones</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{notifications.length}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">No Leídas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                              {notifications.filter(n => !n.isRead).length}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Últimas 24h</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                              {notifications.filter(n => {
                                const notificationDate = n.createdAt?.toDate?.() || new Date(n.createdAt)
                                const yesterday = new Date()
                                yesterday.setDate(yesterday.getDate() - 1)
                                return notificationDate > yesterday
                              }).length}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Tabla de notificaciones */}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-1 md:p-2">Fecha</TableHead>
                              <TableHead className="p-1 md:p-2">Usuario</TableHead>
                              <TableHead className="hidden md:table-cell p-1 md:p-2">Tipo</TableHead>
                              <TableHead className="p-1 md:p-2">Título</TableHead>
                              <TableHead className="hidden md:table-cell p-1 md:p-2">Descripción</TableHead>
                              <TableHead className="hidden md:table-cell p-1 md:p-2">Estado</TableHead>
                              <TableHead className="hidden md:table-cell p-1 md:p-2">Detalles</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {notifications.map((notification) => (
                              <TableRow key={notification.id} className="text-xs md:text-sm">
                                <TableCell className="p-1 md:p-2 max-w-[80px] truncate">{/* fecha */}</TableCell>
                                <TableCell className="p-1 md:p-2 max-w-[80px] truncate">{/* usuario */}</TableCell>
                                <TableCell className="hidden md:table-cell p-1 md:p-2">{/* tipo */}</TableCell>
                                <TableCell className="p-1 md:p-2 max-w-[100px] truncate">{/* título */}</TableCell>
                                <TableCell className="hidden md:table-cell p-1 md:p-2 max-w-[100px] truncate">{/* descripción */}</TableCell>
                                <TableCell className="hidden md:table-cell p-1 md:p-2">{/* estado */}</TableCell>
                                <TableCell className="hidden md:table-cell p-1 md:p-2">{/* detalles */}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        
                        {notifications.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No hay notificaciones registradas
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Modal de Marcado Manual de Pagos */}
      <Dialog open={paymentMarkingModal.isOpen} onOpenChange={closePaymentMarkingModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Marcar Pago como Completado</DialogTitle>
            <DialogDescription>
              Confirma el pago manual para el vendedor {paymentMarkingModal.vendedorNombre}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Vendedor</Label>
                <p className="text-sm text-gray-600">{paymentMarkingModal.vendedorNombre}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Monto a Pagar</Label>
                <p className="text-sm font-semibold text-green-600">
                  ${paymentMarkingModal.monto.toFixed(2)}
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="paymentMethod" className="text-sm font-medium">
                Método de Pago
              </Label>
              <Select value={paymentMethod} onValueChange={(value: 'bank_transfer' | 'mercadopago' | 'cash') => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="paymentNotes" className="text-sm font-medium">
                Notas del Pago
              </Label>
              <Textarea
                id="paymentNotes"
                placeholder="Agregar notas sobre el pago (opcional)"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Esta acción marcará el pago como completado y enviará una notificación al vendedor.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePaymentMarkingModal}
              disabled={markingPayment === `${paymentMarkingModal.compraId}-${paymentMarkingModal.vendedorId}`}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMarkPaymentAsPaid}
              disabled={markingPayment === `${paymentMarkingModal.compraId}-${paymentMarkingModal.vendedorId}`}
            >
              {markingPayment === `${paymentMarkingModal.compraId}-${paymentMarkingModal.vendedorId}` ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Ventas y Comisiones Tab */}
      {/* Modal de Detalle de Compra */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Compra</DialogTitle>
            <DialogDescription>
              ID Pago: {selectedPurchase?.paymentId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>Fecha: {selectedPurchase?.createdAt ? (selectedPurchase?.createdAt.toDate ? new Date(selectedPurchase.createdAt.toDate()).toLocaleString() : new Date(selectedPurchase.createdAt).toLocaleString()) : ''}</p>
            <p>Comprador: {selectedPurchase?.buyerId ? usersMap[selectedPurchase.buyerId as string]?.name || selectedPurchase.buyerId : ''}</p>
            <p>Total: ${selectedPurchase?.totalAmount?.toFixed(2)}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPurchase?.products?.map((p: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{p.nombre || p.productName || p.productoNombre || 'Producto'}</TableCell>
                    <TableCell>{p.quantity || p.cantidad || 1}</TableCell>
                    <TableCell>${(p.precio || p.price || 0).toFixed(2)}</TableCell>
                    <TableCell>${((p.precio || p.price || 0) * (p.quantity || p.cantidad || 1)).toFixed(2)}</TableCell>
                    <TableCell>{usersMap[p.vendedorId]?.name || p.vendedorId}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSeller(p.vendedorId as string)}
                      >
                        Ver Vendedor
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      {/* Agregar el modal de información del vendedor */}
      <Dialog open={showSellerModal} onOpenChange={setShowSellerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Datos del Vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Avatar>
              <AvatarImage src={selectedSellerId ? usersMap[selectedSellerId as string]?.photoURL : undefined} />
              <AvatarFallback>V</AvatarFallback>
            </Avatar>
            <p><strong>Nombre:</strong> {selectedSellerId ? usersMap[selectedSellerId as string]?.name : ''}</p>
            <p><strong>Email:</strong> {selectedSellerId ? usersMap[selectedSellerId as string]?.email : ''}</p>
            <p><strong>UID:</strong> {selectedSellerId}</p>
            <p><strong>Activo:</strong> {selectedSellerId ? (usersMap[selectedSellerId as string]?.isActive ? 'Sí' : 'No') : ''}</p>
            <p><strong>Suscrito:</strong> {selectedSellerId ? (usersMap[selectedSellerId as string]?.isSubscribed ? 'Sí' : 'No') : ''}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
