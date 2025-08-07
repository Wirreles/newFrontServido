"use client"

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface SimpleImageProps {
  src: string
  alt: string
  width?: number | string
  height?: number | string
  className?: string
  priority?: boolean
  onError?: () => void
  fallbackSrc?: string
  placeholderText?: string
}

export function SimpleImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  onError,
  fallbackSrc = "/placeholder.svg",
  placeholderText
}: SimpleImageProps) {
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
      
      <img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}
