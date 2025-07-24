# Servido - Plataforma de Comercio Electrónico

Plataforma completa de e-commerce desarrollada con Next.js, Firebase y MercadoPago.

## 🚀 Despliegue en Vercel

Este proyecto está optimizado para desplegarse en Vercel.

### Variables de Entorno Requeridas

Configura las siguientes variables de entorno en tu proyecto de Vercel:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Firebase Admin (para funciones del servidor)
FIREBASE_ADMIN_PROJECT_ID=tu_project_id
FIREBASE_ADMIN_PRIVATE_KEY=tu_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=tu_client_email

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=tu_access_token
MERCADOPAGO_PUBLIC_KEY=tu_public_key

# EmailJS (opcional)
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=tu_emailjs_key
NEXT_PUBLIC_EMAILJS_SERVICE_ID=tu_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=tu_template_id
```

### Características

- ✅ Autenticación con Firebase
- ✅ Gestión de productos y categorías
- ✅ Carrito de compras
- ✅ Chat en tiempo real
- ✅ Pagos con MercadoPago
- ✅ Dashboard para vendedores
- ✅ Panel de administración
- ✅ Responsive design
- ✅ Optimización de imágenes
- ✅ SEO optimizado

### Tecnologías

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Pagos**: MercadoPago
- **UI**: Tailwind CSS, Radix UI
- **Deploy**: Vercel

### Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar en producción
npm start
```

### Estructura del Proyecto

```
├── app/                    # App Router de Next.js
│   ├── admin/             # Panel de administración
│   ├── dashboard/         # Dashboard de usuarios
│   ├── product/           # Páginas de productos
│   └── ...
├── components/            # Componentes reutilizables
├── contexts/             # Contextos de React
├── lib/                  # Utilidades y configuraciones
└── types/                # Tipos de TypeScript
```

## 📝 Notas de Despliegue

- El proyecto usa Next.js App Router
- Las imágenes se optimizan automáticamente con Vercel
- Las funciones serverless tienen un límite de 30 segundos
- Se recomienda usar la región `gru1` (São Paulo) para mejor rendimiento en Argentina