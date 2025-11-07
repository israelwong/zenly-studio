# Plan de Extensión: Paquetes en Módulo Commercial

## 📋 Contexto

Actualmente, los paquetes se gestionan únicamente en el módulo **Content** (`/content/paquetes`) con funcionalidades multimedia completas (cover, imágenes, videos). Sin embargo, el módulo **Commercial** (`/commercial/promises`) necesita crear y gestionar paquetes de forma funcional (sin multimedia) para usarlos en cotizaciones.

### Situación Actual

- **Content**: Gestión visual completa de paquetes con multimedia
- **Commercial**: Solo puede seleccionar paquetes existentes para crear cotizaciones
- **Problema**: No hay forma de crear/editar paquetes desde Commercial sin acceso a Content

### Objetivo

Permitir que el módulo Commercial pueda crear y gestionar paquetes funcionales (sin multimedia), reutilizando el componente existente `PaqueteFormularioAvanzado` con un sistema de contexto que muestre/oculte funcionalidades según el módulo activo.

---

## 🎯 Solución Propuesta

### Arquitectura

**Componente Unificado con Contexto:**
- Un solo componente `PaqueteFormularioAvanzado` para ambos módulos
- Prop `context: 'commercial' | 'content'` para determinar comportamiento
- Verificación de módulo Content para habilitar multimedia
- Lógica funcional siempre disponible, multimedia condicional

### Flujo de Funcionalidades

```
PaqueteFormularioAvanzado
├── Lógica Funcional (siempre disponible)
│   ├── Nombre, descripción
│   ├── Selección de items del catálogo
│   ├── Cálculo de precios
│   ├── Precio personalizado
│   └── Resumen financiero
│
└── Multimedia (condicional)
    ├── Si context === 'content' && hasContentModule
    │   ├── PaqueteCoverDropzone
    │   ├── Upload/delete de cover
    │   └── Storage tracking
    └── Si context === 'commercial'
        └── Oculto (no renderizar)
```

---

## 📝 Plan de Implementación

### Fase 1: Preparación del Componente Base

#### 1.1 Modificar Props del Componente

**Archivo:** `src/app/[slug]/studio/builder/content/paquetes/tabs/PaquetesTab/PaqueteFormularioAvanzado.tsx`

```typescript
interface PaqueteFormularioAvanzadoProps {
    studioSlug: string;
    paquete?: PaqueteFromDB | null;
    context?: 'commercial' | 'content';  // ← NUEVO (default: 'content')
    hasContentModule?: boolean;            // ← NUEVO (opcional)
    isPublished?: boolean;
    onPublishedChange?: (published: boolean) => void;
    isFeatured?: boolean;
    onFeaturedChange?: (featured: boolean) => void;
    onSave: (paquete: PaqueteFromDB) => void;
    onCancel: () => void;
}
```

**Cambios:**
- Agregar `context?: 'commercial' | 'content'` (default: `'content'` para retrocompatibilidad)
- Agregar `hasContentModule?: boolean` (opcional, se puede calcular internamente)

#### 1.2 Lógica Condicional de Multimedia

**Dentro del componente:**

```typescript
const context = props.context || 'content';
const canShowMultimedia = context === 'content' && (hasContentModule ?? true);

// Inicializar hooks multimedia solo si es necesario
const { uploadFiles, deleteFile, isUploading } = useMediaUpload();
// O condicionalmente si es posible
```

**Renderizado condicional:**

```typescript
{canShowMultimedia && (
    <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-medium text-white text-sm">
                Carátula <span className="text-zinc-400 font-normal">(opcional)</span>
            </span>
        </div>
        <PaqueteCoverDropzone
            // ... props existentes
        />
    </div>
)}
```

#### 1.3 Submit Condicional

**En `handleSubmit`:**

