import React from 'react'
import { Button } from './button'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  maxVisiblePages?: number
  showPageInfo?: boolean
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
  showPageInfo = true,
  className = ""
}: PaginationProps) {
  if (totalPages <= 1) return null

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToPrevious = () => goToPage(currentPage - 1)
  const goToNext = () => goToPage(currentPage + 1)

  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (currentPage <= Math.ceil(maxVisiblePages / 2)) {
      return Array.from({ length: maxVisiblePages - 1 }, (_, i) => i + 1).concat([totalPages])
    }

    if (currentPage >= totalPages - Math.floor(maxVisiblePages / 2)) {
      return [1].concat(
        Array.from(
          { length: maxVisiblePages - 1 }, 
          (_, i) => totalPages - maxVisiblePages + i + 2
        )
      )
    }

    const start = currentPage - Math.floor(maxVisiblePages / 2)
    const end = currentPage + Math.floor(maxVisiblePages / 2)
    
    return [1, ...Array.from({ length: end - start + 1 }, (_, i) => start + i), totalPages]
  }

  const visiblePages = getVisiblePages()

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Botón Anterior */}
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrevious}
        disabled={currentPage === 1}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Button>

      {/* Información de página */}
      {showPageInfo && (
        <div className="text-sm text-muted-foreground px-2">
          Página {currentPage} de {totalPages}
        </div>
      )}

      {/* Números de página */}
      <div className="flex items-center gap-1">
        {visiblePages.map((page, index) => {
          // Si hay un gap, mostrar "..."
          if (index > 0 && page - visiblePages[index - 1] > 1) {
            return (
              <div key={`ellipsis-${index}`} className="px-2">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
            )
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(page)}
              className="w-10 h-10"
            >
              {page}
            </Button>
          )
        })}
      </div>

      {/* Botón Siguiente */}
      <Button
        variant="outline"
        size="sm"
        onClick={goToNext}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1"
      >
        Siguiente
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Componente de paginación simple para casos básicos
export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className = ""
}: Omit<PaginationProps, 'maxVisiblePages' | 'showPageInfo'>) {
  if (totalPages <= 1) return null

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm text-muted-foreground px-4">
        {currentPage} / {totalPages}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
