"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, DollarSign } from "lucide-react"

interface PriceFormatToggleProps {
  onFormatChange?: (useReducedDecimals: boolean) => void
  className?: string
}

export function PriceFormatToggle({ onFormatChange, className = "" }: PriceFormatToggleProps) {
  const [useReducedDecimals, setUseReducedDecimals] = useState(false)

  // Cargar preferencia guardada
  useEffect(() => {
    const savedPreference = localStorage.getItem('priceFormatReducedDecimals')
    if (savedPreference !== null) {
      setUseReducedDecimals(JSON.parse(savedPreference))
    }
  }, [])

  // Guardar preferencia y notificar cambio
  const handleToggle = (checked: boolean) => {
    setUseReducedDecimals(checked)
    localStorage.setItem('priceFormatReducedDecimals', JSON.stringify(checked))
    onFormatChange?.(checked)
  }

  const examplePrice = 1250.00
  const examplePrice2 = 1250.50

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Visualización de Decimales
        </CardTitle>
        <CardDescription>
          Configura cómo se muestran los precios en la aplicación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle principal */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="price-format" className="text-base font-medium">
              Mostrar precios con decimales reducidos
            </Label>
            <p className="text-sm text-muted-foreground">
              Similar a MercadoLibre: $1.250 en lugar de $1.250,00
            </p>
          </div>
          <Switch
            id="price-format"
            checked={useReducedDecimals}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Ejemplos */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Ejemplos de formato:
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Precio completo:</span>
              <Badge variant="outline">
                {useReducedDecimals ? '$1.250' : '$1.250,00'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Con decimales:</span>
              <Badge variant="outline">
                {useReducedDecimals ? '$1.250,50' : '$1.250,50'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Esta configuración se aplicará a todos los precios mostrados en la aplicación. 
            Los cambios se guardan automáticamente en tu navegador.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 