"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Smartphone, 
  Globe,
  Info
} from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Verificar si ya está instalado
    const checkInstallation = () => {
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true)
    }

    // Verificar estado de conexión
    const checkOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    // Escuchar eventos de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    // Escuchar eventos de instalación exitosa
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    // Verificaciones iniciales
    checkInstallation()
    checkOnlineStatus()

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)
    window.addEventListener('resize', checkInstallation)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', checkOnlineStatus)
      window.removeEventListener('offline', checkOnlineStatus)
      window.removeEventListener('resize', checkInstallation)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('Usuario aceptó instalar la PWA')
      } else {
        console.log('Usuario rechazó instalar la PWA')
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('Error al instalar la PWA:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  // No mostrar si ya está instalado
  if (isInstalled) {
    return (
      <Card className="w-full max-w-md mx-auto bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            PWA Instalada
          </CardTitle>
          <CardDescription className="text-green-700">
            ¡Servido está instalado como aplicación!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Smartphone className="w-4 h-4" />
            <span>Modo standalone activado</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No mostrar si no hay prompt de instalación
  if (!showPrompt) {
    return null
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Download className="w-5 h-5" />
          Instalar Servido
        </CardTitle>
        <CardDescription className="text-blue-700">
          Instala Servido como aplicación para una mejor experiencia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado de la PWA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Estado de la PWA:</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Modo:</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {isStandalone ? 'Standalone' : 'Navegador'}
            </Badge>
          </div>
        </div>

        {/* Beneficios */}
        <div className="bg-blue-100 rounded-lg p-3">
          <h4 className="font-medium text-blue-800 mb-2">Beneficios de instalar:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Acceso rápido desde el escritorio</li>
            <li>• Experiencia de app nativa</li>
            <li>• Funcionamiento offline</li>
            <li>• Sin barra del navegador</li>
          </ul>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button 
            onClick={handleInstallClick}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Instalar
          </Button>
          
          <Button 
            onClick={handleDismiss}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Más tarde
          </Button>
        </div>

        {/* Información adicional */}
        <div className="text-xs text-blue-600 text-center">
          <Info className="w-3 h-3 inline mr-1" />
          La instalación solo funciona en navegadores compatibles
        </div>
      </CardContent>
    </Card>
  )
}
