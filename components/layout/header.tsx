"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  MapPin,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Store,
  Package,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { CartDrawer } from "@/components/cart-drawer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { db } from "@/lib/firebase" // Import db
import { collection, getDocs, query, orderBy, where, limit } from "firebase/firestore" // Import Firestore functions

interface CategoryItem {
  id: string
  name: string
  iconQuery?: string
  imageUrl?: string
}

interface SearchProduct {
  id: string
  name: string
  price: number
  imageUrl?: string
  category?: string
  sellerName?: string
}

export function Header() {
  const { currentUser, authLoading, handleLogout, getDashboardLink, getVenderLink } = useAuth()
  const router = useRouter()
  const [location, setLocation] = useState<string>("Cargando ubicación...")
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  
  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Estado para almacenar todos los productos
  const [allProducts, setAllProducts] = useState<SearchProduct[] | null>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            // Using OpenStreetMap Nominatim API for reverse geocoding
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            )
            const data = await response.json()
            if (data.address) {
              const city = data.address.city || data.address.town || data.address.village || data.address.county
              const state = data.address.state
              if (city && state) {
                setLocation(`${city}, ${state}`)
              } else if (city) {
                setLocation(city)
              } else if (state) {
                setLocation(state)
              } else {
                setLocation("Ubicación detectada")
              }
            } else {
              setLocation("Ubicación desconocida")
            }
          } catch (error) {
            console.error("Error fetching location data:", error)
            setLocation("Error al obtener ubicación")
          }
        },
        (error) => {
          console.error("Error getting geolocation:", error)
          setLocation("Ubicación no disponible")
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 },
      )
    } else {
      setLocation("Geolocalización no soportada")
    }

    const fetchCategories = async () => {
      setLoadingCategories(true)
      try {
        const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
        const categorySnapshot = await getDocs(categoriesQuery)
        setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CategoryItem))
      } catch (error) {
        console.error("Error fetching categories for header:", error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  // Nueva función para traer todos los productos una sola vez
  const fetchAllProducts = useCallback(async () => {
    try {
      const productsSnapshot = await getDocs(collection(db, "products"));
      const products: SearchProduct[] = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SearchProduct);
      setAllProducts(products);
    } catch (error) {
      console.error("Error fetching all products for search:", error);
      setAllProducts([]);
    }
  }, [])

  // Modificar handleSearch para filtrar en frontend
  const handleSearch = async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 1) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    setIsSearching(true)
    setShowSearchResults(true)

    // Si no se han traído todos los productos, traerlos
    if (!allProducts) {
      await fetchAllProducts();
    }
    // Filtrar en frontend
    const lowerTerm = trimmed.toLowerCase();
    const filtered = (allProducts || []).filter(product => {
      const name = product.name?.toLowerCase() || "";
      const keywords = Array.isArray((product as any).keywords) ? (product as any).keywords.map((k: string) => k.toLowerCase()) : [];
      return name.includes(lowerTerm) || keywords.some((k: string) => k.includes(lowerTerm));
    });
    setSearchResults(filtered.slice(0, 20));
    setIsSearching(false);
  }

  // Cambiar handleSearchChange para permitir búsqueda desde 1 carácter
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    if (value.trim().length >= 1) {
      handleSearch(value)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  // Manejar envío de búsqueda
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
      setShowSearchResults(false)
      setSearchTerm("")
    }
  }

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setShowSearchResults(false)
  }

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Primary Header */}
      <header className="sticky top-0 z-50 w-full bg-navbar text-navbar-foreground shadow-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-2 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Image
              src="/images/logo.png"
              alt="Servido Logo"
              width={340}
              height={120}
              className="md:w-[340px] md:h-[120px] w-[260px] h-[90px]"
              style={{ objectFit: "contain", filter: "grayscale(1) brightness(1000%)" }}
            />
          </Link>
          <div className="flex-1 max-w-xl mx-0 md:mx-2 search-container">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar productos, marcas y más..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                className="w-full pl-9 pr-9 py-2 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 md:px-10"
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              {/* Resultados de búsqueda */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" />
                      <p className="text-sm text-gray-500 mt-2">Buscando...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((product, index) => (
                        <Link
                          key={product.id}
                          href={`/product/${product.id}`}
                          onClick={() => setShowSearchResults(false)}
                          className="flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors border-b last:border-b-0 border-gray-100"
                        >
                          {product.imageUrl && (
                            <div className="w-10 h-10 relative rounded-sm overflow-hidden flex-shrink-0">
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm break-words line-clamp-2 text-black">{product.name}</p>
                            <p className="text-xs text-purple-600 font-semibold">${product.price.toFixed(2)}</p>
                          </div>
                        </Link>
                      ))}
                      <div className="border-t pt-2 px-3">
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="w-full text-purple-600 hover:bg-purple-50"
                        >
                          Ver todos los resultados
                        </Button>
                      </div>
                    </div>
                  ) : searchTerm.length >= 2 ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500">No se encontraron productos</p>
                      <p className="text-xs text-gray-400 mt-1">Intenta con otros términos</p>
                    </div>
                  ) : null}
                </div>
              )}
            </form>
          </div>
          {/* Right side of header: Desktop links + Cart + Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Desktop-only user/auth links */}
            <div className="hidden md:flex items-center gap-3">
              {authLoading ? null : currentUser ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="hover:opacity-80 hover:bg-purple-700 flex items-center gap-1 p-1 h-auto text-navbar-foreground"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={currentUser.firebaseUser.photoURL || undefined}
                            alt={currentUser.firebaseUser.displayName || "User"}
                          />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{currentUser.firebaseUser.displayName || currentUser.firebaseUser.email?.split("@")[0]}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href={getDashboardLink()} className="flex items-center">
                          {currentUser.role === "admin" && <ShieldCheck className="mr-2 h-4 w-4" />}
                          {currentUser.role === "seller" && <Store className="mr-2 h-4 w-4" />}
                          {(!currentUser.role || currentUser.role === "user") && <User className="mr-2 h-4 w-4" />}
                          Mi Panel
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/buyer">Mis Compras</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/buyer?tab=favorites">Favoritos</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {currentUser.role === "admin" && (
                    <Link
                      href="/admin"
                      className="hover:opacity-80 text-yellow-300 font-semibold flex items-center gap-1"
                    >
                      <ShieldCheck className="h-4 w-4" /> Admin
                    </Link>
                  )}
                  {currentUser.role === "seller" && (
                    <Link
                      href="/dashboard/seller"
                      className="hover:opacity-80 text-orange-300 font-semibold flex items-center gap-1"
                    >
                      <Store className="h-4 w-4" /> Vender
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/signup" className="hover:opacity-80">
                    Crea tu cuenta
                  </Link>
                  <Link href="/login" className="hover:opacity-80">
                    Ingresa
                  </Link>
                  <Link href="#" className="hover:opacity-80">
                    Mis compras
                  </Link>
                </>
              )}
            </div>

            {/* Cart Drawer (visible on both mobile and desktop) */}
            <CartDrawer />

            {/* Mobile-only Sheet Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-navbar-foreground hover:bg-purple-700">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-background text-foreground w-72">
                <div className="p-4">
                  {authLoading ? (
                    <p>Cargando...</p>
                  ) : currentUser ? (
                    <div className="mb-4 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser.firebaseUser.photoURL || undefined} alt={currentUser.firebaseUser.displayName || "User"} />
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-lg break-words">{currentUser.firebaseUser.displayName || currentUser.firebaseUser.email}</p>
                        <p className="text-xs text-muted-foreground break-words">{currentUser.firebaseUser.email}</p>
                        {currentUser.role === "admin" && (
                          <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Admin
                          </span>
                        )}
                        {currentUser.role === "seller" && (
                          <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <Store className="h-3 w-3 mr-1" /> Vendedor
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 space-y-2">
                      <Link href="/login" className="block text-lg font-medium hover:text-primary">
                        Iniciar Sesión
                      </Link>
                      <Link href="/signup" className="block text-base text-muted-foreground hover:text-primary">
                        Crear cuenta
                      </Link>
                    </div>
                  )}
                  <nav className="flex flex-col gap-3">
                    <Link href="/products" className="hover:text-primary py-1 flex items-center">
                      <Package className="h-4 w-4 mr-2" /> Explorar Productos
                    </Link>
                    {!currentUser && (
                      <>
                        <Link href="/login" className="hover:text-primary py-1 flex items-center">
                          <User className="h-4 w-4 mr-2" /> Iniciar Sesión
                        </Link>
                        <Link href="/signup" className="hover:text-primary py-1 flex items-center">
                          <User className="h-4 w-4 mr-2" /> Crear Cuenta
                        </Link>
                      </>
                    )}
                    {/* Mobile Categories */}
                    <div className="py-1">
                      <span className="font-medium text-sm text-muted-foreground">Categorías</span>
                      {loadingCategories ? (
                        <p className="text-xs text-gray-500 mt-1">Cargando categorías...</p>
                      ) : categories.length === 0 ? (
                        <p className="text-xs text-gray-500 mt-1">No hay categorías disponibles.</p>
                      ) : (
                        <div className="flex flex-col gap-1 mt-1 pl-4">
                          {categories.map((category) => (
                            <Link
                              key={category.id}
                              href={`/category/${category.id}`}
                              className="hover:text-primary text-sm break-words"
                            >
                              {category.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link href="/notifications" className="hover:text-primary py-1">
                      Notificaciones
                    </Link>
                    <Link href="#" className="hover:text-primary py-1">
                      Mi cuenta
                    </Link>
                    <Link href={getVenderLink()} className="hover:text-primary py-1 flex items-center">
                      <Store className="h-4 w-4 mr-2 text-orange-500" /> Vender
                    </Link>
                    {currentUser?.role === "admin" && (
                      <Link href="/admin" className="hover:text-primary py-1 flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-2 text-green-600" /> Panel Admin
                      </Link>
                    )}
                    {currentUser?.role === "seller" && (
                      <Link href="/dashboard/seller" className="hover:text-primary py-1 flex items-center">
                        <Store className="h-4 w-4 mr-2 text-orange-600" /> Mi Panel Vendedor
                      </Link>
                    )}
                    {currentUser && (currentUser.role === "user" || !currentUser.role) && (
                      <Link href="/dashboard/buyer" className="hover:text-primary py-1 flex items-center">
                        <User className="h-4 w-4 mr-2 text-purple-600" /> Mi Panel Comprador
                      </Link>
                    )}
                    <Link href="#" className="hover:text-primary py-1">
                      Mis Compras
                    </Link>
                    <Link href="#" className="hover:text-primary py-1">
                      Favoritos
                    </Link>
                    <Link href="/notifications" className="hover:text-primary py-1">
                      Notificaciones
                    </Link>
                    <Link href="#" className="hover:text-primary py-1">
                      Ayuda
                    </Link>
                    {currentUser && (
                      <Button variant="outline" onClick={handleLogout} className="mt-4 w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </Button>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Secondary Navigation Bar */}
      <nav className="bg-navbar text-navbar-foreground py-2 shadow-sm sticky top-16 z-40">
        <div className="container mx-auto flex items-center justify-between px-4 md:px-6 text-xs md:text-sm">
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
            <MapPin className="h-4 w-4" />
            <span>Enviar a {location}</span>
            <ChevronDown className="h-3 w-3" />
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/products" className="hover:opacity-80">
              Explorar Productos
            </Link>
            {/* Desktop Categories Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto text-navbar-foreground hover:bg-transparent hover:opacity-80 flex items-center gap-1"
                >
                  Categorías <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {loadingCategories ? (
                  <DropdownMenuItem disabled>Cargando categorías...</DropdownMenuItem>
                ) : categories.length === 0 ? (
                  <DropdownMenuItem disabled>No hay categorías disponibles.</DropdownMenuItem>
                ) : (
                  categories.map((category) => (
                    <DropdownMenuItem key={category.id} asChild>
                      <Link href={`/category/${category.id}`}>{category.name}</Link>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/notifications" className="hover:opacity-80">
              Notificaciones
            </Link>
            <Link href="#" className="hover:opacity-80">
              Historial
            </Link>
            <Link href="#" className="hover:opacity-80">
              Carrito de compras
            </Link>
            <Link href="/terminos-y-condiciones" className="hover:opacity-80">
              Términos y condiciones
            </Link>
            <Link href="/politicas-de-privacidad" className="hover:opacity-80">
              Políticas de privacidad
            </Link>
            <Link href={getVenderLink()} className="hover:opacity-80">
              Vender
            </Link>
            <Link href="#" className="hover:opacity-80">
              Ayuda / PQR
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {authLoading ? null : currentUser ? (
              <>{/* These links are now part of the primary header's desktop-only section */}</>
            ) : (
              <>{/* These links are now part of the primary header's desktop-only section */}</>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
