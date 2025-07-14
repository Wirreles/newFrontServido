"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, limit, query, orderBy, where, documentId } from "firebase/firestore" // Import documentId
import { useAuth } from "@/contexts/auth-context"
import { Facebook, Instagram, AlertCircle } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"

interface Product {
  id: string
  name: string
  price: number
  imageQuery?: string
  imageUrl?: string
  category?: string
  description?: string
  media?: { url: string; type: string }[] // Added media property
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
  const { currentUser, authLoading, getVenderLink, getDashboardLink } = useAuth()

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [offerAlerts, setOfferAlerts] = useState<OfferAlert[]>([])
  const [showAlert, setShowAlert] = useState(false)
  const [activeAlert, setActiveAlert] = useState<OfferAlert | null>(null)

  useEffect(() => {
    if (authLoading) return

    const fetchData = async () => {
      setLoadingData(true)
      try {
        const categoriesQuery = query(collection(db, "categories"), orderBy("name"), limit(12))
        const categorySnapshot = await getDocs(categoriesQuery)
        setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CategoryItem))

        // Fetch banners
        const bannersQuery = query(
          collection(db, "banners"), 
          where("isActive", "==", true), 
          orderBy("order"), 
          limit(10)
        )
        const bannerSnapshot = await getDocs(bannersQuery)
        setBanners(bannerSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Banner))

        // Fetch a larger set of latest products and then slice them
        const latestProductsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(20))
        const latestProductSnapshot = await getDocs(latestProductsQuery)
        const allLatestProducts = latestProductSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product)

        setFeaturedProducts(allLatestProducts.slice(0, 10)) // First 10 for featured
        setNewProducts(allLatestProducts.slice(10, 20)) // Next 10 for new products

        const brandsQuery = query(collection(db, "brands"), orderBy("name"), limit(8))
        const brandSnapshot = await getDocs(brandsQuery)
        setBrands(brandSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BrandItem))

        // Fetch recently viewed products
        const storedRecentlyViewedIds = JSON.parse(localStorage.getItem("servido-recently-viewed") || "[]")
        if (storedRecentlyViewedIds.length > 0) {
          // Firestore 'in' query has a limit of 10, so we might need multiple queries if more than 10 IDs
          // For simplicity, we'll query for up to 10.
          const recentlyViewedQuery = query(
            collection(db, "products"),
            where(documentId(), "in", storedRecentlyViewedIds.slice(0, 10)),
          )
          const recentlyViewedSnapshot = await getDocs(recentlyViewedQuery)
          const fetchedRecentlyViewed = recentlyViewedSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Product,
          )

          // Sort fetched products to match the order in localStorage
          const orderedRecentlyViewed = storedRecentlyViewedIds
            .map((id: string) => fetchedRecentlyViewed.find((p) => p.id === id))
            .filter(Boolean) as Product[] // Filter out any null/undefined if product not found

          setRecentlyViewedProducts(orderedRecentlyViewed)
        }

        // Fetch offer alerts
        const alertsQuery = query(collection(db, "offerAlerts"), where("isActive", "==", true))
        const alertSnapshot = await getDocs(alertsQuery)
        const alerts = alertSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OfferAlert)
        setOfferAlerts(alerts)
      } catch (error) {
        console.error("Error fetching homepage data:", error)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [authLoading])

  // Lógica para mostrar solo alertas no vistas
  useEffect(() => {
    if (offerAlerts.length === 0) return
    const unseen = offerAlerts.find((alert) => {
      const key = `servido-alert-${alert.id}`
      return !localStorage.getItem(key)
    })
    if (unseen) {
      setActiveAlert(unseen)
    }
  }, [offerAlerts])

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
                          <Image
                            src={banner.imageUrl}
                            alt={banner.title}
                            fill
                            className="object-cover rounded-md"
                            priority={banner.order === 1}
                          />
                        </Link>
                      ) : (
                        <Image
                          src={banner.imageUrl}
                          alt={banner.title}
                          fill
                          className="object-cover rounded-md"
                          priority={banner.order === 1}
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
              <Image
                src="/images/banner-1.png"
                alt="Servido - Para cada momento un producto ideal."
                fill
                className="object-cover rounded-md"
                priority
              />
            </div>
          )}
        </div>
      </section>

      {/* Sliding Categories - Circular Style */}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.id}`}
                  className="flex flex-col items-center p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 ease-in-out"
                >
                  <div className="relative w-20 h-20 mb-2">
                    <Image
                      src={
                        category.imageUrl ||
                        `/placeholder.svg?height=80&width=80&query=${category.iconQuery || category.name + " icon"}`
                      }
                      alt={category.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-sm font-medium text-center">{category.name}</span>
                </Link>
              ))}
            </div>
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
                          <Image
                            src={banner.imageUrl}
                            alt={banner.title}
                            fill
                            className="object-cover rounded-md"
                          />
                        </Link>
                      ) : (
                        <Image
                          src={banner.imageUrl}
                          alt={banner.title}
                          fill
                          className="object-cover rounded-md"
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
            <Image
              src="/images/banner-2.png"
              alt="Servido - Todo lo que necesitas para tu auto lo encontras acá."
              fill
              className="object-cover rounded-md"
            />
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-8 bg-white">
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
                          <Image
                            src={
                              (product.media && product.media.length > 0 && product.media[0].url) ||
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">${product.price.toFixed(2)}</p>
                          <span className="text-xs text-green-600">Envío gratis</span>
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
                          <Image
                            src={
                              (product.media && product.media.length > 0 && product.media[0].url) ||
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">${product.price.toFixed(2)}</p>
                          <span className="text-xs text-green-600">Envío gratis</span>
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
                          <Image
                            src={
                              (product.media && product.media.length > 0 && product.media[0].url) ||
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">${product.price.toFixed(2)}</p>
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

      {/* Registration Banner */}
      {!currentUser && (
        <section className="py-12 bg-purple-600 text-white">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">¿Nuevo en Servido?</h2>
            <p className="text-lg mb-6">
              Regístrate para acceder a ofertas exclusivas, guardar tus favoritos y mucho más.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button asChild size="lg" className="bg-white text-purple-700 hover:bg-gray-100 w-full sm:w-auto">
                <Link href="/signup?role=buyer">Crear cuenta de Comprador</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white text-purple-700 hover:bg-white hover:text-purple-700 w-full sm:w-auto"
              >
                <Link href={getVenderLink()}>Crear cuenta de Vendedor</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Rotating Brands (now horizontal scroll) */}
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
                    <Image
                      src={
                        brand.imageUrl ||
                        `/placeholder.svg?height=60&width=100&query=${brand.logoQuery || brand.name + " logo"}&color=gray`
                      }
                      alt={brand.name}
                      width={100}
                      height={60}
                      objectFit="contain"
                      className="mx-auto"
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
      {activeAlert && (
        <Dialog open={showAlert} onOpenChange={setShowAlert}>
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-6 h-6 text-purple-600" />
                <h2 className="text-lg font-bold">{activeAlert.title}</h2>
              </div>
              <p className="mb-4">{activeAlert.message}</p>
              <button
                onClick={handleCloseAlert}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white pt-12 pb-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Servido Info */}
            <div>
              <div className="mb-3">
                <Image src="/images/logo.png" alt="Servido Logo" width={120} height={40} />
              </div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/acerca-de-nosotros" className="hover:text-blue-400">
                    Acerca de Nosotros
                  </Link>
                </li>
                <li>
                  <Link href="/trabaja-con-nosotros" className="hover:text-blue-400">
                    Trabaja con Nosotros
                  </Link>
                </li>
                <li>
                  <Link href="/terminos-y-condiciones" className="hover:text-blue-400">
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link href="/politicas-de-privacidad" className="hover:text-blue-400">
                    Políticas de Privacidad
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Contacto</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  Email:{" "}
                  <a href="mailto:infoservido.com.ar" className="hover:text-blue-400">
                    infoservido.com.ar
                  </a>
                </li>
                <li>
                  Contacto:{" "}
                  <a href="mailto:contactoservido.com.ar" className="hover:text-blue-400">
                    contactoservido.com.ar
                  </a>
                </li>
              </ul>
              <h3 className="text-lg font-semibold mb-3 mt-6">Síguenos</h3>
              <div className="flex gap-4">
                <Link
                  href="https://facebook.com/servido"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400"
                >
                  <Facebook className="h-6 w-6" />
                  <span className="sr-only">Facebook</span>
                </Link>
                <Link
                  href="https://instagram.com/servido"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400"
                >
                  <Instagram className="h-6 w-6" />
                  <span className="sr-only">Instagram</span>
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Enlaces Rápidos</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/dashboard/buyer" className="hover:text-blue-400">
                    Mis Compras
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-400">
                    Ofertas
                  </Link>
                </li>
                <li>
                  <Link href={getVenderLink()} className="hover:text-blue-400">
                    Vender
                  </Link>
                </li>
                <li>
                  <Link href={getDashboardLink()} className="hover:text-blue-400">
                    Mi Cuenta
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-400">
                    Historial
                  </Link>
                </li>
              </ul>
            </div>

            {/* Motivational Quote */}
            <div className="col-span-full lg:col-span-1 flex flex-col justify-end">
              <p className="text-sm italic text-gray-400 mb-2">
                "La clave para un día productivo es empezar con una mentalidad positiva"
              </p>
              <p className="text-sm font-semibold text-gray-300">Jonathan CEO</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Servido. Todos los derechos reservados.</p>
            <p>Creado por Atenea Software.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
