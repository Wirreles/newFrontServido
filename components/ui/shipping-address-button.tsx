"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MapPin, User, Phone, FileText } from "lucide-react"

interface ShippingAddressButtonProps {
  shippingAddress?: {
    fullName: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
    dni?: string
    additionalInfo?: string
  } | null
  productName?: string
  className?: string
}

export function ShippingAddressButton({ 
  shippingAddress, 
  productName = "Producto",
  className = "" 
}: ShippingAddressButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!shippingAddress) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className={`flex items-center gap-2 text-gray-400 cursor-not-allowed ${className}`}
        disabled
      >
        <MapPin className="h-4 w-4" />
        Sin dirección
      </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`flex items-center gap-2 text-xs sm:text-sm ${className}`}
        >
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Ver Dirección</span>
          <span className="sm:hidden">Dirección</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            Dirección de Envío
          </DialogTitle>
          <DialogDescription className="text-sm">
            Información de entrega para {productName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Nombre completo */}
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-xs sm:text-sm text-gray-600">Nombre y Apellido:</span>
              <p className="font-semibold text-sm sm:text-base">{shippingAddress.fullName}</p>
            </div>
          </div>

          {/* DNI */}
          {shippingAddress.dni && (
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-xs sm:text-sm text-gray-600">DNI:</span>
                <p className="font-semibold text-sm sm:text-base">{shippingAddress.dni}</p>
              </div>
            </div>
          )}

          {/* Teléfono */}
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-xs sm:text-sm text-gray-600">Teléfono:</span>
              <p className="font-semibold text-sm sm:text-base">{shippingAddress.phone}</p>
            </div>
          </div>

          {/* Dirección completa */}
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-xs sm:text-sm text-gray-600">Dirección:</span>
              <div className="space-y-1">
                <p className="font-semibold text-sm sm:text-base">{shippingAddress.address}</p>
                <p className="text-xs sm:text-sm text-gray-700">
                  {shippingAddress.city}, {shippingAddress.state}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  Código Postal: {shippingAddress.zipCode}
                </p>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          {shippingAddress.additionalInfo && (
            <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="font-medium text-xs sm:text-sm text-blue-800">Nota adicional:</span>
              <p className="text-xs sm:text-sm text-blue-700 mt-1">
                {shippingAddress.additionalInfo}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

