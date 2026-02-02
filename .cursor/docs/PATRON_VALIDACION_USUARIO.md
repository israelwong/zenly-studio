# Patrón de Validación de Usuario para Server Actions

## Contexto

Cuando necesitas obtener el `studio_users.id` del usuario autenticado en una server action para asociarlo a registros (pagos, gastos, autorizaciones, etc.), sigue este patrón.

## Flujo de Validación

### 1. Obtener usuario autenticado de Supabase

```typescript
const { createClient } = await import("@/lib/supabase/server");
const supabase = await createClient();
const {
  data: { user: authUser },
} = await supabase.auth.getUser();

if (!authUser?.id) {
  return { success: false, error: "Usuario no autenticado" };
}
```

### 2. Buscar en `studio_user_profiles` usando `supabase_id`

```typescript
const studioUserProfile = await prisma.studio_user_profiles.findFirst({
  where: {
    supabase_id: authUser.id, // ID del usuario en Supabase Auth
    studio_id: studio.id, // ID del studio actual
    is_active: true, // Solo usuarios activos
  },
  select: {
    id: true,
    email: true,
    full_name: true,
  },
});

if (!studioUserProfile) {
  return { success: false, error: "Usuario no encontrado en el studio" };
}
```

### 3. Buscar o crear `studio_users`

```typescript
// Buscar primero si ya existe
let studioUser = await prisma.studio_users.findFirst({
  where: {
    studio_id: studio.id,
    full_name: studioUserProfile.full_name, // Buscar por nombre completo
    is_active: true,
  },
  select: { id: true },
});

// Si no existe, crearlo automáticamente
if (!studioUser) {
  studioUser = await prisma.studio_users.create({
    data: {
      studio_id: studio.id,
      full_name: studioUserProfile.full_name,
      phone: null,
      type: "EMPLEADO", // Tipo por defecto para suscriptores
      role: "owner", // Rol por defecto
      status: "active",
      is_active: true,
      platform_user_id: null, // Se vincula después si es necesario
    },
    select: { id: true },
  });
}
```

### 4. Usar `studioUser.id` para asociar registros

```typescript
// Ejemplo: Crear un pago asociado al usuario
const pago = await prisma.studio_pagos.create({
  data: {
    // ... otros campos
    user_id: studioUser.id, // Asociar al usuario del studio
  },
});
```

## Estructura de Tablas

### `studio_user_profiles`

- **Propósito**: Perfiles de usuarios suscriptores autenticados
- **Campos clave**: `supabase_id`, `studio_id`, `email`, `full_name`
- **Relación**: Un usuario puede tener múltiples perfiles (uno por studio)

### `studio_users`

- **Propósito**: Usuarios internos del studio (suscriptores y personal)
- **Campos clave**: `studio_id`, `full_name`, `platform_user_id`
- **Relación**: Vincula suscriptores con permisos en el panel

## Ejemplo Completo

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function crearRegistroConUsuario(
  studioSlug: string,
  data: {
    /* ... */
  }
) {
  try {
    // 1. Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // 2. Obtener usuario autenticado
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.id) {
      return { success: false, error: "Usuario no autenticado" };
    }

    // 3. Buscar studio_user_profiles
    const studioUserProfile = await prisma.studio_user_profiles.findFirst({
      where: {
        supabase_id: authUser.id,
        studio_id: studio.id,
        is_active: true,
      },
      select: { id: true, email: true, full_name: true },
    });

    if (!studioUserProfile) {
      return { success: false, error: "Usuario no encontrado en el studio" };
    }

    // 4. Buscar o crear studio_users
    let studioUser = await prisma.studio_users.findFirst({
      where: {
        studio_id: studio.id,
        full_name: studioUserProfile.full_name,
        is_active: true,
      },
      select: { id: true },
    });

    if (!studioUser) {
      studioUser = await prisma.studio_users.create({
        data: {
          studio_id: studio.id,
          full_name: studioUserProfile.full_name,
          phone: null,
          type: "EMPLEADO",
          role: "owner",
          status: "active",
          is_active: true,
          platform_user_id: null,
        },
        select: { id: true },
      });
    }

    // 5. Crear registro asociado al usuario
    const registro = await prisma.tu_tabla.create({
      data: {
        // ... otros campos
        user_id: studioUser.id, // Asociar al usuario
      },
    });

    revalidatePath(`/${studioSlug}/ruta-relevante`);

    return {
      success: true,
      data: registro,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
```

## Notas Importantes

1. **No usar email directamente**: No buscar por `email` en `platform_user_profiles`, usar `supabase_id` en `studio_user_profiles`.

2. **Creación automática**: Si no existe `studio_users`, se crea automáticamente para evitar errores.

3. **Validación de studio**: Siempre validar que el usuario pertenece al studio correcto usando `studio_id`.

4. **Usuarios activos**: Filtrar por `is_active: true` para evitar usar usuarios desactivados.

5. **Este patrón se usa en**:
   - `payroll-actions.ts` (crear nómina al completar tarea)
   - `payments.actions.ts` (crear ingreso manual)
   - `finanzas.actions.ts` (crear gasto operativo)

## Referencias

- Archivo de referencia: `/src/lib/actions/studio/business/events/payroll-actions.ts` (líneas 156-225)
- Archivos que usan este patrón:
  - `/src/lib/actions/studio/business/events/payments.actions.ts`
  - `/src/lib/actions/studio/business/finanzas/finanzas.actions.ts`
