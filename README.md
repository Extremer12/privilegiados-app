# Privilegiados App

Plataforma PWA para el grupo de alabanza. Gestión de canciones, repertorios, eventos, foro grupal y perfiles de miembros.

## Stack Técnico

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui + Framer Motion
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions, Realtime)
- **PWA:** vite-plugin-pwa con Workbox
- **Deploy:** Vercel

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build
```

## Variables de Entorno

Crear un archivo `.env` con:

```env
VITE_SUPABASE_PROJECT_ID=tu-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=tu-publishable-key
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
```

## Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables
│   ├── ui/         # shadcn/ui components
│   ├── chat/       # Chat en tiempo real
│   ├── dashboard/  # Dashboard cards
│   ├── live/       # Sesiones en vivo
│   └── repertorios/ # Gestión de repertorios
├── hooks/          # Custom hooks (auth, roles, notifications)
├── integrations/   # Supabase client y types
├── pages/          # Vistas principales
├── services/       # Servicios (notificaciones)
└── utils/          # Utilidades
```

## Licencia

Proyecto privado. Todos los derechos reservados.
