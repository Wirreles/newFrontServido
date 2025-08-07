"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { SimpleImage } from '@/components/ui/simple-image'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Product {
  id: string
  name: string
  price: number
  imageQuery?: string
  imageUrl?: string
  category?: string
  description?: string
  media?: { url: string; type: string }[] // Added media property
  condition?: 'nuevo' | 'usado' // Added condition property
  freeShipping?: boolean // Added freeShipping property
  shippingCost?: number // Added shippingCost property
}

interface CategoryItem {
  id: string
  name: string
  iconQuery?: string
  imageUrl?: string
}

interface BrandItem {
  id: string
  name: string
  logoQuery?: string
  imageUrl?: string
}

interface Banner {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string
  order: number
  isActive: boolean
}

interface OfferAlert {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
  isActive: boolean
  startDate?: any
  endDate?: any
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [activeAlert, setActiveAlert] = useState<OfferAlert | null>(null)
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        // Fetch featured products - simplificado
        const featuredQuery = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
        const featuredSnapshot = await getDocs(featuredQuery)
        const featuredData = featuredSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
        setFeaturedProducts(featuredData)

        // Fetch new products - simplificado
        const newQuery = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
        const newSnapshot = await getDocs(newQuery)
        const newData = newSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
        setNewProducts(newData)

        // Fetch categories
        const categoriesQuery = query(collection(db, 'categories'), orderBy('name'))
        const categoriesSnapshot = await getDocs(categoriesQuery)
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CategoryItem[]
        setCategories(categoriesData)

        // Fetch brands
        const brandsQuery = query(collection(db, 'brands'), orderBy('name'))
        const brandsSnapshot = await getDocs(brandsQuery)
        const brandsData = brandsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BrandItem[]
        setBrands(brandsData)

        // Fetch banners
        const bannersQuery = query(
          collection(db, 'banners'),
          orderBy('order')
        )
        const bannersSnapshot = await getDocs(bannersQuery)
        const bannersData = bannersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Banner[]
        setBanners(bannersData)

        // Fetch recently viewed products from localStorage
        const recentlyViewed = localStorage.getItem('recentlyViewedProducts')
        if (recentlyViewed) {
          const recentIds = JSON.parse(recentlyViewed).slice(0, 5)
          if (recentIds.length > 0) {
            const recentProducts = await Promise.all(
              recentIds.map(async (id: string) => {
                const doc = await getDocs(query(collection(db, 'products'), where('__name__', '==', id)))
                if (!doc.empty) {
                  return { id: doc.docs[0].id, ...doc.docs[0].data() } as Product
                }
                return null
              })
            )
            setRecentlyViewedProducts(recentProducts.filter(Boolean) as Product[])
          }
        }

