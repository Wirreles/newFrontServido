"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Smartphone, 
  Zap,
  Shield
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
  const [showPrompt, setShowPrompt] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    // Verificar si ya está instalado
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      setIsInstalled(isStandalone || (window.navigator as any).standalone === true)
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
      setShowSuccessMessage(true)
      setDeferredPrompt(null)
      
      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 5000)
    }

    // Verificaciones iniciales
    checkInstallation()

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('resize', checkInstallation)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
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
    // Guardar en localStorage para mostrar en sidebar
    localStorage.setItem('pwa-remind-later', 'true')
    localStorage.setItem('pwa-remind-date', new Date().toISOString())
  }

  // Mensaje de éxito temporal (se auto-oculta)
  if (showSuccessMessage) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-50 animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-green-100" />
          <div className="flex-1">
            <h3 className="font-semibold">¡Aplicación Instalada!</h3>
            <p className="text-sm opacity-90">La app de Servido está disponible en tu pantalla de inicio</p>
          </div>
        </div>
      </div>
    )
  }

  // Si ya está instalado, no mostrar nada
  if (isInstalled) {
    return null
  }

  // No mostrar si no hay prompt de instalación
  if (!showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg max-w-sm z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0">
            <Download className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Instalar Aplicación Servido</h3>
            <p className="text-sm text-gray-600">Descarga la app de Servido en tu dispositivo</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Acceso rápido desde el escritorio</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <span>Experiencia de aplicación nativa</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-green-500" />
            <span>Funciona sin internet</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={handleInstallClick}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Instalar App
          </Button>
          
          <Button 
            onClick={handleDismiss}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Más tarde
          </Button>
        </div>

        <button
          onClick={() => setShowPrompt(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
