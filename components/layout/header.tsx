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
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Lado Izquierdo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 lg:gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/images/logo.png"
                alt="Servido Logo"
                width={120}
                height={50}
                className="h-8 w-auto lg:h-12"
                style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
              />
              <span className="text-lg lg:text-2xl font-bold text-white hidden sm:block">Servido</span>
            </Link>
          </div>

          {/* Sección Central - Categorías y Búsqueda (Oculto en móvil) */}
          <div className="hidden lg:flex items-center gap-3 flex-1 max-w-2xl mx-8">
            {/* Botón Categorías */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 px-4 py-2 rounded-md flex items-center gap-2"
                >
                  Categorias
                  <ChevronDown className="h-4 w-4" />
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
            <div className="search-container relative flex-1">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  type="text"
                  placeholder="Buscar productos, servicios.."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-white text-gray-900 placeholder-gray-500 border-0 rounded-md pr-10 pl-4 py-2"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Search className="h-5 w-5" />
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
          <div className="flex items-center gap-2 lg:gap-6">
            {/* Búsqueda móvil */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-white hover:bg-purple-700"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>

            {/* Título Principal (Oculto en móvil) */}
            <div className="text-center hidden lg:block">
              <h1 className="text-2xl font-bold text-white">Servido</h1>
              <div className="flex items-center gap-4 text-sm">
                {currentUser ? (
                  <>
                    <Link href="/dashboard/buyer" className="text-white hover:text-purple-200 transition-colors">
                      Mi Panel
                    </Link>
                    {currentUser.role === "seller" && (
                      <Link href={`/seller/${currentUser.firebaseUser.uid}`} className="text-white hover:text-purple-200 transition-colors">
                        Mi Tienda
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="text-white hover:text-purple-200 transition-colors"
                    >
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-white hover:text-purple-200 transition-colors">
                      Ingresa
                    </Link>
                    <Link href="/signup" className="text-white hover:text-purple-200 transition-colors">
                      Crear cuenta
                    </Link>
                  </>
                )}
              </div>
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
        <div className="container mx-auto px-4 py-2">
          <nav className="flex items-center justify-center gap-4 lg:gap-8 text-xs lg:text-sm">
            <Link href="/acerca-de-nosotros" className="text-white hover:text-purple-200 transition-colors flex items-center gap-1">
              <Users className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Quienes somos?</span>
              <span className="sm:hidden">Nosotros</span>
            </Link>
            <Link href="/services" className="text-white hover:text-purple-200 transition-colors flex items-center gap-1">
              <Package className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Servicios</span>
              <span className="sm:hidden">Servicios</span>
            </Link>
            <Link href="/favorites" className="text-white hover:text-purple-200 transition-colors flex items-center gap-1">
              <Heart className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Mis favoritos</span>
              <span className="sm:hidden">Favoritos</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Menú Móvil */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-80 bg-white">
          <SheetTitle className="text-left">Menú</SheetTitle>
          <div className="mt-6 space-y-4">
            {/* Búsqueda móvil */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Búsqueda</div>
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  type="text"
                  placeholder="Buscar productos, servicios.."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 rounded-md pr-10 pl-4 py-2"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Search className="h-4 w-4" />
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
            {/* Usuario */}
            {currentUser ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.firebaseUser.photoURL || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{currentUser.firebaseUser.displayName || 'Usuario'}</p>
                    <p className="text-xs text-gray-500">{currentUser.firebaseUser.email}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Link href="/dashboard/buyer" className="flex items-center py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                    <User className="h-4 w-4 mr-3 text-purple-600" /> 
                    <span>Mi Panel Comprador</span>
                  </Link>
                  {currentUser.role === "seller" && (
                    <Link href={`/seller/${currentUser.firebaseUser.uid}`} className="flex items-center py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                      <Store className="h-4 w-4 mr-3 text-purple-600" /> 
                      <span>Mi Tienda</span>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/login" className="flex items-center py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <User className="h-4 w-4 mr-3 text-purple-600" />
                  <span>Ingresar</span>
                </Link>
                <Link href="/signup" className="flex items-center py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <User className="h-4 w-4 mr-3 text-purple-600" />
                  <span>Crear cuenta</span>
                </Link>
              </div>
            )}

            {/* Categorías */}
            <div className="pt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Categorías</div>
              {loadingCategories ? (
                <p className="text-sm text-gray-500 px-3">Cargando categorías...</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-gray-500 px-3">No hay categorías disponibles.</p>
              ) : (
                <div className="space-y-1">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.id}`}
                      className="flex items-center py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={closeMobileMenu}
                    >
                      <div className="h-2 w-2 bg-purple-400 rounded-full mr-3"></div>
                      <span className="text-sm">{category.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Enlaces adicionales */}
            <div className="pt-4 border-t">
              <div className="space-y-1">
                <Link href="/acerca-de-nosotros" className="flex items-center py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <Users className="h-4 w-4 mr-3 text-purple-600" />
                  <span>Quienes somos?</span>
                </Link>
                <Link href="/services" className="flex items-center py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <Package className="h-4 w-4 mr-3 text-purple-600" />
                  <span>Servicios</span>
                </Link>
                <Link href="/favorites" className="flex items-center py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
                  <Heart className="h-4 w-4 mr-3 text-purple-600" />
                  <span>Mis favoritos</span>
                </Link>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
