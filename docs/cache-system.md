# 🚀 Sistema de Cache Global - Documentación

## **📋 Descripción General**

El sistema de cache global es una solución completa para optimizar el rendimiento de toda la aplicación web. Implementa cache en memoria con gestión inteligente de recursos, TTL configurable y limpieza automática.

## **🏗️ Arquitectura del Sistema**

### **Componentes Principales**

1. **`CacheProvider`** - Contexto global que maneja todo el cache
2. **`useCache`** - Hook principal para acceder al sistema de cache
3. **Hooks especializados** - Para diferentes tipos de datos
4. **Componentes de debug** - Para monitorear el rendimiento

### **Estructura de Archivos**

```
contexts/
├── cache-context.tsx          # Contexto principal del cache
hooks/
├── use-category-cache.ts      # Cache para categorías
├── use-user-cache.ts          # Cache para usuarios
├── use-image-cache.ts         # Cache para imágenes
├── use-page-cache.ts          # Cache para páginas
└── use-debounce.ts            # Hook de debounce
components/
└── debug/
    └── cache-debug-panel.tsx  # Panel de debug del cache
```

## **⚙️ Configuración del Cache**

### **Parámetros por Defecto**

```typescript
const CACHE_CONFIG = {
  maxSize: 100,                    // Máximo número de entradas
  maxMemorySize: 50 * 1024 * 1024, // 50MB máximo
  cleanupInterval: 60 * 1000,      // Limpiar cada minuto
  defaultTTL: 5 * 60 * 1000,      // 5 minutos por defecto
}
```

### **TTL Recomendados por Tipo de Datos**

- **Productos**: 5 minutos
- **Categorías**: 10 minutos
- **Usuarios**: 15 minutos
- **Imágenes**: 30 minutos
- **Páginas**: 10 minutos
- **Thumbnails**: 1 hora

## **🔧 Uso Básico**

### **1. Configurar el Provider**

```typescript
// app/layout.tsx
import { CacheProvider } from '@/contexts/cache-context'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <CacheProvider>
          {children}
        </CacheProvider>
      </body>
    </html>
  )
}
```

### **2. Usar el Hook Principal**

```typescript
import { useCache } from '@/contexts/cache-context'

function MyComponent() {
  const { setCache, getCache, hasCache } = useCache()
  
  // Guardar datos
  setCache('my-key', myData, 10 * 60 * 1000) // 10 minutos
  
  // Obtener datos
  const data = getCache('my-key')
  
  // Verificar si existe
  if (hasCache('my-key')) {
    // Datos disponibles
  }
}
```

## **🎯 Hooks Especializados**

### **1. Cache de Categorías**

```typescript
import { useCategoryCache } from '@/hooks/use-category-cache'

function CategoryComponent() {
  const { 
    categories, 
    loading, 
    error, 
    fetchCategories,
    getCategoryById,
    searchCategories 
  } = useCategoryCache()
  
  // Las categorías se cargan automáticamente
  // y se cachean por 10 minutos
}
```

### **2. Cache de Usuarios**

```typescript
import { useUserCache } from '@/hooks/use-user-cache'

function UserComponent() {
  const { 
    currentUser,
    getUserById,
    getSellers,
    getTopSellers 
  } = useUserCache()
  
  // Los usuarios se cachean por 15 minutos
  // El usuario actual por 30 minutos
}
```

### **3. Cache de Imágenes**

```typescript
import { useImageCache } from '@/hooks/use-image-cache'

function ImageComponent() {
  const { 
    preloadImage,
    createThumbnail,
    isImageCached,
    getCachedImage 
  } = useImageCache()
  
  // Precargar imagen
  useEffect(() => {
    preloadImage(imageUrl)
  }, [imageUrl])
  
  // Crear thumbnail
  const thumbnail = await createThumbnail(imageUrl, 200)
}
```

### **4. Cache de Páginas**

```typescript
import { usePageCache } from '@/hooks/use-page-cache'

function ProductPage() {
  const { 
    data, 
    loading, 
    error, 
    fetchPageData,
    preloadPageData 
  } = usePageCache(
    'products-page',
    () => fetchProducts(),
    { ttl: 5 * 60 * 1000, preload: true }
  )
}
```

## **🚀 Funcionalidades Avanzadas**

### **1. Precarga Inteligente**

```typescript
// Precargar datos en background
const { preloadData } = useCache()

// Precargar categorías cuando el usuario hace hover en el menú
const handleCategoryHover = () => {
  preloadData('categories:all', fetchCategories, 10 * 60 * 1000)
}
```

### **2. Cache con Parámetros**

```typescript
// Cache para búsquedas con filtros
const { fetchData } = useDynamicPageCache(
  'product-search',
  (filters) => searchProducts(filters)
)

// Los resultados se cachean por filtro específico
await fetchData({ category: 'electronics', price: '100-500' })
```

### **3. Cache Paginado**

```typescript
const { 
  data, 
  total, 
  currentPage,
  goToPage,
  applyFilters 
} = usePaginatedPageCache(
  'products-list',
  (page, limit, filters) => getProducts(page, limit, filters)
)

// Navegar a página específica
await goToPage(2)

// Aplicar filtros
await applyFilters({ category: 'electronics' })
```

## **📊 Monitoreo y Debug**

### **1. Panel de Debug**

```typescript
import { CacheDebugPanel } from '@/components/debug/cache-debug-panel'

// Agregar al layout para desarrollo
{process.env.NODE_ENV === 'development' && <CacheDebugPanel />}
```

### **2. Indicador de Cache**

