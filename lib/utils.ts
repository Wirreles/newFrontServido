import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-fallback-encryption-key-min-32-chars!!"
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para formatear precios con símbolo de moneda (sin decimales)
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Función para formatear precios sin símbolo de moneda (sin decimales)
export function formatPriceNumber(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Función para formatear precios reducidos (sin decimales)
export function formatPriceReduced(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Función para formatear precios reducidos sin símbolo de moneda (sin decimales)
export function formatPriceNumberReduced(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Limpiar y formatear precio (sin decimales)
export function cleanAndFormatPrice(price: string | number): string {
  const priceStr = typeof price === 'number' ? price.toString() : price
  const cleaned = priceStr.replace(/[^\d.,]/g, '')
  const numPrice = parseFloat(cleaned.replace(',', '.'))
  if (isNaN(numPrice)) {
    return formatPriceNumber(0)
  }
  return formatPriceNumber(Math.round(numPrice))
}

// Formatear números grandes (sin decimales)
export function formatLargeNumber(num: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)

  // Crear clave usando PBKDF2
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha512")

  // Crear cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encriptar
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final()
  ])

  // Obtener tag de autenticación
  const tag = cipher.getAuthTag()

  // Combinar todo en un solo string (Base64)
  const result = Buffer.concat([salt, iv, tag, encrypted])
  return result.toString("base64")
}

export function decrypt(encryptedText: string): string {
  // Convertir de Base64 a Buffer
  const buffer = Buffer.from(encryptedText, "base64")

  // Extraer componentes
  const salt = buffer.subarray(0, SALT_LENGTH)
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const content = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  // Recrear clave
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha512")

  // Crear decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  // Desencriptar
  const decrypted = Buffer.concat([
    decipher.update(content),
    decipher.final()
  ])

  return decrypted.toString("utf8")
}
