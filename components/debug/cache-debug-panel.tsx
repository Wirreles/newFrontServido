"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCacheDebug } from '@/contexts/cache-context'
import { Trash2, RefreshCw, Activity, Database, HardDrive, Clock } from 'lucide-react'

export function CacheDebugPanel() {
  const { stats, clearCache, clearExpired } = useCacheDebug()
  const [isVisible, setIsVisible] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Formatear tamaño en bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Calcular porcentaje de uso
  const getMemoryUsagePercent = (): number => {
    const maxMemory = 50 * 1024 * 1024 // 50MB
    return Math.min((stats.totalSize / maxMemory) * 100, 100)
  }

  // Obtener color del badge según el estado
  const getStatusColor = (): 'default' | 'secondary' | 'destructive' => {
    const usage = getMemoryUsagePercent()
    if (usage < 50) return 'default'
    if (usage < 80) return 'secondary'
    return 'destructive'
  }

  // Obtener color del progreso
  const getProgressColor = (): string => {
    const usage = getMemoryUsagePercent()
    if (usage < 50) return 'bg-green-500'
    if (usage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-white/90 backdrop-blur-sm shadow-lg"
        >
          <Database className="h-4 w-4 mr-2" />
          Cache Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache Debug Panel
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-100 text-green-700' : ''}
              >
                <Activity className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(false)}
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Estadísticas principales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.size}</div>
              <div className="text-xs text-gray-500">Entradas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(stats.totalSize)}
              </div>
              <div className="text-xs text-gray-500">Memoria</div>
            </div>
          </div>

          {/* Barra de progreso de memoria */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Uso de Memoria</span>
              <span className="text-gray-500">
                {getMemoryUsagePercent().toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={getMemoryUsagePercent()} 
              className="h-2"
            />
            <div className="text-xs text-gray-500 text-center">
              {formatBytes(stats.totalSize)} / 50 MB
            </div>
          </div>

          {/* Estado del cache */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado del Cache</span>
              <Badge variant={getStatusColor()}>
                {stats.expiredCount > 0 ? `${stats.expiredCount} expirados` : 'Óptimo'}
              </Badge>
            </div>
            
            {stats.expiredCount > 0 && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                <Clock className="h-3 w-3 inline mr-1" />
                {stats.expiredCount} entradas expiradas
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={clearExpired}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Limpiar Expirados
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={clearCache}
              className="flex-1"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpiar Todo
            </Button>
          </div>

          {/* Información adicional */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Cache en memoria
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              TTL: 5 min por defecto
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Máx: 100 entradas
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook para mostrar/ocultar el panel de debug
export function useCacheDebugPanel() {
  const [isVisible, setIsVisible] = useState(false)

  const toggle = () => setIsVisible(!isVisible)
  const show = () => setIsVisible(true)
  const hide = () => setIsVisible(false)

  return {
    isVisible,
    toggle,
    show,
    hide
  }
}

// Componente de indicador de cache simple
export function CacheIndicator() {
  const { stats } = useCacheDebug()
  
  const getStatusColor = (): string => {
    const usage = (stats.totalSize / (50 * 1024 * 1024)) * 100
    if (usage < 50) return 'bg-green-500'
    if (usage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-gray-600">
        Cache: {stats.size} entradas
      </span>
    </div>
  )
}