```typescript
const data = {
    name: nombre,
    description: descripcion,
    // Multimedia solo si tiene permiso
    cover_url: canShowMultimedia ? (coverMedia[0]?.file_url || null) : null,
    cover_storage_bytes: canShowMultimedia 
        ? (coverMedia[0]?.file_size ? BigInt(coverMedia[0].file_size) : null) 
        : null,
    event_type_id: 'temp',
    precio: calculoPrecio.total,
    status: isPublished ? 'active' : 'inactive',
    is_featured: isFeatured,
    servicios: serviciosData
};
```

---

### Fase 2: Verificación de Módulo Content

#### 2.1 Server Action para Verificar Módulo

**Archivo:** `src/lib/actions/studio/modules/check-module.actions.ts` (nuevo o existente)

```typescript
'use server';

import { checkStudioModule } from '@/lib/modules';
import { prisma } from '@/lib/prisma';

export async function checkModuleAccess(
    studioSlug: string,
    moduleSlug: string
): Promise<boolean> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) return false;

        return await checkStudioModule(studio.id, moduleSlug);
    } catch (error) {
        console.error('[checkModuleAccess] Error:', error);
        return false;
    }
}
```

#### 2.2 Hook Client (Opcional)

**Archivo:** `src/hooks/useModuleAccess.ts` (nuevo)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { checkModuleAccess } from '@/lib/actions/studio/modules/check-module.actions';

export function useModuleAccess(studioSlug: string, moduleSlug: string) {
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkModuleAccess(studioSlug, moduleSlug)
            .then(setHasAccess)
            .finally(() => setLoading(false));
    }, [studioSlug, moduleSlug]);

    return { hasAccess, loading };
}
```

---

### Fase 3: Integración en Commercial

#### 3.1 Crear Página de Paquetes en Commercial

**Archivo:** `src/app/[slug]/studio/builder/commercial/paquetes/page.tsx` (nuevo)

```typescript
import { checkModuleAccess } from '@/lib/actions/studio/modules/check-module.actions';
import { PaquetesWrapper } from './components/PaquetesWrapper';

export default async function CommercialPaquetesPage({ 
    params 
}: { 
    params: { slug: string } 
}) {
    const studioSlug = params.slug;
    const hasContentModule = await checkModuleAccess(studioSlug, 'content');

    return (
        <PaquetesWrapper 
            studioSlug={studioSlug}
            context="commercial"
            hasContentModule={hasContentModule}
        />
    );
}
```

#### 3.2 Componente Wrapper para Commercial

**Archivo:** `src/app/[slug]/studio/builder/commercial/paquetes/components/PaquetesWrapper.tsx` (nuevo)

```typescript
'use client';

import { PaqueteFormularioAvanzado } from '@/app/[slug]/studio/builder/content/paquetes/tabs/PaquetesTab/PaqueteFormularioAvanzado';
// ... otros imports

