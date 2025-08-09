"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { SimpleImage } from '@/components/ui/simple-image'
import Link from "next/link"
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Heart,
  Share2,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Truck,
  Shield,
  RotateCcw,
  MapPin,
  Store,
  AlertCircle,
  Loader2,
  MessageSquare,
  Play,
  Video,
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import ServiceDetail from "@/components/services/ServiceDetail"
import { formatPrice, formatPriceNumber } from "@/lib/utils"
import { ShareButtons } from "@/components/ui/share-buttons"
import { ApiService } from "@/lib/services/api"
import { useToast } from "@/hooks/use-toast"

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
  media?: ProductMedia[]
  imageUrl?: string // For backward compatibility
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
  couponId?: string | null
  couponStartDate?: any | null
  couponEndDate?: any | null
  condition?: 'nuevo' | 'usado' | null;
  freeShipping?: boolean;
  shippingCost?: number;
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface Seller {
  id: string
  name: string
  email: string
}

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: any
}

interface Question {
  id: string
  productId: string
  userId: string
  userName: string
  question: string
  answer?: string
  answeredBy?: string
  answeredAt?: any
  createdAt: any
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

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem, getItemQuantity } = useCart()
  const { currentUser, authLoading } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState("")
  const [submittingQuestion, setSubmittingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)
  const [questionSuccess, setQuestionSuccess] = useState<string | null>(null)
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)

  // Review form state
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null)

  // Direct purchase state
  const [buyingNow, setBuyingNow] = useState(false)

  // Hooks
  const { toast } = useToast()

  // Get product media (with backward compatibility)
  const getProductMedia = (product: Product): ProductMedia[] => {
    console.log('getProductMedia called with product:', product)
    if (product.media && product.media.length > 0) {
      console.log('Using product.media:', product.media)
      return product.media
    }
    // Backward compatibility: convert old imageUrl to media format
    if (product.imageUrl) {
      console.log('Using product.imageUrl:', product.imageUrl)
      return [
        {
          type: "image",
          url: product.imageUrl,
          path: "",
        },
      ]
    }
    console.log('Using placeholder image')
    return [
      {
        type: "image",
        url: "/placeholder.svg?height=400&width=400",
        path: "",
      },
    ]
  }

  const productMedia = product ? getProductMedia(product) : []
  
  // Debug logging
  useEffect(() => {
    console.log('productMedia updated:', productMedia)
    console.log('selectedMediaIndex:', selectedMediaIndex)
    console.log('Current selected media:', productMedia[selectedMediaIndex])
  }, [productMedia, selectedMediaIndex])

  useEffect(() => {
    if (params.id && !authLoading) {
      fetchProductDetails(params.id as string)
    }
  }, [params.id, currentUser, authLoading])

  // Reset selectedMediaIndex when product changes
  useEffect(() => {
    setSelectedMediaIndex(0)
  }, [product?.id])

  // Ensure selectedMediaIndex is within bounds when productMedia changes
  useEffect(() => {
    if (productMedia.length > 0 && selectedMediaIndex >= productMedia.length) {
      setSelectedMediaIndex(0)
    }
  }, [productMedia, selectedMediaIndex])

  const fetchProductDetails = async (productId: string) => {
    setLoading(true)
    setError(null)
    setAppliedCoupon(null)

    try {
      // Fetch product
      const productDoc = await getDoc(doc(db, "products", productId))
      if (!productDoc.exists()) {
        setError("Producto no encontrado")
        setLoading(false)
        return
      }

      const productData = { id: productDoc.id, ...productDoc.data() } as Product
      setProduct(productData)

      // Fetch coupon details if couponId exists and is valid today
      if (productData.couponId && productData.couponStartDate && productData.couponEndDate) {
        const now = new Date()
        const startDate = productData.couponStartDate.toDate() // Convert Firestore Timestamp to Date
        const endDate = productData.couponEndDate.toDate() // Convert Firestore Timestamp to Date

        if (now >= startDate && now <= endDate) {
          const couponDoc = await getDoc(doc(db, "coupons", productData.couponId))
          if (couponDoc.exists()) {
            const couponData = { id: couponDoc.id, ...couponDoc.data() } as Coupon
            if (couponData.isActive && (couponData.applicableTo === "all" || couponData.applicableTo === "buyers")) {
              setAppliedCoupon(couponData)
            }
          }
        }
      }

      // Save to recently viewed
      if (productData) {
        const MAX_RECENTLY_VIEWED = 12
        let recentlyViewed = JSON.parse(localStorage.getItem("servido-recently-viewed") || "[]")

        recentlyViewed = recentlyViewed.filter((id: string) => id !== productData.id)
        recentlyViewed.unshift(productData.id)

        if (recentlyViewed.length > MAX_RECENTLY_VIEWED) {
          recentlyViewed = recentlyViewed.slice(0, MAX_RECENTLY_VIEWED)
        }
        localStorage.setItem("servido-recently-viewed", JSON.stringify(recentlyViewed))
      }

      // Fetch category
      if (productData.category) {
        const categoryDoc = await getDoc(doc(db, "categories", productData.category))
        if (categoryDoc.exists()) {
          setCategory({ id: categoryDoc.id, ...categoryDoc.data() } as Category)
        }
      }

      // Fetch brand
      if (productData.brand) {
        const brandDoc = await getDoc(doc(db, "brands", productData.brand))
        if (brandDoc.exists()) {
          setBrand({ id: brandDoc.id, ...brandDoc.data() } as Brand)
        }
      }

      // Fetch seller
      const sellerDoc = await getDoc(doc(db, "users", productData.sellerId))
      if (sellerDoc.exists()) {
        setSeller({ id: sellerDoc.id, ...sellerDoc.data() } as Seller)
      }

      // Fetch related products (same category)
      if (productData.category) {
        const relatedQuery = query(collection(db, "products"), where("category", "==", productData.category), limit(6))
        const relatedSnapshot = await getDocs(relatedQuery)
        const related = relatedSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
          .filter((p) => p.id !== productId)
        setRelatedProducts(related)
      }

      // Fetch reviews
      const reviewsQuery = query(
        collection(db, "reviews"),
        where("productId", "==", productId),
        orderBy("createdAt", "desc"),
      )
      const reviewsSnapshot = await getDocs(reviewsQuery)
      setReviews(reviewsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Review))

      // Fetch questions
      const questionsQuery = query(
        collection(db, "questions"),
        where("productId", "==", productId),
        orderBy("createdAt", "desc"),
      )
      const questionsSnapshot = await getDocs(questionsQuery)
      setQuestions(questionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Question))

      // Check if product is favorited by current user
      if (currentUser) {
        const favoriteQuery = query(
          collection(db, "favorites"),
          where("userId", "==", currentUser.firebaseUser.uid),
          where("productId", "==", productId),
          limit(1),
        )
        const favoriteSnapshot = await getDocs(favoriteQuery)
        if (favoriteSnapshot.docs.length > 0) {
          setIsFavorite(true)
          setFavoriteId(favoriteSnapshot.docs[0].id)
        } else {
          setIsFavorite(false)
          setFavoriteId(null)
        }
      } else {
        setIsFavorite(false)
        setFavoriteId(null)
      }
    } catch (err) {
      console.error("Error fetching product details:", err)
      setError("Error al cargar el producto")
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product) return

    // Use the first image from media for cart display
    const firstImage = productMedia.find((m) => m.type === "image")

    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      discountedPrice: finalPrice,
      quantity: quantity,
      imageUrl: firstImage?.url || product.imageUrl,
      media: product.media,
      isService: product.isService,
      sellerId: product.sellerId,
      stock: product.stock,
      appliedCoupon: appliedCoupon,
      condition: product.condition,
      freeShipping: product.freeShipping,
      shippingCost: product.shippingCost,
    })

    setQuantity(1)
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return
    if (!product?.isService && product?.stock && newQuantity > product.stock) return
    setQuantity(newQuantity)
  }

  const currentCartQuantity = product ? getItemQuantity(product.id) : 0
  const maxQuantity = product?.isService ? 10 : (product?.stock || 0) - currentCartQuantity

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      alert("Debes iniciar sesión para añadir a favoritos.")
      router.push("/login")
      return
    }
    if (!product) return

    try {
      if (isFavorite && favoriteId) {
        await deleteDoc(doc(db, "favorites", favoriteId))
        setIsFavorite(false)
        setFavoriteId(null)
        setReviewSuccess("Producto eliminado de favoritos.")
      } else {
        const firstImage = productMedia.find((m) => m.type === "image")
        const docRef = await addDoc(collection(db, "favorites"), {
          userId: currentUser.firebaseUser.uid,
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: firstImage?.url || product.imageUrl,
          addedAt: serverTimestamp(),
        })
        setIsFavorite(true)
        setFavoriteId(docRef.id)
        setReviewSuccess("Producto añadido a favoritos.")
      }
    } catch (err) {
      console.error("Error toggling favorite:", err)
      setReviewError("Error al gestionar favoritos.")
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setReviewError("Debes iniciar sesión para enviar una reseña.")
      return
    }
    if (!product) {
      setReviewError("No se puede enviar reseña sin producto.")
      return
    }
    if (reviewRating === 0) {
      setReviewError("Por favor, selecciona una calificación.")
      return
    }
    if (reviewComment.trim().length < 10) {
      setReviewError("El comentario debe tener al menos 10 caracteres.")
      return
    }

    // Verificar si el comentario contiene números de teléfono
    const containsPhoneNumber = (text: string): boolean => {
      const phonePatterns = [
        /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
        /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
        /(\d{7,15})/g,
        /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
      ]
      return phonePatterns.some(pattern => pattern.test(text))
    }

    if (containsPhoneNumber(reviewComment.trim())) {
      setReviewError("No se permiten números de teléfono en los comentarios por seguridad.")
      return
    }

    setSubmittingReview(true)
    setReviewError(null)
    setReviewSuccess(null)

    try {
      const reviewData = {
        productId: product.id,
        userId: currentUser.firebaseUser.uid,
        userName: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email || "Usuario Anónimo",
        rating: reviewRating,
        comment: reviewComment,
        createdAt: serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, "reviews"), reviewData)
      // Actualizar el estado local inmediatamente para productos y servicios
      setReviews((prev) => [{ id: docRef.id, ...reviewData, createdAt: new Date() } as Review, ...prev])
      setReviewRating(0)
      setReviewComment("")
      setReviewSuccess("Reseña enviada exitosamente. ¡Gracias por tu opinión!")
    } catch (err) {
      console.error("Error submitting review:", err)
      setReviewError("Error al enviar la reseña. Inténtalo de nuevo.")
    } finally {
      setSubmittingReview(false)
    }
  }

  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  const hasUserReviewed = currentUser ? reviews.some((r) => r.userId === currentUser.firebaseUser.uid) : false

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setQuestionError("Debes iniciar sesión para hacer una pregunta.")
      return
    }
    if (!product) {
      setQuestionError("No se puede enviar pregunta sin producto.")
      return
    }
    if (newQuestion.trim().length < 10) {
      setQuestionError("La pregunta debe tener al menos 10 caracteres.")
      return
    }

    // Verificar si la pregunta contiene números de teléfono
    const containsPhoneNumber = (text: string): boolean => {
      const phonePatterns = [
        /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
        /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
        /(\d{7,15})/g,
        /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
      ]
      return phonePatterns.some(pattern => pattern.test(text))
    }

    if (containsPhoneNumber(newQuestion.trim())) {
      setQuestionError("No se permiten números de teléfono en las preguntas por seguridad.")
      return
    }

    setSubmittingQuestion(true)
    setQuestionError(null)
    setQuestionSuccess(null)

    try {
      const questionData = {
        productId: product.id,
        userId: currentUser.firebaseUser.uid,
        userName: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email || "Usuario Anónimo",
        question: newQuestion,
        createdAt: serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, "questions"), questionData)
      // Actualizar el estado local inmediatamente para productos y servicios
      setQuestions((prev) => [{ id: docRef.id, ...questionData, createdAt: new Date() } as Question, ...prev])
      setNewQuestion("")
      setQuestionSuccess("Pregunta enviada exitosamente. ¡Gracias por tu consulta!")
    } catch (err) {
      console.error("Error submitting question:", err)
      setQuestionError("Error al enviar la pregunta. Inténtalo de nuevo.")
    } finally {
      setSubmittingQuestion(false)
    }
  }

  const handleSubmitAnswer = async (questionId: string) => {
    if (!currentUser) {
      setQuestionError("Debes iniciar sesión para responder.")
      return
    }
    if (!product || currentUser.firebaseUser.uid !== product.sellerId) {
      setQuestionError("Solo el vendedor puede responder preguntas.")
      return
    }
    if (answerText.trim().length < 5) {
      setQuestionError("La respuesta debe tener al menos 5 caracteres.")
      return
    }

    // Verificar si la respuesta contiene números de teléfono
    const containsPhoneNumber = (text: string): boolean => {
      const phonePatterns = [
        /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
        /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
        /(\d{7,15})/g,
        /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
      ]
      return phonePatterns.some(pattern => pattern.test(text))
    }

    if (containsPhoneNumber(answerText.trim())) {
      setQuestionError("No se permiten números de teléfono en las respuestas por seguridad.")
      return
    }

    setSubmittingAnswer(true)
    setQuestionError(null)

    try {
      const questionRef = doc(db, "questions", questionId)
      await updateDoc(questionRef, {
        answer: answerText,
        answeredBy: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email || "Vendedor",
        answeredAt: serverTimestamp(),
      })

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                answer: answerText,
                answeredBy: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email || "Vendedor",
                answeredAt: new Date(),
              }
            : q,
        ),
      )

      setAnswerText("")
      setAnsweringQuestionId(null)
      setQuestionSuccess("Respuesta enviada exitosamente.")
    } catch (err) {
      console.error("Error submitting answer:", err)
      setQuestionError("Error al enviar la respuesta. Inténtalo de nuevo.")
    } finally {
      setSubmittingAnswer(false)
    }
  }

  // const handleContactSeller = async () => {
  //   if (!currentUser) {
  //     alert("Debes iniciar sesión para contactar al vendedor.")
  //     router.push("/login")
  //     return
  //   }
  //   if (!product || !seller) {
  //     setError("No se pudo obtener la información del producto o vendedor.")
  //     return
  //   }

  //   const existingChatQuery = query(
  //     collection(db, "chats"),
  //     where("productId", "==", product.id),
  //     where("buyerId", "==", currentUser.firebaseUser.uid),
  //     where("sellerId", "==", seller.id),
  //     limit(1),
  //   )
  //   const existingChatSnapshot = await getDocs(existingChatQuery)

  //   if (existingChatSnapshot.docs.length > 0) {
  //     const existingChatId = existingChatSnapshot.docs[0].id
  //     router.push(`/chat/${existingChatId}`)
  //   } else {
  //     try {
  //       const firstImage = productMedia.find((m) => m.type === "image")
  //       const newChatData = {
  //         productId: product.id,
  //         buyerId: currentUser.firebaseUser.uid,
  //         sellerId: seller.id,
  //         buyerName: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email?.split("@")?.[0] || "Comprador",
  //         sellerName: seller.name || seller.email?.split("@")[0] || "Vendedor",
  //         productName: product.name,
  //         productImageUrl: firstImage?.url || product.imageUrl || null,
  //         lastMessage: "¡Hola! Me interesa este producto.",
  //         lastMessageTimestamp: serverTimestamp(),
  //         createdAt: serverTimestamp(),
  //       }
  //       const docRef = await addDoc(collection(db, "chats"), newChatData)

  //       await addDoc(collection(db, "chats", docRef.id, "messages"), {
  //         senderId: currentUser.firebaseUser.uid,
  //         senderName: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email?.split("@")?.[0] || "Comprador",
  //         text: "¡Hola! Me interesa este producto.",
  //         timestamp: serverTimestamp(),
  //       })

  //       router.push(`/chat/${docRef.id}`)
  //     } catch (err) {
  //       console.error("Error creating chat:", err)
  //       setError("Error al iniciar el chat. Inténtalo de nuevo.")
  //     }
  //   }
  // }

  const handleContactSeller = async () => {
    alert("Funcionalidad de chat temporalmente deshabilitada")
  }

  // Función para manejar la compra directa
  const handleBuyNow = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar la compra",
        variant: "destructive"
      })
      return
    }

    if (!product) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información del producto",
        variant: "destructive"
      })
      return
    }

    if (maxQuantity <= 0) {
      toast({
        title: "Error",
        description: "Producto sin stock disponible",
        variant: "destructive"
      })
      return
    }

    try {
      setBuyingNow(true)

      // Usar el sistema centralizado para compra directa
      const response = await ApiService.createSingleProductPurchase({
        productId: product.id,
        quantity: quantity,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || '',
        shippingCost: product.shippingCost // <--- AGREGADO
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error("No se recibió el punto de inicio del pago")
      }

      toast({
        title: "✅ Compra creada",
        description: `${product.name} - ${formatPriceNumber(finalPrice * quantity)}`,
        duration: 3000,
      })

      // Redirigir a MercadoPago
      window.location.href = response.data.init_point
    } catch (error) {
      console.error("Error al procesar la compra directa:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la compra",
        variant: "destructive"
      })
    } finally {
      setBuyingNow(false)
    }
  }

  // Function to calculate discounted price
  const calculateDiscountedPrice = (originalPrice: number, coupon: Coupon): number => {
    let discountedPrice = originalPrice
    if (coupon.discountType === "percentage") {
      discountedPrice = originalPrice * (1 - coupon.discountValue / 100)
      if (coupon.maxDiscount && (originalPrice - discountedPrice) > coupon.maxDiscount) {
        discountedPrice = originalPrice - coupon.maxDiscount
      }
    } else if (coupon.discountType === "fixed") {
      discountedPrice = originalPrice - coupon.discountValue
    }
    return Math.max(0, discountedPrice) // Ensure price doesn't go below 0
  }

  const finalPrice = product && appliedCoupon ? calculateDiscountedPrice(product.price, appliedCoupon) : product?.price || 0;

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Producto no disponible."}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    )
  }

  // Render condicional para servicios
  if (product.isService) {
    return (
      <ServiceDetail
        service={{
          ...product,
          categoryName: category?.name,
          isFavorite,
          averageRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
          reviewsCount: reviews.length,
        }}
        breadcrumbs={[
          { name: "Inicio", href: "/" },
          ...(category ? [{ name: category.name, href: `/category/${category.id}` }] : []),
          { name: product.name },
        ]}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onShare={() => navigator.clipboard && navigator.clipboard.writeText(window.location.href)}
        onContactSeller={handleContactSeller}
        reviews={reviews}
        onSubmitReview={(rating, comment) => {
          setReviewRating(rating)
          setReviewComment(comment)
          handleSubmitReview({ preventDefault: () => {} } as any)
        }}
        questions={questions}
        onSubmitQuestion={(question) => {
          setNewQuestion(question)
          handleSubmitQuestion({ preventDefault: () => {} } as any)
        }}
        currentUser={currentUser}
        loading={loading}
        reviewError={reviewError}
        reviewSuccess={reviewSuccess}
        submittingReview={submittingReview}
        questionError={questionError}
        questionSuccess={questionSuccess}
        submittingQuestion={submittingQuestion}
        answeringQuestionId={answeringQuestionId}
        answerText={answerText}
        setAnsweringQuestionId={setAnsweringQuestionId}
        setAnswerText={setAnswerText}
        handleSubmitAnswer={handleSubmitAnswer}
        submittingAnswer={submittingAnswer}
        hasUserReviewed={hasUserReviewed}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Local Header for breadcrumbs and back button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-2 sm:px-4 py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 overflow-hidden">
              <Link href="/" className="hover:text-blue-600 whitespace-nowrap">
                Inicio
              </Link>
              <span>/</span>
              {category && (
                <>
                  <Link href={`/category/${category.id}`} className="hover:text-blue-600 truncate">
                    {category.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="text-gray-900 truncate max-w-[120px] sm:max-w-none">{product.name}</span>
            </nav>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Media Gallery */}
          <div className="space-y-4">
            <div className="aspect-[4/3] relative bg-white rounded-lg overflow-hidden border">
              {productMedia[selectedMediaIndex]?.type === "video" ? (
                <video
                  controls
                  className="w-full h-full object-cover"
                  poster={productMedia[selectedMediaIndex]?.thumbnail}
                >
                  <source src={productMedia[selectedMediaIndex]?.url} type="video/mp4" />
                  Tu navegador no soporta videos.
                </video>
              ) : (
                <SimpleImage 
                  src={productMedia[selectedMediaIndex]?.url || "/placeholder.svg"} 
                  alt={product.name} 
                  className="w-full h-full object-contain bg-gray-50 transition-all duration-300" 
                  onLoad={() => console.log('Main image loaded:', productMedia[selectedMediaIndex]?.url, 'Index:', selectedMediaIndex)}
                  key={`main-image-${selectedMediaIndex}`}
                />
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white/80 hover:bg-white"
                  onClick={handleToggleFavorite}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                {/* Botón compartir temporalmente deshabilitado */}
                {/* <Button variant="secondary" size="icon" className="bg-white/80 hover:bg-white">
                  <Share2 className="h-5 w-5" />
                </Button> */}
              </div>
            </div>

            {/* Media Thumbnails */}
            <div className="flex gap-2 overflow-x-auto">
              {productMedia.map((media, index) => (
                <button
                  key={index}
                  onClick={() => {
                    console.log('Thumbnail clicked:', index, 'Current selectedMediaIndex:', selectedMediaIndex)
                    console.log('productMedia array:', productMedia)
                    setSelectedMediaIndex(index)
                  }}
                  className={`flex-shrink-0 w-20 h-20 relative rounded-md overflow-hidden border-2 transition-colors ${
                    selectedMediaIndex === index ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  {media.type === "video" ? (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center relative">
                      {media.thumbnail ? (
                        <SimpleImage
                          src={media.thumbnail || "/placeholder.svg"}
                          alt={`Video ${index + 1}`}
                          className="w-full h-full object-contain bg-gray-50"
                        />
                      ) : (
                        <Video className="h-8 w-8 text-gray-600" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <SimpleImage 
                      src={media.url || "/placeholder.svg"} 
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-contain bg-gray-50"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Product Info - keeping existing code */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {brand && <Badge variant="outline">{brand.name}</Badge>}
                <Badge variant={product.isService ? "default" : "secondary"}>
                  {product.isService ? "Servicio" : "Producto"}
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 break-words">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < averageRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    ({averageRating.toFixed(1)}) • {reviews.length} reseñas
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 break-all">
                  {formatPrice(finalPrice)}
                </span>
                {appliedCoupon && product && finalPrice < product.price && (
                  <>
                    <span className="text-lg sm:text-xl lg:text-2xl text-gray-400 line-through ml-2">
                      {formatPrice(product.price)}
                    </span>
                    <Badge className="bg-green-500 text-white ml-2">
                      Cupón Aplicado:
                      {appliedCoupon.discountType === "percentage"
                        ? `${appliedCoupon.discountValue}% OFF`
                        : `$${appliedCoupon.discountValue.toFixed(2)} OFF`}
                    </Badge>
                  </>
                )}
                <span className="text-sm sm:text-base lg:text-lg text-gray-500 ml-1 sm:ml-2">
                  {product.isService ? "por servicio" : ""}
                </span>
              </div>

              {/* Condición y Envío */}
              <div className="flex flex-col gap-1 text-sm">
                {product.condition && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Condición:</span>
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold">
                      {product.condition === 'nuevo' ? 'Nuevo' : 'Usado'}
                    </span>
                  </div>
                )}
                {product.freeShipping ? (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 font-medium">Envío gratis</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">Envío: </span>
                    <span className="font-medium">{product.shippingCost !== undefined ? formatPrice(product.shippingCost) : '-'}</span>
                  </div>
                )}
              </div>

              {!product.isService && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Stock disponible:</span>
                  <span className="font-medium">{product.stock ? `${product.stock} unidades` : "Sin stock"}</span>
                </div>
              )}

              {currentCartQuantity > 0 && (
                <div className="text-sm text-blue-600">
                  Ya tienes {currentCartQuantity} {currentCartQuantity === 1 ? "unidad" : "unidades"} en tu carrito
                </div>
              )}
            </div>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium">Cantidad:</span>
                <div className="flex items-center border rounded-md w-fit">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <span className="w-8 sm:w-12 text-center font-medium text-sm sm:text-base">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= maxQuantity}
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                {!product.isService && (
                  <span className="text-xs sm:text-sm text-gray-500">
                    Máximo: {maxQuantity} {maxQuantity === 1 ? "unidad" : "unidades"}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 text-sm sm:text-base"
                  size="lg"
                  disabled={maxQuantity <= 0}
                >
                  <ShoppingCart className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {maxQuantity <= 0 ? "Sin stock" : "Agregar al carrito"}
                </Button>
                {/* Botón Comprar ahora temporalmente deshabilitado */}
                {/* <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-sm sm:text-base"
                  onClick={handleBuyNow}
                  disabled={maxQuantity <= 0 || buyingNow}
                >
                  {buyingNow ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Comprar ahora"
                  )}
                </Button> */}
              </div>
            </div>

            {/* Seller Info and Contact Button */}
            {seller && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Store className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <Link href={`/seller/${seller.id}`} className="hover:text-orange-600 transition-colors">
                          <p className="font-medium">Vendido por {seller.name}</p>
                        </Link>
                        <p className="text-sm text-gray-600">Vendedor verificado</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/seller/${seller.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm whitespace-nowrap"
                        >
                          <Store className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Ver Tienda</span>
                          <span className="sm:hidden">Tienda</span>
                        </Button>
                      </Link>
                      {currentUser?.firebaseUser.uid !== seller.id && (
                        <Button
                          onClick={handleContactSeller}
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm whitespace-nowrap"
                        >
                          <MessageSquare className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Contactar Vendedor</span>
                          <span className="sm:hidden">Contactar</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Share Buttons */}
            <Card>
              <CardContent className="p-4">
                <ShareButtons
                  productName={product.name}
                  productUrl={window.location.href}
                  productPrice={finalPrice}
                  productImage={productMedia[0]?.url}
                />
              </CardContent>
            </Card>

            {/* Compra Protegida */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span>Compra Protegida</span>
            </div>
          </div>
        </div>

        {/* Rest of the component remains the same - Product Description, Reviews, Questions, Related Products */}
        {/* Product Description */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Descripción del producto</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {product.description || "Este producto no tiene descripción disponible."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Reviews */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Reseñas de Usuarios ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {reviewError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{reviewError}</AlertDescription>
              </Alert>
            )}
            {reviewSuccess && (
              <Alert className="mb-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Éxito</AlertTitle>
                <AlertDescription>{reviewSuccess}</AlertDescription>
              </Alert>
            )}

            {currentUser && !hasUserReviewed && (
              <form onSubmit={handleSubmitReview} className="mb-8 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium mb-3">Escribe tu reseña</h3>
                <div className="mb-4">
                  <Label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
                    Calificación
                  </Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-6 w-6 cursor-pointer ${
                          star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                        onClick={() => setReviewRating(star)}
                      />
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <Label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                    Comentario
                  </Label>
                  <Textarea
                    id="comment"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Comparte tu experiencia con el producto..."
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" disabled={submittingReview}>
                  {submittingReview ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    "Enviar Reseña"
                  )}
                </Button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-gray-600">Sé el primero en dejar una reseña para este producto.</p>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                      <span className="text-sm font-medium ml-2">{review.userName}</span>
                      <span className="text-xs text-gray-500">
                        {review.createdAt?.toDate
                          ? review.createdAt.toDate().toLocaleDateString()
                          : "Fecha desconocida"}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {(() => {
                        const censorPhoneNumbers = (text: string): string => {
                          const phonePatterns = [
                            /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
                            /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
                            /(\d{7,15})/g,
                            /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
                          ]
                          let censoredText = text
                          phonePatterns.forEach(pattern => {
                            censoredText = censoredText.replace(pattern, '***NÚMERO BLOQUEADO***')
                          })
                          return censoredText
                        }
                        return censorPhoneNumbers(review.comment)
                      })()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions and Answers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Preguntas y Respuestas ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {questionError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{questionError}</AlertDescription>
              </Alert>
            )}
            {questionSuccess && (
              <Alert className="mb-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Éxito</AlertTitle>
                <AlertDescription>{questionSuccess}</AlertDescription>
              </Alert>
            )}

            {currentUser && currentUser.firebaseUser.uid !== product.sellerId && (
              <form onSubmit={handleSubmitQuestion} className="mb-8 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium mb-3">Hacer una pregunta</h3>
                <div className="mb-4">
                  <Label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                    Tu pregunta
                  </Label>
                  <Textarea
                    id="question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="¿Qué te gustaría saber sobre este producto?"
                    rows={3}
                    required
                  />
                </div>
                <Button type="submit" disabled={submittingQuestion}>
                  {submittingQuestion ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    "Enviar Pregunta"
                  )}
                </Button>
              </form>
            )}

            {questions.length === 0 ? (
              <p className="text-gray-600">Sé el primero en hacer una pregunta sobre este producto.</p>
            ) : (
              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-blue-600">Pregunta:</span>
                        <span className="text-sm text-gray-500">{question.userName}</span>
                        <span className="text-xs text-gray-400">
                          {question.createdAt?.toDate
                            ? question.createdAt.toDate().toLocaleDateString()
                            : "Fecha desconocida"}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {(() => {
                          const censorPhoneNumbers = (text: string): string => {
                            const phonePatterns = [
                              /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
                              /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
                              /(\d{7,15})/g,
                              /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
                            ]
                            let censoredText = text
                            phonePatterns.forEach(pattern => {
                              censoredText = censoredText.replace(pattern, '***NÚMERO BLOQUEADO***')
                            })
                            return censoredText
                          }
                          return censorPhoneNumbers(question.question)
                        })()}
                      </p>
                    </div>

                    {question.answer ? (
                      <div className="ml-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-green-600">Respuesta:</span>
                          <span className="text-sm text-gray-500">{question.answeredBy}</span>
                          <span className="text-xs text-gray-400">
                            {question.answeredAt?.toDate
                              ? question.answeredAt.toDate().toLocaleDateString()
                              : "Fecha desconocida"}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {(() => {
                            const censorPhoneNumbers = (text: string): string => {
                              const phonePatterns = [
                                /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
                                /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
                                /(\d{7,15})/g,
                                /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
                              ]
                              let censoredText = text
                              phonePatterns.forEach(pattern => {
                                censoredText = censoredText.replace(pattern, '***NÚMERO BLOQUEADO***')
                              })
                              return censoredText
                            }
                            return censorPhoneNumbers(question.answer)
                          })()}
                        </p>
                      </div>
                    ) : currentUser && currentUser.firebaseUser.uid === product.sellerId ? (
                      <div className="ml-4">
                        {answeringQuestionId === question.id ? (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <Textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="Escribe tu respuesta..."
                              rows={2}
                              className="mb-2"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSubmitAnswer(question.id)}
                                disabled={submittingAnswer}
                              >
                                {submittingAnswer ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enviando...
                                  </>
                                ) : (
                                  "Responder"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAnsweringQuestionId(null)
                                  setAnswerText("")
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setAnsweringQuestionId(question.id)}>
                            Responder
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="ml-4 text-sm text-gray-500 italic">Esperando respuesta del vendedor...</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Productos relacionados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
              {relatedProducts.map((relatedProduct) => {
                const relatedMedia = getProductMedia(relatedProduct)
                const firstImage = relatedMedia.find((m) => m.type === "image")

                return (
                  <Link key={relatedProduct.id} href={`/product/${relatedProduct.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square relative">
                        <SimpleImage 
                          src={firstImage?.url || relatedProduct.imageUrl || "/placeholder.svg"} 
                          alt={relatedProduct.name} 
                          className="w-full h-full object-contain bg-gray-50"
                        />
                      </div>
                      <CardContent className="p-3">
                        <h3 className="text-sm font-medium truncate mb-1">{relatedProduct.name}</h3>
                        <p className="text-lg font-bold text-blue-600">{formatPrice(relatedProduct.price)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