```typescript
import { CacheIndicator } from '@/components/debug/cache-debug-panel'

// Mostrar estado del cache en cualquier componente
<CacheIndicator />
```

### **3. Estadísticas en Tiempo Real**

```typescript
import { useCacheDebug } from '@/contexts/cache-context'

function DebugComponent() {
  const { stats, clearCache, clearExpired } = useCacheDebug()
  
  console.log('Cache Stats:', stats)
  // { size: 25, totalSize: 2048576, expiredCount: 3 }
}
```

## **🔍 Claves de Cache**

### **Formato de Claves**

- **Productos**: `products:all`, `product:123`
- **Categorías**: `categories:all`, `category:456`
- **Usuarios**: `user:789`, `user:email:user@example.com`
- **Imágenes**: `image:https://...`, `image:thumb:https://...:200`
- **Páginas**: `page:home`, `page:products:{"category":"electronics"}`

### **Convenciones de Nomenclatura**

- **Singular**: `product:123`
- **Plural**: `products:all`
- **Con filtros**: `products:category:electronics`
- **Con parámetros**: `page:search:{"query":"laptop","page":2}`

## **⚡ Optimizaciones de Rendimiento**

### **1. Debounce en Búsquedas**

```typescript
import { useDebounce } from '@/hooks/use-debounce'

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // La búsqueda se ejecuta solo después de 300ms de inactividad
  useEffect(() => {
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])
}
```

### **2. Limpieza Automática**

- **Cache expirado**: Se elimina automáticamente
- **Límite de memoria**: Se limpia cuando excede 50MB
- **Límite de entradas**: Se mantienen máximo 100 entradas
- **LRU**: Se eliminan las entradas menos usadas

### **3. Prevención de Duplicados**

```typescript
// Evitar múltiples requests simultáneos
const { preloadImage } = useImageCache()

// Si la imagen ya se está cargando, esperar
const imageUrl = await preloadImage(src)
```

## **🛠️ Mantenimiento y Troubleshooting**

### **1. Limpiar Cache Manualmente**

```typescript
const { clearCache, clearExpired } = useCache()

// Limpiar todo el cache
clearCache()

// Limpiar solo entradas expiradas
clearExpired()
```

### **2. Debug de Problemas**

```typescript
// Verificar si existe en cache
if (hasCache('my-key')) {
  console.log('Datos en cache')
} else {
  console.log('Datos no encontrados en cache')
}

// Obtener estadísticas
const stats = getCacheStats()
console.log('Estado del cache:', stats)
```

### **3. Logs de Desarrollo**

```typescript
// En desarrollo, el cache registra todas las operaciones
if (process.env.NODE_ENV === 'development') {
  console.log('Cache operation:', { key, data, ttl })
}
```

## **📈 Métricas de Rendimiento**

### **Indicadores Clave**

- **Hit Rate**: Porcentaje de hits en cache
- **Memory Usage**: Uso de memoria en tiempo real
- **Entry Count**: Número de entradas activas
- **Expired Count**: Entradas expiradas pendientes de limpieza

### **Mejoras Esperadas**

- **Tiempo de carga**: 60-80% más rápido
- **Ancho de banda**: 70-90% menos requests
- **Experiencia de usuario**: Navegación instantánea
- **Carga del servidor**: Reducción significativa

## **🔮 Futuras Mejoras**

### **1. Cache Persistente**
- LocalStorage para datos críticos
- IndexedDB para grandes volúmenes
- Sincronización entre pestañas

### **2. Cache Distribuido**
- Service Workers para cache offline
- Cache compartido entre usuarios
- Sincronización con servidor

### **3. Machine Learning**
- Predicción de datos a precargar
- Optimización automática de TTL
- Análisis de patrones de uso

## **📚 Ejemplos de Uso Completos**

### **Ejemplo 1: Lista de Productos con Cache**

```typescript
function ProductList() {
  const { 
    data: products, 
    loading, 
    error,
    fetchPageData,
    refresh 
  } = usePageCache(
    'products-list',
    () => fetchProductsFromAPI(),
    { ttl: 5 * 60 * 1000, preload: true }
  )
  
  const { preloadImage } = useImageCache()
  
  // Precargar imágenes de productos
  useEffect(() => {
    if (products) {
      products.forEach(product => {
        if (product.imageUrl) {
          preloadImage(product.imageUrl)
        }
      })
    }
  }, [products, preloadImage])
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div>
      <button onClick={refresh}>Actualizar</button>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### **Ejemplo 2: Búsqueda con Debounce y Cache**

```typescript
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  const { 
    data: searchResults,
    loading,
    fetchData 
  } = useDynamicPageCache(
    'product-search',
    (filters) => searchProducts(filters)
  )
  
  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchData({ query: debouncedSearchTerm })
    }
  }, [debouncedSearchTerm, fetchData])
  
  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar productos..."
      />
      
      {loading && <SearchingIndicator />}
      
      {searchResults && (
        <SearchResults results={searchResults} />
      )}
    </div>
  )
}
```

---

## **🎉 ¡El Sistema de Cache Está Listo!**

Con esta implementación, tu aplicación web ahora tiene:

- ✅ **Cache global** para todos los tipos de datos
- ✅ **Hooks especializados** para diferentes necesidades
- ✅ **Gestión inteligente** de memoria y recursos
- ✅ **Debug en tiempo real** del rendimiento
- ✅ **Optimizaciones automáticas** de carga
- ✅ **Precarga inteligente** de datos
- ✅ **Manejo de errores** robusto
- ✅ **Documentación completa** para desarrolladores

¡Tu aplicación ahora será mucho más rápida y eficiente! 🚀
