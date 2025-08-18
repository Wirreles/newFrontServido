"use client"

import { useEffect, useState } from 'react'

interface SafeAreaProps {
  children: React.ReactNode
  className?: string
}

export function SafeArea({ children, className = '' }: SafeAreaProps) {
  const [safeAreaTop, setSafeAreaTop] = useState('0px')

  useEffect(() => {
    // Obtener el valor de env() para safe-area-inset-top
    const updateSafeArea = () => {
      // Para iOS y Android modernos
      if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
        setSafeAreaTop('env(safe-area-inset-top)')
      } else {
        // Fallback para dispositivos que no soportan env()
        setSafeAreaTop('0px')
      }
    }

    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    window.addEventListener('orientationchange', updateSafeArea)

    return () => {
      window.removeEventListener('resize', updateSafeArea)
      window.removeEventListener('orientationchange', updateSafeArea)
    }
  }, [])

  return (
    <div 
      className={`safe-area ${className}`}
      style={{
        paddingTop: safeAreaTop,
        minHeight: '100vh',
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  )
}
