# Announcements Components

Componentes para mostrar próximos lanzamientos y anuncios importantes siguiendo el estilo maestro de ProSocial.

## Componentes Disponibles

### 🎯 ComingSoon

Componente principal para mostrar todos los próximos lanzamientos en formato de tarjetas.

**Características:**

- Vista en grid o lista
- Indicadores de progreso visual
- Badges de estado (Coming Soon, In Development, Beta)
- Indicadores de prioridad
- Responsive design completo
- Efectos hover sofisticados

**Uso básico:**

```tsx
import { ComingSoon } from "@/app/components/shared/announcements";

<ComingSoon />;
```

**Props disponibles:**

```tsx
interface ComingSoonProps {
  className?: string;
  variant?: "grid" | "list"; // Default: 'grid'
  showFeatures?: boolean; // Default: true
  maxItems?: number; // Default: todos los items
}
```

**Ejemplo avanzado:**

```tsx
<ComingSoon variant="grid" showFeatures={true} maxItems={4} className="my-8" />
```

### 📋 CompactComingSoon

Versión compacta para sidebars, widgets o espacios reducidos.

**Características:**

- Diseño minimalista y compacto
- Indicadores de estado visuales
- Botón "Ver todos" integrado
- Perfecto para dashboards

**Uso básico:**

```tsx
import { CompactComingSoon } from "@/app/components/shared/announcements";

<CompactComingSoon />;
```

**Props disponibles:**

```tsx
interface CompactComingSoonProps {
  className?: string;
  maxItems?: number; // Default: 2
  showViewAll?: boolean; // Default: true
  onViewAll?: () => void; // Callback para "Ver todos"
}
```

**Ejemplo con navegación:**

```tsx
const router = useRouter()

<CompactComingSoon
    maxItems={3}
    showViewAll={true}
    onViewAll={() => router.push('/coming-soon')}
/>
```

### 🎨 ComingSoonWidget

Widget pre-configurado para dashboard del admin.

**Uso:**

```tsx
import { ComingSoonWidget } from "@/app/admin/dashboard/components/ComingSoonWidget";

<ComingSoonWidget />;
```

## 📊 Estructura de Datos

### LaunchItem Interface

```tsx
interface LaunchItem {
  id: string; // Identificador único
  title: string; // Nombre del lanzamiento
  description: string; // Descripción breve
  icon: React.ReactNode; // Icono (Lucide React)
  status: "coming-soon" | "in-development" | "beta"; // Estado actual
  estimatedDate?: string; // Fecha estimada (ej: "Q1 2026")
  priority: "high" | "medium" | "low"; // Prioridad del proyecto
  features?: string[]; // Lista de características
}
```

### Datos Actuales

Los componentes incluyen datos predefinidos para:

1. **ProSocial Platform** (SaaS completo)
   - Estado: En desarrollo
   - Prioridad: Alta
   - Fecha: Q1 2026

2. **Portal Cliente 2.0** (Nueva experiencia)
   - Estado: Próximamente
   - Prioridad: Alta
   - Fecha: Q4 2025

3. **Bolsa de Trabajo** (Portal de empleos)
   - Estado: Beta
   - Prioridad: Alta
   - Fecha: Q4 2025

4. **White Label** (Personalización de marca)
   - Estado: Beta
   - Prioridad: Media
   - Fecha: Q3 2026

## 🎨 Estilo y Diseño

### Paleta de Colores

- **Fondo principal:** `zinc-800` con bordes `zinc-700`
- **Acentos:** Gradientes `purple-600` a `pink-600`
- **Estados:**
  - Coming Soon: `blue-500`
  - In Development: `purple-500`
  - Beta: `emerald-500`
- **Prioridades:**
  - Alta: `red-500`
  - Media: `yellow-500`
  - Baja: `green-500`

### Efectos Visuales

- Hover con `scale-[1.02]` y cambio de bordes
- Gradientes de fondo en hover
- Transiciones suaves de 300ms
- Barras de progreso animadas

## 📱 Responsive Design

### Breakpoints

- **Mobile:** 1 columna, padding reducido
- **Tablet (md):** 2 columnas en grid
- **Desktop (lg+):** 3 columnas en grid

### Adaptaciones Móviles

- Iconos más pequeños
- Texto truncado en versión compacta
- Espaciado optimizado
- Touch-friendly buttons

## 🔧 Personalización

### Agregar Nuevos Lanzamientos

Edita el array `upcomingLaunches` en `ComingSoon.tsx`:

```tsx
const newLaunch: LaunchItem = {
  id: "my-feature",
  title: "Mi Nueva Funcionalidad",
  description: "Descripción de la funcionalidad",
  icon: <MyIcon className="w-6 h-6" />,
  status: "coming-soon",
  estimatedDate: "Q3 2026",
  priority: "high",
  features: ["Característica 1", "Característica 2"],
};
```

### Modificar Estilos

Los componentes usan clases de Tailwind CSS siguiendo el estilo maestro:

- Mantén la paleta zinc para consistencia
- Usa gradientes purple-pink para acentos
- Respeta las transiciones de 300ms

## 📄 Páginas de Ejemplo

### Página Completa

`/app/(main)/coming-soon/page.tsx` - Página dedicada con todos los lanzamientos

### Widget Dashboard

`/app/admin/dashboard/components/ComingSoonWidget.tsx` - Widget para dashboard

## 🚀 Integración Futura

Estos componentes están preparados para:

- Conexión con CMS para contenido dinámico
- Notificaciones push cuando cambien estados
- Integración con sistema de newsletters
- Analytics de engagement

---

_Actualizado: 9 de septiembre de 2025_
