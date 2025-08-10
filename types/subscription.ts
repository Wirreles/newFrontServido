export interface SubscriptionPricing {
  id: string
  price: number
  isActive: boolean
  createdAt: any
  updatedAt: any
  createdBy: string
  notes?: string
}

export interface SubscriptionPricingHistory {
  id: string
  oldPrice: number
  newPrice: number
  changedAt: any
  changedBy: string
  reason?: string
}
