export interface ProductMedia {
  type: "image" | "video"
  url: string
  path: string
  thumbnail?: string // For videos, we'll store a thumbnail
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  media: ProductMedia[] // Changed from single imageUrl to array of media
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
}
