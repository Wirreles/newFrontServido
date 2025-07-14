"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { collection, query, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Search, XCircle, Frown, Filter } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { getProductThumbnail } from "@/lib/image-utils"

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  imageUrl?: string
  media?: any[]
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedBrand, setSelectedBrand] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [isServiceFilter, setIsServiceFilter] = useState<boolean | "all">("all")
  const [sortBy, setSortBy] = useState<"createdAt_desc" | "price_asc" | "price_desc" | "name_asc" | "name_desc">(
    "createdAt_desc",
  )

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch categories
        const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
        const categorySnapshot = await getDocs(categoriesQuery)
        setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Category))

        // Fetch brands
        const brandsQuery = query(collection(db, "brands"), orderBy("name"))
        const brandSnapshot = await getDocs(brandsQuery)
        setBrands(brandSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Brand))

        // Fetch all products
        const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"))
        const productSnapshot = await getDocs(productsQuery)
        const fetchedProducts = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product)

        setProducts(fetchedProducts)
        setFilteredProducts(fetchedProducts)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Error al cargar los datos. Intenta de nuevo más tarde.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Apply filters whenever filter states change
  useEffect(() => {
    let filtered = [...products]

    // Search filter
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          product.description.toLowerCase().includes(lowerCaseSearchTerm),
      )
    }

    // Category filter
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    // Brand filter
    if (selectedBrand && selectedBrand !== "all") {
      filtered = filtered.filter((product) => product.brand === selectedBrand)
    }

    // Price range filter
    const minP = Number.parseFloat(minPrice)
    const maxP = Number.parseFloat(maxPrice)
    if (!isNaN(minP) && minP >= 0) {
      filtered = filtered.filter((product) => product.price >= minP)
    }
    if (!isNaN(maxP) && maxP >= 0) {
      filtered = filtered.filter((product) => product.price <= maxP)
    }

    // Service type filter
    if (isServiceFilter !== "all") {
      filtered = filtered.filter((product) => product.isService === isServiceFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.price - b.price
        case "price_desc":
          return b.price - a.price
        case "name_asc":
          return a.name.localeCompare(b.name)
        case "name_desc":
          return b.name.localeCompare(a.name)
        case "createdAt_desc":
        default:
          return b.createdAt?.toMillis() - a.createdAt?.toMillis()
      }
    })

    setFilteredProducts(filtered)
  }, [products, searchTerm, selectedCategory, selectedBrand, minPrice, maxPrice, isServiceFilter, sortBy])

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("")
    setSelectedBrand("")
    setMinPrice("")
    setMaxPrice("")
    setIsServiceFilter("all")
    setSortBy("createdAt_desc")
  }

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Label htmlFor="search" className="mb-2 block">
          Buscar
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="search"
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchTerm("")}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Category Filter */}
      <div>
        <Label htmlFor="category" className="mb-2 block">
          Categoría
        </Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand Filter */}
      <div>
        <Label htmlFor="brand" className="mb-2 block">
          Marca
        </Label>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger id="brand">
            <SelectValue placeholder="Todas las marcas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range Filter */}
      <div>
        <Label className="mb-2 block">Rango de Precio</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Mín."
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            step="0.01"
          />
          <span>-</span>
          <Input
            type="number"
            placeholder="Máx."
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            step="0.01"
          />
        </div>
      </div>

      {/* Service Type Filter */}
      <div>
        <Label className="mb-2 block">Tipo</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-all"
              checked={isServiceFilter === "all"}
              onCheckedChange={() => setIsServiceFilter("all")}
            />
            <Label htmlFor="filter-all">Todos</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-product"
              checked={isServiceFilter === false}
              onCheckedChange={() => setIsServiceFilter(false)}
            />
            <Label htmlFor="filter-product">Productos</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-service"
              checked={isServiceFilter === true}
              onCheckedChange={() => setIsServiceFilter(true)}
            />
            <Label htmlFor="filter-service">Servicios</Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Sort By */}
      <div>
        <Label htmlFor="sortBy" className="mb-2 block">
          Ordenar por
        </Label>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
          <SelectTrigger id="sortBy">
            <SelectValue placeholder="Más recientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt_desc">Más recientes</SelectItem>
            <SelectItem value="price_asc">Precio: Menor a Mayor</SelectItem>
            <SelectItem value="price_desc">Precio: Mayor a Menor</SelectItem>
            <SelectItem value="name_asc">Nombre: A-Z</SelectItem>
            <SelectItem value="name_desc">Nombre: Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" className="w-full" onClick={handleClearFilters}>
        Limpiar Filtros
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
          Explorar Productos y Servicios
        </h1>

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>Filtra los productos según tus preferencias</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block">
            <Card className="p-6 sticky top-20">
              <h2 className="text-xl font-semibold mb-4">Filtros</h2>
              <FilterContent />
            </Card>
          </div>

          {/* Product Grid */}
          <div className="w-full">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Frown className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">{error}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Frown className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">No se encontraron productos con los filtros aplicados.</p>
                <Button onClick={handleClearFilters} className="mt-4">
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""} encontrado
                  {filteredProducts.length !== 1 ? "s" : ""}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {filteredProducts.map((product) => (
                    <Link key={product.id} href={`/product/${product.id}`} className="block">
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 h-full">
                        <div className="aspect-square relative bg-gray-100">
                          <Image
                            src={getProductThumbnail(product.media, product.imageUrl, product.name)}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          />
                        </div>
                        <CardContent className="p-3">
                          <h3 className="text-sm font-medium mb-2 line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                          <p className="text-lg font-bold text-blue-600 mb-1">${product.price.toFixed(2)}</p>
                          <span className="text-xs text-green-600">Envío gratis</span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
