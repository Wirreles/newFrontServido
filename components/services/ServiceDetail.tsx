import React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MessageSquare, Tag, Layers, User } from "lucide-react"

interface ServiceDetailProps {
  service: {
    id: string
    name: string
    description: string
    price: number
    imageUrl?: string
    media?: { url: string; type: string; path: string }[]
    sellerId: string
    sellerName?: string
    category?: string
    brand?: string
    // Puedes agregar más campos según tu modelo
  }
  onContactSeller?: () => void
}

const ServiceDetail: React.FC<ServiceDetailProps> = ({ service, onContactSeller }) => {
  // Usar imagen principal de media si existe
  const mainImage = service.media && service.media.length > 0 ? service.media[0].url : (service.imageUrl || "/placeholder.svg")

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4">
      <div className="w-full aspect-square relative rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={mainImage}
          alt={service.name}
          fill
          className="object-cover"
        />
      </div>
      <h1 className="text-2xl font-bold truncate">{service.name}</h1>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {service.category && (
          <span className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"><Layers className="h-4 w-4" />Cat: {service.category}</span>
        )}
        {service.brand && (
          <span className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"><Tag className="h-4 w-4" />Marca: {service.brand}</span>
        )}
      </div>
      <p className="text-gray-700 text-base whitespace-pre-line border-l-2 border-blue-200 pl-3">{service.description}</p>
      <div className="text-lg font-semibold text-blue-700">
        {service.price ? `$${service.price.toFixed(2)}` : "Precio a convenir"}
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <Button onClick={onContactSeller} className="w-full flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Contactar al vendedor
        </Button>
      </div>
      {/* Aquí puedes agregar más info: duración, zona, horarios, etc. */}
    </div>
  )
}

export default ServiceDetail 