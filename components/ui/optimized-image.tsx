"use client"

import Image from 'next/image'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getBestImageUrl, getPlaceholderUrl } from '@/lib/image-config'

interface OptimizedImageProps {
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
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = "",
  priority = false,
  sizes,
  onError,
  fallbackSrc,
  placeholderText
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(() => 
    getBestImageUrl(src, fallbackSrc, placeholderText)
  )

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    if (currentSrc !== getPlaceholderUrl(width || 200, height || 200, placeholderText)) {
      setCurrentSrc(getPlaceholderUrl(width || 200, height || 200, placeholderText))
      setHasError(true)
    } else {
      setIsLoading(false)
    }
    onError?.()
  }

  // Si la imagen está en error y ya intentamos el fallback, mostrar skeleton
  if (hasError && currentSrc === getPlaceholderUrl(width || 200, height || 200, placeholderText)) {
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
        unoptimized={true} // Usar imágenes no optimizadas para evitar límites de Vercel
      />
    </div>
  )
}
