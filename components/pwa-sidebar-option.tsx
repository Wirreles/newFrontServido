"use client"

import { useState, useEffect } from 'react'
import { Download, Smartphone } from 'lucide-react'

export function PWASidebarOption() {
  const [showOption, setShowOption] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Verificar si el usuario eligió "Más tarde"
    const remindLater = localStorage.getItem('pwa-remind-later')
    const remindDate = localStorage.getItem('pwa-remind-date')
    
    if (remindLater === 'true' && remindDate) {
      // Mostrar después de 24 horas
      const remindTime = new Date(remindDate).getTime()
      const now = new Date().getTime()
      const hoursDiff = (now - remindTime) / (1000 * 60 * 60)
      
      if (hoursDiff >= 24) {
        setShowOption(true)
      }
    }

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        // Limpiar localStorage y ocultar opción
        localStorage.removeItem('pwa-remind-later')
        localStorage.removeItem('pwa-remind-date')
        setShowOption(false)
        setDeferredPrompt(null)
      }
    }
  }

  const handleDismiss = () => {
    // Ocultar por 7 días
    const dismissDate = new Date()
    dismissDate.setDate(dismissDate.getDate() + 7)
    localStorage.setItem('pwa-dismiss-until', dismissDate.toISOString())
    setShowOption(false)
  }

  // No mostrar si no hay prompt o si está oculto
  if (!showOption || !deferredPrompt) {
    return null
  }

  return (
    <div className="p-3 border-t border-gray-200">
      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
        <div className="flex items-center space-x-2 mb-2">
          <Smartphone className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">Instalar Aplicación</span>
        </div>
        
        <p className="text-xs text-purple-700 mb-3">
          Descarga la app de Servido en tu dispositivo
        </p>
        
        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-purple-600 text-white text-xs px-3 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            <Download className="w-3 h-3 inline mr-1" />
            Instalar App
          </button>
          
          <button
            onClick={handleDismiss}
            className="text-xs text-purple-600 hover:text-purple-800 transition-colors"
          >
            Ocultar
          </button>
        </div>
      </div>
    </div>
  )
}
