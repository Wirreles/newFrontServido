"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PaymentDateButtonProps {
  paymentDate?: string | null
  productName?: string
  amount?: number
  status?: 'pendiente' | 'pagado' | 'cancelado'
  className?: string
}

export function PaymentDateButton({ 
  paymentDate, 
  productName = "Producto", 
  amount = 0,
  status = 'pendiente',
  className = "" 
}: PaymentDateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Fecha no disponible'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pagado':
        return 'bg-green-100 text-green-800'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pagado':
        return 'Pagado'
      case 'pendiente':
        return 'Pendiente'
      case 'cancelado':
        return 'Cancelado'
      default:
        return 'Desconocido'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`flex items-center gap-2 ${className}`}
        >
          <Calendar className="h-4 w-4" />
          Fecha de Pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Información de Pago
          </DialogTitle>
          <DialogDescription>
            Detalles sobre el pago de {productName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Estado del pago */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Estado:</span>
            <Badge className={getStatusColor(status)}>
              {getStatusText(status)}
            </Badge>
          </div>

          {/* Fecha de pago */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Fecha de Pago:</span>
            <span className="text-sm">
              {paymentDate ? formatDate(paymentDate) : 'No disponible'}
            </span>
          </div>

          {/* Monto */}
          {amount > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Monto:</span>
              <span className="font-semibold text-green-600">
                ${amount.toLocaleString('es-AR')}
              </span>
            </div>
          )}

          {/* Información adicional */}
          {!paymentDate && status === 'pendiente' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> El pago se procesará según la configuración establecida. 
                Los vendedores reciben sus pagos descontando la comisión del 12%.
              </p>
            </div>
          )}

          {paymentDate && status === 'pagado' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>✓ Pago completado:</strong> El vendedor ha recibido el pago correspondiente.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 