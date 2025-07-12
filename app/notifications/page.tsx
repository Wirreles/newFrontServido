"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { BellRing, Package, Percent, AlertCircle, Truck, Clock, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface OfferAlert {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
  isActive: boolean
  startDate?: any
  endDate?: any
}

interface ShippingNotification {
  id: string
  userId: string
  type: "shipping"
  title: string
  description: string
  purchaseId: string
  productName: string
  shippingStatus: "pending" | "preparing" | "shipped" | "delivered" | "cancelled"
  trackingNumber?: string
  carrierName?: string
  isRead: boolean
  createdAt: any
}

export default function NotificationsPage() {
  const { currentUser } = useAuth()
  const [offerAlerts, setOfferAlerts] = useState<OfferAlert[]>([])
  const [shippingNotifications, setShippingNotifications] = useState<ShippingNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Fetch offer alerts
        const alertsQuery = query(collection(db, "offerAlerts"), where("isActive", "==", true))
        const alertSnapshot = await getDocs(alertsQuery)
        setOfferAlerts(alertSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OfferAlert))

        // Fetch shipping notifications for current user
        if (currentUser?.firebaseUser?.uid) {
          const notificationsQuery = query(
            collection(db, "notifications"),
            where("userId", "==", currentUser.firebaseUser.uid),
            where("type", "==", "shipping"),
            orderBy("createdAt", "desc")
          )
          const notificationsSnapshot = await getDocs(notificationsQuery)
          setShippingNotifications(
            notificationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ShippingNotification)
          )
        }
      } catch (e) {
        console.error("Error fetching notifications:", e)
        setOfferAlerts([])
        setShippingNotifications([])
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [currentUser])

  // Función para obtener el icono según el estado de envío
  const getShippingIcon = (status: string) => {
    switch (status) {
      case "pending":
        return Clock
      case "preparing":
        return Package
      case "shipped":
        return Truck
      case "delivered":
        return CheckCircle
      case "cancelled":
        return XCircle
      default:
        return Package
    }
  }

  // Función para formatear fecha
  const formatTime = (timestamp: any) => {
    if (!timestamp) return ""
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Hace menos de una hora"
    if (diffInHours < 24) return `Hace ${diffInHours} horas`
    if (diffInHours < 48) return "Ayer"
    return date.toLocaleDateString()
  }

  const notifications = [
    {
      id: "1",
      type: "offer",
      icon: Percent,
      title: "¡Nueva Oferta Flash!",
      description: "Hasta 50% de descuento en productos seleccionados de tecnología. ¡No te lo pierdas!",
      time: "Hace 5 minutos",
      link: "/category/tecnologia",
    },
    {
      id: "4",
      type: "product",
      icon: BellRing,
      title: "¡Producto en stock!",
      description: "El 'Smartphone X' que te interesaba ya está disponible nuevamente.",
      time: "Ayer",
      link: "/product/some-smartphone-id", // Replace with actual product ID
    },
  ]

  // Mezclar alertas y notificaciones
  const allNotifications = [
    ...offerAlerts.map((alert) => ({
      id: `alert-${alert.id}`,
      type: "alert" as const,
      icon: AlertCircle,
      title: alert.title,
      description: alert.message,
      time: "", // Puedes agregar lógica de fecha si quieres
      link: undefined,
      alertType: alert.type,
      shippingStatus: undefined,
      isRead: undefined,
    })),
    ...shippingNotifications.map((notification) => ({
      id: `shipping-${notification.id}`,
      type: "shipping" as const,
      icon: getShippingIcon(notification.shippingStatus),
      title: notification.title,
      description: notification.description,
      time: formatTime(notification.createdAt),
      link: `/dashboard/buyer`,
      shippingStatus: notification.shippingStatus,
      isRead: notification.isRead,
      alertType: undefined,
    })),
    ...notifications.map((notif) => ({
      ...notif,
      shippingStatus: undefined,
      isRead: undefined,
      alertType: undefined,
    })),
  ]

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Notificaciones</h1>

      {loading ? (
        <p className="text-center text-gray-500">Cargando notificaciones...</p>
      ) : allNotifications.length === 0 ? (
        <p className="text-center text-gray-500">No tienes notificaciones nuevas.</p>
      ) : (
        <div className="grid gap-4 max-w-2xl mx-auto">
          {allNotifications.map((notification) => {
            const getCardStyle = () => {
              if (notification.type === "alert") return "border-purple-500 bg-purple-50"
              if (notification.type === "shipping" && notification.shippingStatus) {
                switch (notification.shippingStatus) {
                  case "pending": return "border-yellow-500 bg-yellow-50"
                  case "preparing": return "border-blue-500 bg-blue-50"
                  case "shipped": return "border-orange-500 bg-orange-50"
                  case "delivered": return "border-green-500 bg-green-50"
                  case "cancelled": return "border-red-500 bg-red-50"
                  default: return "border-gray-500 bg-gray-50"
                }
              }
              return ""
            }

            const getIconColor = () => {
              if (notification.type === "alert") return "text-purple-600"
              if (notification.type === "shipping" && notification.shippingStatus) {
                switch (notification.shippingStatus) {
                  case "pending": return "text-yellow-600"
                  case "preparing": return "text-blue-600"
                  case "shipped": return "text-orange-600"
                  case "delivered": return "text-green-600"
                  case "cancelled": return "text-red-600"
                  default: return "text-gray-600"
                }
              }
              return "text-blue-600"
            }

            return (
              <Card key={notification.id} className={`hover:shadow-md transition-shadow ${getCardStyle()} ${notification.isRead === false ? "ring-2 ring-blue-200" : ""}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-shrink-0">
                    <notification.icon className={`h-6 w-6 ${getIconColor()}`} />
                </div>
                <div className="flex-grow">
                    <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg">{notification.title}</h3>
                      {notification.isRead === false && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  <p className="text-sm text-gray-700 mb-1">{notification.description}</p>
                  {notification.time && <p className="text-xs text-gray-500">{notification.time}</p>}
                  {notification.link && (
                    <Link href={notification.link} className="text-blue-600 hover:underline text-sm mt-2 block">
                      Ver más
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
