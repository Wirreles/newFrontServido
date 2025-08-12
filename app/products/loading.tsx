import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-10 w-80 mx-auto mb-6" />
        
        {/* Mobile Filter Button Skeleton */}
        <div className="lg:hidden mb-4">
          <Skeleton className="h-12 w-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Desktop Filters Sidebar Skeleton */}
          <div className="hidden lg:block">
            <Card className="p-6">
              <Skeleton className="h-6 w-20 mb-4" />
              <div className="space-y-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Product Grid Skeleton */}
          <div className="w-full">
            <Skeleton className="h-5 w-48 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <Card key={i} className="overflow-hidden product-card-fixed">
                  <div className="product-image-container relative">
                    <Skeleton className="w-full h-full" />
                  </div>
                  <CardContent className="p-3 flex flex-col flex-grow justify-between h-[120px]">
                    <div className="flex-grow">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-6 w-20 mb-2" />
                    </div>
                    <div className="space-y-1 mt-auto">
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
