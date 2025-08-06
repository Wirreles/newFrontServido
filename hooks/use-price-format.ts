"use client"

import { useState, useEffect } from "react"
import { formatPrice, formatPriceNumber, formatPriceReduced, formatPriceNumberReduced } from "@/lib/utils"

export function usePriceFormat() {
  const [useReducedDecimals, setUseReducedDecimals] = useState(false)

  // Cargar preferencia guardada al inicializar
  useEffect(() => {
    const savedPreference = localStorage.getItem('priceFormatReducedDecimals')
    if (savedPreference !== null) {
      setUseReducedDecimals(JSON.parse(savedPreference))
    }
  }, [])

  // Función para formatear precio con símbolo de moneda
  const formatPriceWithConfig = (price: number): string => {
    return useReducedDecimals ? formatPriceReduced(price) : formatPrice(price)
  }

  // Función para formatear precio sin símbolo de moneda
  const formatPriceNumberWithConfig = (price: number): string => {
    return useReducedDecimals ? formatPriceNumberReduced(price) : formatPriceNumber(price)
  }

  // Función para actualizar la configuración
  const updatePriceFormat = (useReduced: boolean) => {
    setUseReducedDecimals(useReduced)
    localStorage.setItem('priceFormatReducedDecimals', JSON.stringify(useReduced))
  }

  return {
    useReducedDecimals,
    formatPrice: formatPriceWithConfig,
    formatPriceNumber: formatPriceNumberWithConfig,
    updatePriceFormat
  }
} 