        // Fetch active alerts
        const alertsQuery = query(
          collection(db, 'alerts'),
          orderBy('createdAt', 'desc'),
          limit(1)
        )
        const alertsSnapshot = await getDocs(alertsQuery)
        if (!alertsSnapshot.empty) {
          const alertData = alertsSnapshot.docs[0].data() as OfferAlert
          const now = new Date()
          const startDate = alertData.startDate?.toDate?.() || new Date(0)
          const endDate = alertData.endDate?.toDate?.() || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          
          if (now >= startDate && now <= endDate) {
            const seen = localStorage.getItem(`servido-alert-${alertsSnapshot.docs[0].id}`)
            if (!seen) {
              setActiveAlert({ ...alertData, id: alertsSnapshot.docs[0].id })
            }
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  const handleOpenAlert = () => {
    setShowAlert(true)
    if (activeAlert) {
      localStorage.setItem(`servido-alert-${activeAlert.id}`, "seen")
    }
  }
  
  const handleCloseAlert = () => {
    setShowAlert(false)
    setActiveAlert(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-900">
      {/* Dynamic Banner Carousel */}
      <section className="w-full pt-4 pb-8">
        <div className="w-full max-w-screen-xl mx-auto">
          {banners.length > 0 ? (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent>
                {banners.map((banner) => (
                  <CarouselItem key={banner.id}>
                    <div className="aspect-[16/5] md:aspect-[16/4] relative">
                      {banner.linkUrl ? (
                        <Link href={banner.linkUrl}>
                          <SimpleImage
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-full object-cover rounded-md"
                          />
                        </Link>
                      ) : (
                        <SimpleImage
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : (
            // Fallback to default banners if no dynamic banners
            <div className="aspect-[16/5] md:aspect-[16/4] relative">
              <SimpleImage
                src="/images/banner-1.png"
                alt="Servido - Para cada momento un producto ideal."
                className="w-full h-full object-cover rounded-md"
              />
            </div>
          )}
        </div>
      </section>

      {/* Categories Carousel */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Categorías</h2>
            <Link href="/products" className="text-blue-600 hover:underline text-sm font-medium">
              Mostrar todas las categorías
            </Link>
          </div>
          {loadingData && categories.length === 0 ? (
            <p className="text-gray-500">Cargando categorías...</p>
          ) : categories.length === 0 ? (
            <p className="text-gray-500">No hay categorías disponibles.</p>
          ) : (
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {categories.map((category) => (
                  <CarouselItem key={category.id} className="pl-4 basis-[120px] sm:basis-[140px] md:basis-[160px]">
                    <Link
                      href={`/category/${category.id}`}
                      className="flex flex-col items-center transition-all duration-200 ease-in-out hover:scale-105"
                    >
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-3 rounded-full overflow-hidden bg-white shadow-md hover:shadow-lg flex items-center justify-center">
                        <SimpleImage
                          src={
                            category.imageUrl ||
                            `/placeholder.svg?height=96&width=96&query=${category.iconQuery || category.name + " icon"}`
                          }
                          alt={category.name}
                          className="w-full h-full object-contain p-3"
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-center text-gray-700 leading-tight">{category.name}</span>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
        </div>
      </section>

      {/* Second Dynamic Banner Carousel */}
      {banners.length > 1 && (
        <section className="w-full py-8">
          <div className="w-full max-w-screen-xl mx-auto">
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent>
                {banners.slice(1).map((banner) => (
                  <CarouselItem key={banner.id}>
                    <div className="aspect-[16/5] md:aspect-[16/4] relative">
                      {banner.linkUrl ? (
                        <Link href={banner.linkUrl}>
                          <SimpleImage
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-full object-cover rounded-md"
                          />
                        </Link>
                      ) : (
                        <SimpleImage
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </section>
      )}
      
      {/* Fallback Second Banner if no dynamic banners */}
      {banners.length <= 1 && (
        <section className="w-full py-8">
          <div className="w-full max-w-screen-xl mx-auto aspect-[16/5] md:aspect-[16/4] relative">
            <SimpleImage
              src="/images/banner-2.png"
              alt="Servido - Todo lo que necesitas para tu auto lo encontras acá."
              className="w-full h-full object-cover rounded-md"
            />
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-semibold mb-6">Productos Destacados</h2>
          {loadingData && featuredProducts.length === 0 ? (
            <p>Cargando productos destacados...</p>
          ) : featuredProducts.length === 0 ? (
            <p>No hay productos destacados en este momento.</p>
          ) : (
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {featuredProducts.map((product) => (
                  <CarouselItem key={product.id} className="pl-4 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Link href={`/product/${product.id}`} className="block">
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                        <div className="aspect-square relative w-full">
                          <SimpleImage
                            src={
                              (product.media && product.media.length > 0 && product.media[0].url) ||
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">{formatPrice(product.price)}</p>
                          {/* Condición */}
                          {product.condition && (
                            <span className="text-xs font-medium text-gray-700 mb-1">
                              {product.condition === 'nuevo' ? 'Nuevo' : 'Usado'}
                            </span>
                          )}
                          {/* Envío */}
                          {product.freeShipping ? (
                            <span className="text-xs text-green-600">Envío gratis</span>
                          ) : (
                            <span className="text-xs text-gray-600">Envío: {product.shippingCost !== undefined ? formatPrice(product.shippingCost) : '-'}</span>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
        </div>
      </section>

      {/* New Products */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-semibold mb-6">Productos Nuevos</h2>
          {loadingData && newProducts.length === 0 ? (
            <p>Cargando productos nuevos...</p>
          ) : newProducts.length === 0 ? (
            <p>No hay productos nuevos en este momento.</p>
          ) : (
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {newProducts.map((product) => (
                  <CarouselItem key={product.id} className="pl-4 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Link href={`/product/${product.id}`} className="block">
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                        <div className="aspect-square relative w-full">
                          <SimpleImage
                            src={
                              (product.media && product.media.length > 0 && product.media[0].url) ||
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">{formatPrice(product.price)}</p>
                          {/* Condición */}
                          {product.condition && (
                            <span className="text-xs font-medium text-gray-700 mb-1">
                              {product.condition === 'nuevo' ? 'Nuevo' : 'Usado'}
                            </span>
                          )}
                          {/* Envío */}
                          {product.freeShipping ? (
                            <span className="text-xs text-green-600">Envío gratis</span>
                          ) : (
                            <span className="text-xs text-gray-600">Envío: {product.shippingCost !== undefined ? formatPrice(product.shippingCost) : '-'}</span>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
        </div>
      </section>

      {/* Recently Viewed Products */}
      {recentlyViewedProducts.length > 0 && (
        <section className="py-8 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl font-semibold mb-6">Productos Vistos Recientemente</h2>
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {recentlyViewedProducts.map((product) => (
                  <CarouselItem key={product.id} className="pl-4 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Link href={`/product/${product.id}`} className="block">
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                        <div className="aspect-square relative w-full">
                          <SimpleImage
                            src={
                              (product.media && product.media.length > 0 && product.media[0].url) ||
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">{formatPrice(product.price)}</p>
                          <span className="text-xs text-green-600">Envío gratis</span>
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </section>
      )}

      {/* Brands Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-semibold mb-8 text-center">Nuestras Marcas</h2>
          {loadingData && brands.length === 0 ? (
            <p>Cargando marcas...</p>
          ) : brands.length === 0 ? (
            <p>No hay marcas para mostrar.</p>
          ) : (
            <div className="relative w-full overflow-hidden py-4">
              <div
                className="flex items-center w-max animate-infinite-scroll"
                style={{ "--scroll-speed": "30s" } as React.CSSProperties}
              >
                {/* Duplicate brands to create a seamless loop */}
                {brands.concat(brands).map((brand, index) => (
                  <div key={`${brand.id}-${index}`} className="flex-shrink-0 px-4" style={{ width: "150px" }}>
                    <SimpleImage
                      src={
                        brand.imageUrl ||
                        `/placeholder.svg?height=60&width=100&query=${brand.logoQuery || brand.name + " logo"}&color=gray`
                      }
                      alt={brand.name}
                      width={100}
                      height={60}
                      className="mx-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Alerta flotante tipo círculo */}
      {activeAlert && !showAlert && (
        <button
          onClick={handleOpenAlert}
          className="fixed z-50 bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg hover:bg-purple-700 transition-all"
          aria-label="Ver alerta"
        >
          <AlertCircle className="w-8 h-8" />
        </button>
      )}

      {/* Modal de alerta */}
      {showAlert && activeAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">{activeAlert.title}</h3>
            <p className="text-gray-600 mb-4">{activeAlert.message}</p>
            <button
              onClick={handleCloseAlert}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
