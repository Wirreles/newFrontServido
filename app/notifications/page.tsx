"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { BellRing, Package, Percent, AlertCircle } from "lucide-react"

interface OfferAlert {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
  isActive: boolean
  startDate?: any
  endDate?: any
}

export default function NotificationsPage() {
  const [offerAlerts, setOfferAlerts] = useState<OfferAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alertsQuery = query(collection(db, "offerAlerts"), where("isActive", "==", true))
        const alertSnapshot = await getDocs(alertsQuery)
        setOfferAlerts(alertSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OfferAlert))
      } catch (e) {
        setOfferAlerts([])
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

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
      id: "2",
      type: "product",
      icon: Package,
      title: "Tu pedido #12345 ha sido enviado",
      description: "Tu paquete con 'Auriculares Bluetooth' ya está en camino. ¡Pronto lo recibirás!",
      time: "Hace 1 hora",
      link: "/dashboard/buyer?tab=orders",
    },
    {
      id: "3",
      type: "offer",
      icon: Percent,
      title: "Descuentos exclusivos en Moda",
      description: "Renueva tu guardarropa con hasta 30% de descuento en ropa y accesorios.",
      time: "Hace 3 horas",
      link: "/category/moda",
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
      type: "alert",
      icon: AlertCircle,
      title: alert.title,
      description: alert.message,
      time: "", // Puedes agregar lógica de fecha si quieres
      link: undefined,
      alertType: alert.type,
    })),
    ...notifications,
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
          {allNotifications.map((notification) => (
            <Card key={notification.id} className={`hover:shadow-md transition-shadow ${notification.type === "alert" ? "border-purple-500 bg-purple-50" : ""}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-shrink-0">
                  <notification.icon className={`h-6 w-6 ${notification.type === "alert" ? "text-purple-600" : "text-blue-600"}`} />
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-lg">{notification.title}</h3>
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
          ))}
        </div>
      )}
    </div>
  )
}
