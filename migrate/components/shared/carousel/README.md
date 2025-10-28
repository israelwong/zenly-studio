# Sistema de Carruseles Reutilizables

Este sistema proporciona componentes de carrusel flexibles y reutilizables para diferentes tipos de eventos.

## Componentes disponibles

### 1. ImageCarousel (Componente base)

Carrusel genérico y totalmente configurable.

```tsx
import { ImageCarousel } from "@/app/components/shared/carousel";

<ImageCarousel
  images={["1.jpg", "2.jpg", "3.jpg"]}
  baseUrl="https://tu-servidor.com/imagenes/"
  perView={3.5}
  autoplay={3000}
  gap={16}
  breakpoints={{
    1024: { perView: 4 },
    640: { perView: 1.3 },
  }}
/>;
```

### 2. EventCarousel (Carrusel inteligente por tipo de evento)

Selecciona automáticamente las imágenes y configuración según el tipo de evento.

```tsx
import { EventCarousel } from "@/app/components/shared/carousel";

<EventCarousel
  tipoEvento="xv" // o "boda"
  className="w-full"
/>;
```

### 3. XVCarousel / BodaCarousel (Carruseles específicos)

Carruseles preconfigurados para cada tipo de evento.

```tsx
import { XVCarousel, BodaCarousel } from '@/app/components/shared/carousel'

<XVCarousel />
<BodaCarousel />
```

### 4. PortfolioSection (Sección completa con carrusel)

Sección completa con título, descripción y carrusel integrado.

```tsx
import PortfolioSection from "@/app/evento/[eventoId]/components/sections/PortfolioSection";

<PortfolioSection
  tipoEvento="xv"
  titulo="Título personalizado"
  descripcion="Descripción personalizada"
/>;
```

## Configuración de imágenes

### XV Años

- **URL base**: `https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/fofografia/porfatolio/`
- **Imágenes**: `1.jpg` hasta `10.jpg`
- **Estilo**: Colores rosa/morado, enfoque en elegancia juvenil

### Bodas

- **URL base**: `https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/fofografia/bodas/`
- **Imágenes**: `boda-1.jpg` hasta `boda-8.jpg`
- **Estilo**: Colores rosa/dorado, enfoque en romance y elegancia

## Casos de uso

1. **Página de evento**: Mostrar portfolio según tipo de evento
2. **Landing page**: Carrusel de trabajos generales
3. **Formulario de leads**: Inspirar con ejemplos
4. **Página de paquetes**: Mostrar ejemplos por categoria

## Personalización

Todos los componentes aceptan:

- `className` para estilos adicionales
- Configuración de velocidad, cantidad de elementos visibles
- Breakpoints responsivos personalizados
- Estilos de imagen personalizados

## Dependencias

- `@glidejs/glide`: Motor del carrusel
- `next/image`: Optimización de imágenes
- `tailwindcss`: Estilos

## Notas técnicas

- Componentes client-side (`"use client"`)
- Responsive design mobile-first
- Optimización automática de imágenes con Next.js
- Autoplay configurable
- Destrucción automática del carrusel al desmontar componente
