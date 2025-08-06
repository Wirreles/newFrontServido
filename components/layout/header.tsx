"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Search,
  ShoppingCart,
  ChevronDown,
  Menu,
  X,
  Heart,
  Star,
  Users,
  Store,
  Package,
  User,
  Loader2,
  LogOut,
  ShieldCheck,
  MapPin,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { CartDrawer } from "@/components/cart-drawer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { getSearchResultImage } from "@/lib/image-utils"
import { formatPrice } from "@/lib/utils"

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
  media?: any[]
  category?: string
  sellerName?: string
}

export function Header() {
  const { currentUser, authLoading, handleLogout, getDashboardLink, getVenderLink } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  
  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Estado para almacenar todos los productos
  const [allProducts, setAllProducts] = useState<SearchProduct[] | null>(null)

  // Estado para controlar el menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Estados para geolocalización
  const [userLocation, setUserLocation] = useState<string>("")
  const [loadingLocation, setLoadingLocation] = useState(true)

  useEffect(() => {
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

  // Función para obtener la ubicación del usuario usando la API del navegador
  const fetchUserLocation = async () => {
    setLoadingLocation(true)
    
    if (!navigator.geolocation) {
      setUserLocation("Geolocalización no soportada")
      setLoadingLocation(false)
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      const { latitude, longitude } = position.coords
      
      // Usar nuestro endpoint de API para geocodificación inversa
      const response = await fetch(`/api/geocoding?lat=${latitude}&lon=${longitude}`)
      const data = await response.json()
      
      if (data.success) {
        setUserLocation(data.location)
        
        // Guardar la ubicación en el perfil del usuario si está logueado
        if (currentUser) {
          await saveUserLocation(data.location, latitude, longitude)
        }
      } else {
        setUserLocation("Ubicación no disponible")
      }
    } catch (error) {
      console.error("Error getting location:", error)
      setUserLocation("Ubicación no disponible")
    } finally {
      setLoadingLocation(false)
    }
  }

  // Función para guardar la ubicación en el perfil del usuario
  const saveUserLocation = async (location: string, lat: number, lon: number) => {
    if (!currentUser) return
    
    try {
      const { updateDoc, doc } = await import('firebase/firestore')
      const userDocRef = doc(db, "users", currentUser.firebaseUser.uid)
      
      await updateDoc(userDocRef, {
        location: location,
        coordinates: {
          latitude: lat,
          longitude: lon
        },
        lastLocationUpdate: new Date()
      })
    } catch (error) {
      console.error("Error saving user location:", error)
    }
  }

  useEffect(() => {
    // Si el usuario está logueado, intentar cargar su ubicación guardada primero
    if (currentUser) {
      loadSavedUserLocation()
    } else {
      // Si no está logueado, detectar ubicación actual
      fetchUserLocation()
    }
  }, [currentUser])

  // Función para cargar la ubicación guardada del usuario
  const loadSavedUserLocation = async () => {
    if (!currentUser) return
    
    try {
      const { getDoc, doc } = await import('firebase/firestore')
      const userDocRef = doc(db, "users", currentUser.firebaseUser.uid)
      const userDocSnap = await getDoc(userDocRef)
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        if (userData.location) {
          setUserLocation(userData.location)
          setLoadingLocation(false)
          return
        }
      }
      
      // Si no hay ubicación guardada, detectar la actual
      fetchUserLocation()
    } catch (error) {
      console.error("Error loading saved location:", error)
      fetchUserLocation()
    }
  }

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    handleSearch(value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
      setShowSearchResults(false)
    }
  }

  const clearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setShowSearchResults(false)
  }

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

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-lg">
      {/* Navbar Principal */}
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Lado Izquierdo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity">
              <Image
                src="/images/logo.png"
                alt="Servido Logo"
                width={120}
                height={50}
                className="h-8 w-auto sm:h-10 lg:h-14"
                style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
              />
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-white hidden xs:block">Servido</span>
            </Link>
                      </div>

            {/* Barra de búsqueda responsive (visible en móvil y tablet) */}
            <div className="flex-1 max-w-md mx-2 lg:hidden relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  type="text"
                  placeholder="Buscar productos, servicios.."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-white/10 text-white placeholder:text-gray-300 border-white/20 rounded-md pr-10 pl-4 py-2 text-sm focus:bg-white/20 focus:border-white/40"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
              
              {/* Resultados de búsqueda móvil */}
              {showSearchResults && searchTerm.trim() && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto mt-1 rounded-t-none">
                  {isSearching ? (
                    <div className="p-3 text-center text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Buscando...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((product) => (
                        <Link
                          key={product.id}
                          href={`/product/${product.id}`}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => setShowSearchResults(false)}
                        >
                          <div className="w-10 h-10 relative rounded-md overflow-hidden bg-gray-100">
                            <Image
                              src={getSearchResultImage(product.media, product.imageUrl, product.name)}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 truncate">{product.name}</h4>
                            <p className="text-sm text-gray-600">{formatPrice(product.price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      No se encontraron productos
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sección Central - Categorías y Búsqueda (Oculto en móvil) */}
            <div className="hidden lg:flex items-center gap-2 xl:gap-3 flex-1 max-w-xl mx-2 xl:mx-4">
            {/* Botón Categorías */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 px-3 xl:px-4 py-2 rounded-md flex items-center gap-1 xl:gap-2 text-sm xl:text-base"
                >
                  <span className="hidden xl:inline">Categorias</span>
                  <span className="xl:hidden">Cat.</span>
                  <ChevronDown className="h-3 w-3 xl:h-4 xl:w-4" />
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

            {/* Barra de Búsqueda */}
            <div className="search-container relative flex-1 min-w-0">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  type="text"
                  placeholder="Buscar productos, servicios.."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-white text-gray-900 placeholder-gray-500 border-0 rounded-md pr-10 pl-4 py-2 text-sm xl:text-base"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Search className="h-4 w-4 xl:h-5 xl:w-5" />
                </button>
              </form>

              {/* Resultados de búsqueda */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Buscando...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((product) => (
                        <Link
                          key={product.id}
                          href={`/product/${product.id}`}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => setShowSearchResults(false)}
                        >
                          <div className="w-12 h-12 relative rounded-md overflow-hidden bg-gray-100">
                            <Image
                              src={getSearchResultImage(product.media, product.imageUrl, product.name)}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 truncate">{product.name}</h4>
                            <p className="text-sm text-gray-600">{formatPrice(product.price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : searchTerm.trim() && (
                    <div className="p-4 text-center text-gray-500">
                      No se encontraron productos
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lado Derecho - Acciones de Usuario */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 xl:gap-4 flex-shrink-0">

            {/* Botón de menú móvil */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-white hover:bg-purple-700 p-2"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            {/* Información del usuario */}
            <div className="flex items-center gap-1 sm:gap-2">
              {currentUser ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 border-2 border-white/20">
                    <AvatarImage 
                      src={currentUser.firebaseUser.photoURL || undefined} 
                      alt={currentUser.firebaseUser.displayName || 'Usuario'}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-purple-600 text-white text-xs font-medium">
                      {currentUser.firebaseUser.displayName?.charAt(0).toUpperCase() || currentUser.firebaseUser.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:block">
                    <p className="text-sm font-medium text-white truncate max-w-32">
                      {currentUser.firebaseUser.displayName || currentUser.firebaseUser.email}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-purple-200">
                      <Link href="/dashboard/buyer" className="hover:text-white transition-colors">
                        Mi Panel
                      </Link>
                      {currentUser.role === "seller" && (
                        <Link href={`/seller/${currentUser.firebaseUser.uid}`} className="hover:text-white transition-colors">
                          Mi Tienda
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="hover:text-white transition-colors"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-2 text-sm">
                  <Link href="/login" className="text-white hover:text-purple-200 transition-colors">
                    Ingresa
                  </Link>
                  <Link href="/signup" className="text-white hover:text-purple-200 transition-colors">
                    Crear cuenta
                  </Link>
                </div>
              )}
            </div>

            {/* Carrito */}
            <CartDrawer />

            {/* Menú móvil */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-white hover:bg-purple-700"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navegación Inferior */}
      <div className="bg-purple-900 border-t border-purple-700">
        <div className="container mx-auto px-2 sm:px-4 py-1 sm:py-2">
          <nav className="flex items-center justify-between text-xs sm:text-sm lg:text-base">
            {/* Ubicación del usuario - En la izquierda */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-white hover:text-purple-200 transition-colors flex items-center gap-1 sm:gap-2 cursor-pointer bg-purple-800/50 px-2 sm:px-3 lg:px-4 py-1 rounded-md">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-purple-200" />
                    {loadingLocation ? (
                      <div className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs sm:text-sm hidden xs:inline">Detectando...</span>
                        <span className="text-xs xs:hidden">...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm font-medium truncate max-w-20 sm:max-w-32 lg:max-w-none">
                          {userLocation}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            fetchUserLocation()
                          }}
                          className="h-4 w-4 sm:h-5 sm:w-5 p-0 text-purple-200 hover:text-white hover:bg-purple-700"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Tu ubicación</span>
                    </div>
                    <p className="text-sm">{userLocation || "Ubicación no disponible"}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Haz clic en el ícono para actualizar</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Enlaces centrales */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 xl:gap-8">
              <Link href="/acerca-de-nosotros" className="text-white hover:text-purple-200 transition-colors flex items-center gap-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden lg:inline">Quienes somos?</span>
                <span className="hidden sm:inline lg:hidden">Nosotros</span>
                <span className="sm:hidden">Nos.</span>
              </Link>
              <Link href="/services" className="text-white hover:text-purple-200 transition-colors flex items-center gap-1">
                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Servicios</span>
                <span className="sm:hidden">Serv.</span>
              </Link>
              <Link href="/favorites" className="text-white hover:text-purple-200 transition-colors flex items-center gap-1">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden lg:inline">Mis favoritos</span>
                <span className="hidden sm:inline lg:hidden">Favoritos</span>
                <span className="sm:hidden">Fav.</span>
              </Link>
            </div>

            {/* Espacio vacío para mantener el centrado */}
            <div className="w-0 lg:w-auto"></div>
          </nav>
        </div>
      </div>

      {/* Menú Móvil */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-full max-w-sm sm:w-80 bg-white">
          <SheetTitle className="text-left text-lg sm:text-xl">Menú</SheetTitle>
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            {/* Búsqueda móvil */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Búsqueda</div>
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  type="text"
                  placeholder="Buscar productos, servicios.."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 rounded-md pr-10 pl-4 py-2 text-sm sm:text-base"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </form>
              
              {/* Resultados de búsqueda móvil */}
              {showSearchResults && searchTerm.trim() && (
                <div className="bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-center text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Buscando...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((product) => (
                        <Link
                          key={product.id}
                          href={`/product/${product.id}`}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => {
                            setShowSearchResults(false)
                            setIsMobileMenuOpen(false)
                          }}
                        >
                          <div className="w-10 h-10 relative rounded-md overflow-hidden bg-gray-100">
                            <Image
                              src={getSearchResultImage(product.media, product.imageUrl, product.name)}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 truncate">{product.name}</h4>
                            <p className="text-sm text-gray-600">{formatPrice(product.price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      No se encontraron productos
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Ubicación móvil */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Ubicación</div>
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  {loadingLocation ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-sm">Detectando ubicación...</span>
                    </div>
                  ) : (
                    <p className="text-sm font-medium truncate">{userLocation}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Usuario */}
            {currentUser ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 border-2 border-gray-200">
                    <AvatarImage 
                      src={currentUser.firebaseUser.photoURL || undefined} 
                      alt={currentUser.firebaseUser.displayName || 'Usuario'}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-purple-600 text-white text-xs font-medium">
                      {currentUser.firebaseUser.displayName?.charAt(0).toUpperCase() || currentUser.firebaseUser.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{currentUser.firebaseUser.displayName || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.firebaseUser.email}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Link href="/dashboard/buyer" className="flex items-center py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                    <User className="h-4 w-4 mr-2 sm:mr-3 text-purple-600 flex-shrink-0" /> 
                    <span className="text-sm">Mi Panel Comprador</span>
                  </Link>
                  {currentUser.role === "seller" && (
                    <Link href={`/seller/${currentUser.firebaseUser.uid}`} className="flex items-center py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                      <Store className="h-4 w-4 mr-2 sm:mr-3 text-purple-600 flex-shrink-0" /> 
                      <span className="text-sm">Mi Tienda</span>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Link href="/login" className="flex items-center py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <User className="h-4 w-4 mr-2 sm:mr-3 text-purple-600 flex-shrink-0" />
                  <span className="text-sm">Ingresar</span>
                </Link>
                <Link href="/signup" className="flex items-center py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <User className="h-4 w-4 mr-2 sm:mr-3 text-purple-600 flex-shrink-0" />
                  <span className="text-sm">Crear cuenta</span>
                </Link>
              </div>
            )}

            {/* Categorías */}
            <div className="pt-3 sm:pt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Categorías</div>
              {loadingCategories ? (
                <p className="text-sm text-gray-500 px-1">Cargando categorías...</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-gray-500 px-1">No hay categorías disponibles.</p>
              ) : (
                <div className="space-y-1">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.id}`}
                      className="flex items-center py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={closeMobileMenu}
                    >
                      <div className="h-2 w-2 bg-purple-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      <span className="text-sm truncate">{category.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Enlaces adicionales */}
            <div className="pt-3 sm:pt-4 border-t">
              <div className="space-y-1">
                <Link href="/acerca-de-nosotros" className="flex items-center py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <Users className="h-4 w-4 mr-2 sm:mr-3 text-purple-600 flex-shrink-0" />
                  <span className="text-sm">Quienes somos?</span>
                </Link>
                <Link href="/services" className="flex items-center py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <Package className="h-4 w-4 mr-2 sm:mr-3 text-purple-600 flex-shrink-0" />
                  <span className="text-sm">Servicios</span>
                </Link>
                <Link href="/favorites" className="flex items-center py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <Heart className="h-4 w-4 mr-2 sm:mr-3 text-purple-600 flex-shrink-0" />
                  <span className="text-sm">Mis favoritos</span>
                </Link>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