export function PaquetesWrapper({
    studioSlug,
    context,
    hasContentModule
}: {
    studioSlug: string;
    context: 'commercial' | 'content';
    hasContentModule: boolean;
}) {
    // Lógica de lista y edición de paquetes
    // Usar PaqueteFormularioAvanzado con context="commercial"
}
```

#### 3.3 Integrar en Navegación de Commercial

**Archivo:** `src/app/[slug]/studio/builder/commercial/layout.tsx` o sidebar correspondiente

Agregar enlace a `/commercial/paquetes` en el menú lateral.

---

### Fase 4: Ajustes y Optimizaciones

#### 4.1 Optimizar Hooks Multimedia

- Inicializar `useMediaUpload` solo si `canShowMultimedia === true`
- O mantener inicializado pero no usar si no tiene permiso

#### 4.2 Estado de Cover en Commercial

- Si `context === 'commercial'`, no inicializar `coverMedia` o inicializar vacío
- No renderizar `PaqueteCoverDropzone` en Commercial

#### 4.3 Validaciones

- Asegurar que paquetes creados en Commercial no tengan `cover_url` si no tiene módulo
- Validar en server action que no se guarde multimedia sin permiso

---

## 🔍 Consideraciones Técnicas

### Verificación de Módulo

**Opción A: Server Component (Recomendado)**
- Más eficiente
- Verificación en servidor
- No requiere estado adicional en cliente

**Opción B: Client Component con Hook**
- Requiere server action adicional
- Más flexible para cambios dinámicos
- Útil si se necesita actualizar en tiempo real

### Slug del Módulo Content

**Verificar en DB:**
```sql
SELECT slug FROM platform_modules WHERE name LIKE '%Content%' OR slug = 'content';
```

**Asumir:** `'content'` como slug (ajustar según definición real en DB)

### Retrocompatibilidad

- `context` es opcional, default `'content'`
- Componentes existentes en Content seguirán funcionando sin cambios
- Solo agregar props nuevas sin romper funcionalidad existente

### Rutas

- `/commercial/paquetes` → Gestión funcional de paquetes
- `/content/paquetes` → Gestión visual completa (existente)

---

## ✅ Checklist de Implementación

### Preparación
- [ ] Verificar slug del módulo Content en DB
- [ ] Revisar estructura actual de `PaqueteFormularioAvanzado`
- [ ] Identificar todos los lugares donde se usa el componente

### Fase 1: Componente Base
- [ ] Agregar props `context` y `hasContentModule`
- [ ] Implementar lógica condicional de multimedia
- [ ] Condicionar renderizado de `PaqueteCoverDropzone`
- [ ] Ajustar `handleSubmit` para campos condicionales
- [ ] Probar en Content (retrocompatibilidad)

### Fase 2: Verificación de Módulo
- [ ] Crear server action `checkModuleAccess`
- [ ] (Opcional) Crear hook `useModuleAccess`
- [ ] Probar verificación de módulo

### Fase 3: Integración Commercial
- [ ] Crear ruta `/commercial/paquetes`
- [ ] Crear componente `PaquetesWrapper` para Commercial
- [ ] Integrar en navegación de Commercial
- [ ] Probar creación de paquetes sin multimedia

### Fase 4: Ajustes
- [ ] Optimizar hooks multimedia
- [ ] Validar que no se guarde multimedia sin permiso
- [ ] Ajustar estado de cover en Commercial
- [ ] Testing completo

---

## 🧪 Testing

### Casos de Prueba

1. **Content con módulo activo:**
   - Debe mostrar todas las funcionalidades (multimedia incluida)
   - Debe poder subir/eliminar cover
   - Debe guardar `cover_url` en DB

2. **Content sin módulo activo:**
   - No debe mostrar multimedia
   - Debe funcionar igual que Commercial

3. **Commercial con módulo Content activo:**
   - No debe mostrar multimedia (context = 'commercial')
   - Debe poder crear/editar paquetes funcionales
   - No debe guardar `cover_url`

4. **Commercial sin módulo Content:**
   - No debe mostrar multimedia
   - Debe funcionar normalmente

5. **Retrocompatibilidad:**
   - Componentes existentes en Content deben seguir funcionando
   - Sin necesidad de pasar `context` explícitamente

---

## 📚 Referencias

- Componente actual: `src/app/[slug]/studio/builder/content/paquetes/tabs/PaquetesTab/PaqueteFormularioAvanzado.tsx`
- Sistema de módulos: `src/lib/modules/index.ts`
- Acciones de paquetes: `src/lib/actions/studio/builder/paquetes/paquetes.actions.ts`
- Uso en cotizaciones: `src/app/[slug]/studio/builder/commercial/promises/components/CotizacionForm.tsx`

---

## 🚀 Próximos Pasos (Post-Implementación)

1. **Mejoras Futuras:**
   - Permitir editar paquetes desde Commercial con opción de "agregar multimedia" si tiene módulo
   - Migrar paquetes existentes de Content a Commercial si se desactiva módulo
   - Dashboard de paquetes unificado

2. **Optimizaciones:**
   - Lazy loading de componentes multimedia
   - Cache de verificación de módulos
   - Prefetch de datos de paquetes

---

**Última actualización:** 2025-01-XX  
**Estado:** Planificado  
**Prioridad:** Media  
**Estimación:** 4-6 horas de desarrollo

