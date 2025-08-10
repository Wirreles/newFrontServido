# Sistema de Precios Dinámicos de Suscripción

## Descripción General

Este sistema permite a los administradores gestionar dinámicamente el precio de suscripción para que los vendedores puedan crear y ofrecer servicios en la plataforma. Solo se puede tener un precio activo a la vez, y todos los cambios se registran en un historial completo.

## Características Principales

### 🔐 Gestión Administrativa
- **Panel dedicado** en el dashboard administrativo
- **Crear nuevos precios** con notas explicativas
- **Editar precios existentes** manteniendo el historial
- **Vista del precio actual** con información detallada
- **Historial completo** de todos los cambios realizados

### 💰 Modelo de Precio
- **Precio único activo** en cualquier momento
- **Cambios inmediatos** para nuevas suscripciones
- **Historial de cambios** con razones y usuarios
- **Precio por defecto** (ARS 29.99) si no hay configuración

### 📊 Seguimiento y Auditoría
- **Registro de cambios** con timestamp y usuario
- **Notas explicativas** para cada modificación
- **Trazabilidad completa** de precios anteriores
- **Información del sistema** para administradores

## Estructura de Datos

### Colección: `subscriptionPricing`
```typescript
interface SubscriptionPricing {
  id: string
  price: number           // Precio en USD
  isActive: boolean       // Solo uno puede estar activo
  createdAt: Timestamp    // Fecha de creación
  updatedAt: Timestamp    // Última modificación
  createdBy: string       // ID del usuario creador
  notes?: string          // Notas explicativas
}
```

### Colección: `subscriptionPricingHistory`
```typescript
interface SubscriptionPricingHistory {
  id: string
  oldPrice: number        // Precio anterior
  newPrice: number        // Nuevo precio
  changedAt: Timestamp    // Fecha del cambio
  changedBy: string       // ID del usuario que cambió
  reason?: string         // Razón del cambio
}
```

## API Endpoints

### Admin - Gestión de Precios
- **GET** `/api/admin/subscription-pricing` - Obtener precio activo
- **POST** `/api/admin/subscription-pricing` - Crear nuevo precio
- **PUT** `/api/admin/subscription-pricing` - Actualizar precio existente

### Admin - Historial
- **GET** `/api/admin/subscription-pricing/history` - Obtener historial de cambios

### Público - Precio Activo
- **GET** `/api/subscription/active-price` - Obtener precio para suscripciones

## Flujo de Trabajo

### 1. Configuración Inicial
```bash
# Ejecutar script de inicialización
node scripts/init-subscription-pricing.js
```

### 2. Gestión Diaria
1. **Acceder** al dashboard administrativo
2. **Navegar** a la pestaña "Precios Suscripción"
3. **Ver** el precio actual y estadísticas
4. **Crear** nuevo precio o **editar** existente
5. **Revisar** historial de cambios

### 3. Cambio de Precio
1. **Desactivar** precio anterior automáticamente
2. **Crear** nuevo precio activo
3. **Registrar** cambio en el historial
4. **Aplicar** inmediatamente a nuevas suscripciones

## Componentes de UI

### `SubscriptionPricingManager`
- **Gestión completa** de precios desde admin
- **Formularios** para crear/editar precios
- **Vista del precio actual** con estado visual
- **Historial de cambios** en tiempo real
- **Información del sistema** para usuarios

### Integración en Admin Dashboard
- **Nueva pestaña** "Precios Suscripción"
- **Acceso directo** desde navegación principal
- **Estado persistente** entre sesiones
- **Notificaciones** de éxito/error

## Seguridad y Validaciones

### Validaciones del Cliente
- **Precio válido** (número positivo)
- **Campos requeridos** completos
- **Formato correcto** de entrada

### Validaciones del Servidor
- **Autenticación** requerida para cambios
- **Autorización** solo para administradores
- **Validación de datos** antes de guardar
- **Manejo de errores** robusto

### Auditoría
- **Registro de usuario** que realiza cambios
- **Timestamp** de cada modificación
- **Razón del cambio** (opcional pero recomendada)
- **Historial completo** preservado

## Casos de Uso

### Escenario 1: Configuración Inicial
- **Administrador** accede por primera vez
- **Sistema** muestra mensaje de no configuración
- **Administrador** crea primer precio (ARS 29.99)
- **Sistema** activa precio y registra en historial

### Escenario 2: Cambio de Precio
- **Administrador** decide cambiar precio a ARS 39.99
- **Sistema** desactiva precio anterior (ARS 29.99)
- **Sistema** crea nuevo precio activo (ARS 39.99)
- **Sistema** registra cambio en historial
- **Nuevas suscripciones** usan precio ARS 39.99

### Escenario 3: Edición de Precio
- **Administrador** edita precio actual (ARS 39.99)
- **Sistema** actualiza precio existente
- **Sistema** registra cambio en historial
- **Precio** se mantiene activo

## Beneficios del Sistema

### Para Administradores
- **Control total** sobre precios de suscripción
- **Flexibilidad** para ajustar según mercado
- **Transparencia** en cambios realizados
- **Auditoría completa** de modificaciones

### Para Vendedores
- **Precios claros** y actualizados
- **Transparencia** en costos de suscripción
- **Acceso inmediato** a funcionalidades de servicios

### Para la Plataforma
- **Gestión centralizada** de precios
- **Escalabilidad** para futuros planes
- **Trazabilidad** completa de cambios
- **Mantenimiento** simplificado

## Mantenimiento y Monitoreo

### Tareas Recomendadas
- **Revisar** precios mensualmente
- **Analizar** historial de cambios
- **Documentar** razones de modificaciones
- **Monitorear** impacto en suscripciones

### Métricas a Seguir
- **Frecuencia** de cambios de precio
- **Razones** más comunes de cambios
- **Impacto** en tasa de suscripciones
- **Satisfacción** de usuarios

## Consideraciones Técnicas

### Performance
- **Consultas optimizadas** con índices de Firestore
- **Caché local** para precio activo
- **Lazy loading** de historial

### Escalabilidad
- **Arquitectura** preparada para múltiples planes
- **Separación** de colecciones por funcionalidad
- **APIs** modulares y reutilizables

### Mantenibilidad
- **Código modular** y bien documentado
- **Tipos TypeScript** para seguridad
- **Manejo de errores** consistente
- **Tests** unitarios recomendados

## Próximos Pasos

### Funcionalidades Futuras
- **Múltiples planes** de suscripción
- **Descuentos** y promociones
- **Facturación** automática
- **Reportes** de ingresos por suscripción

### Mejoras Técnicas
- **Webhooks** para cambios de precio
- **Notificaciones** automáticas a usuarios
- **Integración** con sistemas de facturación
- **Dashboard** de métricas avanzadas
