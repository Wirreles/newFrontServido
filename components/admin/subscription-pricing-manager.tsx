"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  DollarSign, 
  Edit, 
  Plus, 
  Save, 
  X, 
  History, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { SubscriptionPricing, SubscriptionPricingHistory } from '@/types/subscription'

interface SubscriptionPricingManagerProps {
  currentUserId: string
}

export default function SubscriptionPricingManager({ currentUserId }: SubscriptionPricingManagerProps) {
  const [currentPricing, setCurrentPricing] = useState<SubscriptionPricing | null>(null)
  const [pricingHistory, setPricingHistory] = useState<SubscriptionPricingHistory[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  
  const { toast } = useToast()

  // Cargar datos iniciales
  useEffect(() => {
    fetchCurrentPricing()
    fetchPricingHistory()
  }, [currentUserId])

  const fetchCurrentPricing = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/subscription-pricing')
      if (response.ok) {
        const data = await response.json()
        setCurrentPricing(data)
      } else if (response.status === 404) {
        setCurrentPricing(null)
      }
    } catch (error) {
      console.error('Error al cargar precio actual:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el precio actual de suscripción',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPricingHistory = async () => {
    try {
      const response = await fetch('/api/admin/subscription-pricing/history')
      if (response.ok) {
        const data = await response.json()
        setPricingHistory(data)
      }
    } catch (error) {
      console.error('Error al cargar historial:', error)
    }
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    setIsEditing(false)
    setPrice('')
    setNotes('')
  }

  const handleEdit = () => {
    if (!currentPricing) return
    
    setIsEditing(true)
    setIsCreating(false)
    setPrice(currentPricing.price.toString())
    setNotes(currentPricing.notes || '')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsCreating(false)
    setPrice('')
    setNotes('')
  }

  const handleSave = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un precio válido',
        variant: 'destructive'
      })
      return
    }

    if (!currentUserId || currentUserId.trim() === '') {
      toast({
        title: 'Error',
        description: 'ID de usuario no válido. Por favor, recarga la página e intenta nuevamente.',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      
      if (isCreating) {
        // Crear nuevo precio
        const response = await fetch('/api/admin/subscription-pricing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            price: parseFloat(price),
            notes,
            createdBy: currentUserId
          })
        })

        if (response.ok) {
          toast({
            title: 'Éxito',
            description: 'Nuevo precio de suscripción creado correctamente'
          })
          await fetchCurrentPricing()
          await fetchPricingHistory()
          handleCancel()
        } else {
          const error = await response.json()
          throw new Error(error.error || 'Error al crear precio')
        }
      } else if (isEditing && currentPricing) {
        // Actualizar precio existente
        const response = await fetch('/api/admin/subscription-pricing', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: currentPricing.id,
            price: parseFloat(price),
            notes,
            updatedBy: currentUserId
          })
        })

        if (response.ok) {
          toast({
            title: 'Éxito',
            description: 'Precio de suscripción actualizado correctamente'
          })
          await fetchCurrentPricing()
          await fetchPricingHistory()
          handleCancel()
        } else {
          const error = await response.json()
          throw new Error(error.error || 'Error al actualizar precio')
        }
      }
    } catch (error) {
      console.error('Error al guardar:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al guardar el precio',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Gestión de Precios de Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-2">Cargando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Precio Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Precio Actual de Suscripción
          </CardTitle>
          <CardDescription>
            Gestiona el precio de suscripción para que los vendedores puedan crear servicios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPricing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                                                    <p className="text-2xl font-bold text-green-700">
                                  ARS {currentPricing.price.toFixed(2)}
                                </p>
                    <p className="text-sm text-green-600">
                      Precio activo desde {formatDate(currentPricing.createdAt)}
                    </p>
                    {currentPricing.notes && (
                      <p className="text-sm text-green-600 mt-1">
                        Notas: {currentPricing.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEdit} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button onClick={handleCreateNew} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Precio
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay precio configurado
              </h3>
              <p className="text-gray-500 mb-4">
                Es necesario configurar un precio para las suscripciones
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Configurar Primer Precio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario de Creación/Edición */}
      {(isCreating || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating ? 'Crear Nuevo Precio' : 'Editar Precio Actual'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="price">Precio de Suscripción (ARS)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ARS
                  </span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-8"
                    placeholder="29.99"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Razón del cambio de precio, promociones, etc."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isCreating ? 'Crear' : 'Actualizar'}
                    </>
                  )}
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Cambios */}
      {pricingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Cambios de Precio
            </CardTitle>
            <CardDescription>
              Registro de todas las modificaciones realizadas al precio de suscripción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pricingHistory.map((change) => (
                <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">ARS {change.oldPrice.toFixed(2)}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-semibold text-green-600">ARS {change.newPrice.toFixed(2)}</span>
                    </div>
                    {change.reason && (
                      <span className="text-sm text-gray-600">• {change.reason}</span>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{formatDate(change.changedAt)}</div>
                    <div>por {change.changedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información Adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <strong>Precio Único:</strong> Solo se puede tener un precio activo a la vez
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <strong>Historial:</strong> Todos los cambios se registran automáticamente
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <strong>Impacto:</strong> Los cambios se aplican inmediatamente a nuevas suscripciones
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <strong>Servicios:</strong> Este precio permite a los vendedores crear y gestionar servicios
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
