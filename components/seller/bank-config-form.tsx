"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CreditCard, Clock, Calendar, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { 
  SellerBankConfig, 
  TAX_RATES
} from "@/types/centralized-payments"
import { 
  validateBankConfig as validateConfig,
  saveSellerBankConfig as saveBankConfig,
  getSellerBankConfig as getBankConfig,
  updateSellerBankConfig as updateBankConfig,
  testFirestoreConnection,
  saveSellerBankConfigSimple
} from "@/lib/centralized-payments-api"

interface BankConfigFormProps {
  sellerId: string
  onConfigSaved?: () => void
}

export function BankConfigForm({ sellerId, onConfigSaved }: BankConfigFormProps) {
  const { toast } = useToast()
  
  // Estado del formulario
  const [config, setConfig] = useState<Partial<SellerBankConfig>>({
    vendedorId: sellerId,
    cbu: "",
    alias: "",
    tipoCuenta: "ahorro",
    banco: "",
    titular: "",
    cuit: "",
    preferenciaRetiro: "a_7_dias",
    impuesto7Dias: TAX_RATES.a_7_dias * 100,
    impuesto15Dias: TAX_RATES.a_15_dias * 100,
    impuesto35Dias: TAX_RATES.a_35_dias * 100,
    isActive: true
  })
  
  // Estados de la UI
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [existingConfig, setExistingConfig] = useState<SellerBankConfig | null>(null)
  
  // Cargar configuración existente
  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        setLoading(true)
        const existing = await getBankConfig(sellerId)
        if (existing) {
          setExistingConfig(existing)
          // Asegurar que los tipos sean correctos al cargar
          setConfig({
            ...existing,
            vendedorId: String(existing.vendedorId || sellerId),
            cbu: String(existing.cbu || ''),
            alias: existing.alias ? String(existing.alias) : '',
            banco: String(existing.banco || ''),
            titular: String(existing.titular || ''),
            cuit: existing.cuit ? String(existing.cuit) : '',
            tipoCuenta: existing.tipoCuenta || 'ahorro',
            preferenciaRetiro: existing.preferenciaRetiro || 'a_7_dias',
            impuesto7Dias: Number(existing.impuesto7Dias || TAX_RATES.a_7_dias * 100),
            impuesto15Dias: Number(existing.impuesto15Dias || TAX_RATES.a_15_dias * 100),
            impuesto35Dias: Number(existing.impuesto35Dias || TAX_RATES.a_35_dias * 100),
            isActive: Boolean(existing.isActive)
          })
        }
      } catch (error) {
        console.error("Error loading bank config:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadExistingConfig()
  }, [sellerId])
  
  // Manejar cambios en el formulario
  const handleInputChange = (field: keyof SellerBankConfig, value: string) => {
    console.log(`Changing field ${field} to:`, value)
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Limpiar errores al cambiar
    if (errors.length > 0) {
      setErrors([])
    }
  }
  
  // Validar y guardar configuración
  const handleSave = async () => {
    let sanitizedConfig: any = null

    try {
      setSaving(true)
      setErrors([])

      // Validar solo los campos principales
      const mainErrors = []
      if (!config.cbu || String(config.cbu).trim() === "") mainErrors.push("El CBU es obligatorio")
      if (!config.banco || String(config.banco).trim() === "") mainErrors.push("El banco es obligatorio")
      if (!config.titular || String(config.titular).trim() === "") mainErrors.push("El titular es obligatorio")
      if (mainErrors.length > 0) {
        setErrors(mainErrors)
        setSaving(false)
        return
      }

      // Guardar el objeto tal como viene, pero forzando todos los valores a string (excepto booleanos y números)
      sanitizedConfig = {};
      Object.entries(config).forEach(([key, value]) => {
        if (typeof value === "boolean" || typeof value === "number" || value === null || value === undefined) {
          sanitizedConfig[key] = value;
        } else {
          sanitizedConfig[key] = String(value);
        }
      });

      // Guardar o actualizar
      if (existingConfig) {
        await updateBankConfig(existingConfig.id, sanitizedConfig)
        toast({
          title: "Configuración actualizada",
          description: "Tus datos bancarios han sido actualizados correctamente",
        })
      } else {
        const configToSave = sanitizedConfig as Omit<SellerBankConfig, 'id' | 'createdAt' | 'updatedAt'>
        const newId = await saveBankConfig(configToSave)
        setExistingConfig({ ...sanitizedConfig, id: newId } as SellerBankConfig)
        toast({
          title: "Configuración guardada",
          description: "Tus datos bancarios han sido guardados correctamente",
        })
      }

      onConfigSaved?.()
    } catch (error) {
      console.error("Error saving bank config:", error)
      toast({
        title: "Error",
        description: `No se pudo guardar la configuración bancaria: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }
  
  // Obtener información de impuestos según preferencia
  const getTaxInfo = (preference: string) => {
    switch (preference) {
      case "a_7_dias":
        return {
          rate: Math.round(TAX_RATES.a_7_dias * 100 * 100) / 100,
          description: "Retiro a 7 días - Comisión moderada"
        }
      case "a_15_dias":
        return {
          rate: Math.round(TAX_RATES.a_15_dias * 100 * 100) / 100,
          description: "Retiro a 15 días - Comisión reducida"
        }
      case "a_35_dias":
        return {
          rate: Math.round(TAX_RATES.a_35_dias * 100 * 100) / 100,
          description: "Retiro a 35 días - Menor comisión"
        }
      default:
        return { rate: 0, description: "" }
    }
  }
  
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg font-semibold text-gray-700">Cargando configuración...</span>
      </div>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Configuración Bancaria
        </CardTitle>
        <CardDescription>
          Configura tus datos bancarios para recibir pagos del sistema centralizado
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Estado de configuración */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {existingConfig ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Configuración guardada</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Configuración pendiente</span>
              </>
            )}
          </div>
          <Badge variant={existingConfig ? "default" : "secondary"}>
            {existingConfig ? "Activa" : "Pendiente"}
          </Badge>
        </div>
        
        {/* Errores de validación */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errores de validación</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Formulario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CBU */}
          <div className="space-y-2">
            <Label htmlFor="cbu">CBU *</Label>
            <Input
              id="cbu"
              value={config.cbu || ""}
              onChange={(e) => handleInputChange("cbu", e.target.value)}
              placeholder="22 dígitos"
              maxLength={22}
            />
            <p className="text-xs text-gray-500">
              Clave Bancaria Uniforme (22 dígitos)
            </p>
          </div>
          
          {/* Alias */}
          <div className="space-y-2">
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              value={config.alias || ""}
              onChange={(e) => handleInputChange("alias", e.target.value)}
              placeholder="mi.alias.banco"
            />
            <p className="text-xs text-gray-500">
              Alias de tu cuenta bancaria (opcional)
            </p>
          </div>
          
          {/* Banco */}
          <div className="space-y-2">
            <Label htmlFor="banco">Banco *</Label>
            <Input
              id="banco"
              value={config.banco || ""}
              onChange={(e) => handleInputChange("banco", e.target.value)}
              placeholder="Nombre del banco"
            />
          </div>
          
          {/* Tipo de cuenta */}
          <div className="space-y-2">
            <Label htmlFor="tipoCuenta">Tipo de cuenta *</Label>
            <Select
              value={config.tipoCuenta || "ahorro"}
              onValueChange={(value) => handleInputChange("tipoCuenta", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ahorro">Caja de Ahorro</SelectItem>
                <SelectItem value="corriente">Cuenta Corriente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Titular */}
          <div className="space-y-2">
            <Label htmlFor="titular">Titular de la cuenta *</Label>
            <Input
              id="titular"
              value={config.titular || ""}
              onChange={(e) => handleInputChange("titular", e.target.value)}
              placeholder="Nombre completo del titular"
            />
          </div>
          
          {/* CUIT */}
          <div className="space-y-2">
            <Label htmlFor="cuit">CUIT</Label>
            <Input
              id="cuit"
              value={config.cuit || ""}
              onChange={(e) => handleInputChange("cuit", e.target.value)}
              placeholder="XX-XXXXXXXX-X"
            />
            <p className="text-xs text-gray-500">
              CUIT del titular (opcional)
            </p>
          </div>
        </div>
        
        {/* Preferencia de retiro */}
        <div className="space-y-4">
          <Label>Preferencia de retiro *</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: "a_7_dias", label: "7 días", icon: Calendar },
              { value: "a_15_dias", label: "15 días", icon: Calendar },
              { value: "a_35_dias", label: "35 días", icon: Calendar }
            ].map((option) => {
              const taxInfo = getTaxInfo(option.value)
              const isSelected = config.preferenciaRetiro === option.value
              
              return (
                <div
                  key={option.value}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleInputChange("preferenciaRetiro", option.value)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <option.icon className="h-4 w-4" />
                    <span className="font-medium">{option.label}</span>
                    {isSelected && <CheckCircle className="h-4 w-4 text-blue-600" />}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {taxInfo.description}
                  </p>
                  <Badge variant={isSelected ? "default" : "secondary"}>
                    {taxInfo.rate}% de comisión
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Información adicional */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Información importante</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Los pagos se procesan manualmente desde el panel de administración</li>
              <li>Se aplica una comisión del 12% sobre cada venta</li>
              <li>Las comisiones varían según la preferencia de retiro seleccionada</li>
              <li>Asegúrate de que los datos bancarios sean correctos para evitar demoras</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        {/* Botones de prueba temporal */}
        <div className="flex justify-between">
          {/* Elimina los botones de prueba temporal y deja solo el botón de guardar */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {existingConfig ? "Actualizar" : "Guardar"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 