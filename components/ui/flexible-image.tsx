"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'

interface FlexibleImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  priority?: boolean
  sizes?: string
  onError?: () => void
  fallbackSrc?: string
  placeholderText?: string
  useNextImage?: boolean // Para forzar el uso de next/image si es necesario
}

export function FlexibleImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = "",
  priority = false,
  sizes,
  onError,
  fallbackSrc = "/placeholder.svg",
  placeholderText,
  useNextImage = false // Por defecto usar img normal
}: FlexibleImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(true)
    } else {
      setIsLoading(false)
    }
    onError?.()
  }

  // Si la imagen está en error y ya intentamos el fallback, mostrar skeleton
  if (hasError && currentSrc === fallbackSrc) {
    return (
      <div className={`relative ${className}`}>
        <Skeleton className="w-full h-full" />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <Skeleton className="absolute inset-0 z-10" />
      )}
      
      {useNextImage ? (
        // Usar next/image solo cuando sea explícitamente requerido
        <Image
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          priority={priority}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          unoptimized={true} // Siempre usar unoptimized para evitar límites
        />
      ) : (
        // Usar img normal por defecto (más rápido, sin límites)
        <img
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined}
        />
      )}
    </div>
  )
}
