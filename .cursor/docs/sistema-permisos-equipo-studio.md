# Sistema de Permisos para Miembros del Equipo Studio

## Objetivo

Implementar sistema de permisos granulares que permita a los owners de estudios invitar miembros de su equipo (crew members) para gestionar el estudio con restricciones de visualización, edición o eliminación por módulo/sección.

## Contexto Actual

### Estructura Existente

**Roles de Plataforma:**
- `PlatformRole`: SUPER_ADMIN, AGENTE, SUSCRIPTOR
- Validación actual solo a nivel `PlatformRole` en `proxy.ts`

**Roles de Studio:**
- `StudioRole`: OWNER, ADMIN, MANAGER, PHOTOGRAPHER, EDITOR, ASSISTANT, PROVIDER, CLIENT
- Tabla `user_studio_roles` existe pero no se valida en middleware
- Tabla `studio_role_permissions` existe pero no se utiliza

**Crew Members:**
- `studio_crew_members`: Miembros del equipo (operadores, proveedores, administrativos)
- `studio_crew_member_account`: Tiene `email` y `supabase_id` pero NO conectado a `users` o `user_studio_roles`
- **Problema**: Crew members no pueden acceder al portal de gestión

### Problemas Identificados

1. ❌ Crew members no pueden acceder: No hay conexión entre `studio_crew_members` y `users`/`user_studio_roles`
2. ❌ No se valida `StudioRole` en middleware: Solo se valida `PlatformRole`
3. ❌ Permisos granulares no implementados: Existe `studio_role_permissions` pero no se usa
4. ❌ Sin validación por módulo/sección: No hay checks de permisos por ruta/módulo

## Solución: Opción A - Usar Estructura Existente

### Arquitectura

```
User (Supabase Auth)
  ↓
users (tabla)
  ↓
user_studio_roles (rol en studio específico)
  ↓
studio_role_permissions (permisos por módulo)
  ↓
studio_crew_members (opcional: vinculación con crew)
```

### Flujo de Invitación

1. Owner/Admin invita crew member por email
2. Si no tiene cuenta:
   - Crear usuario en Supabase Auth
   - Crear registro en `users`
   - Crear `user_studio_roles` con `StudioRole` apropiado
   - Vincular `studio_crew_members` con `user_id`
3. Si ya tiene cuenta:
   - Solo crear `user_studio_roles`
   - Vincular `studio_crew_members` con `user_id`

## Cambios en Base de Datos

### 1. Modificar `studio_crew_members`

```prisma
model studio_crew_members {
  id               String       @id @default(cuid())
  studio_id        String
  name             String
  email            String?
  phone            String?
  emergency_phone  String?
  tipo             PersonalType
  status           String       @default("activo")
  fixed_salary     Float?
  salary_frequency String?
  variable_salary  Float?
  clabe_account    String?
  order            Int?
  created_at          DateTime     @default(now())
  updated_at      DateTime     @updatedAt
  
  // NUEVOS CAMPOS
  user_id          String?      @unique
  user_studio_role_id String?    @unique
  
  // RELACIONES EXISTENTES
  studio           studios                     @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  skills           studio_crew_member_skills[]
  account          studio_crew_member_account?
  nominas          studio_nominas[]
  cotizacion_items studio_cotizacion_items[]
  gastos           studio_gastos[]
  
  // NUEVAS RELACIONES
  user             users?                       @relation(fields: [user_id], references: [id], onDelete: SetNull)
  user_studio_role user_studio_roles?           @relation(fields: [user_studio_role_id], references: [id], onDelete: SetNull)

  @@index([studio_id])
  @@index([status])
  @@index([tipo])
  @@index([user_id])
  @@index([user_studio_role_id])
}
```

### 2. Modificar `user_studio_roles`

```prisma
model user_studio_roles {
  id                        String                           @id @default(cuid())
  user_id                   String
  studio_id                 String
  role                      StudioRole
  permissions               Json?
  is_active                 Boolean                          @default(true)
  invited_at                DateTime                         @default(now())
  invited_by                String?
  accepted_at               DateTime?
  revoked_at                DateTime?
  
  // NUEVA RELACIÓN
  crew_member               studio_crew_members?
  
  // RELACIONES EXISTENTES
  assigned_tasks_scheduler  studio_scheduler_event_tasks[]   @relation("TaskAssignedTo")
  completed_tasks_scheduler studio_scheduler_event_tasks[]   @relation("TaskCompletedBy")
  scheduler_task_activities studio_scheduler_task_activity[]
  event_tasks               studio_event_tasks[]
  event_timeline            studio_event_timeline[]
  managed_events            studio_events[]                  @relation("EventProjectManager")
  studio                    studios                          @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  user                      users                            @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, studio_id, role])
  @@index([user_id, is_active])
  @@index([studio_id, is_active])
  @@index([role, is_active])
  @@index([user_id, studio_id, is_active])
}
```

### 3. Migración SQL

```sql
-- Agregar columnas a studio_crew_members
ALTER TABLE studio_crew_members
ADD COLUMN user_id TEXT UNIQUE,
ADD COLUMN user_studio_role_id TEXT UNIQUE;

-- Agregar índices
CREATE INDEX IF NOT EXISTS studio_crew_members_user_id_idx ON studio_crew_members(user_id);
CREATE INDEX IF NOT EXISTS studio_crew_members_user_studio_role_id_idx ON studio_crew_members(user_studio_role_id);

-- Agregar foreign keys
ALTER TABLE studio_crew_members
ADD CONSTRAINT studio_crew_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE studio_crew_members
ADD CONSTRAINT studio_crew_members_user_studio_role_id_fkey 
  FOREIGN KEY (user_studio_role_id) REFERENCES user_studio_roles(id) ON DELETE SET NULL;
```

## Backend: Helpers de Permisos

### 1. Crear `src/lib/auth/studio-permissions.ts`

```typescript
"use server";

import { prisma } from '@/lib/prisma';
import { StudioRole } from '@prisma/client';

/**
 * Obtiene el rol de studio de un usuario
 */
export async function getUserStudioRole(
  userId: string,
  studioId: string
): Promise<StudioRole | null> {
  const userRole = await prisma.user_studio_roles.findFirst({
    where: {
      user_id: userId,
      studio_id: studioId,
      is_active: true,
      revoked_at: null,
    },
    select: { role: true },
  });

  return userRole?.role || null;
}

/**
 * Verifica si un usuario tiene un permiso específico en un módulo
 */
export async function hasStudioPermission(
  userId: string,
  studioId: string,
  moduleSlug: string,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> {
  // 1. Obtener rol del usuario
  const userRole = await getUserStudioRole(userId, studioId);
  if (!userRole) return false;

  // 2. OWNER siempre tiene todos los permisos
  if (userRole === StudioRole.OWNER) return true;

  // 3. Verificar permisos en studio_role_permissions
  const rolePermissions = await prisma.studio_role_permissions.findUnique({
    where: {
      studio_id_role_module_slug: {
        studio_id: studioId,
        role: userRole,
        module_slug: moduleSlug,
      },
    },
  });

  if (!rolePermissions) return false;

  const permissions = rolePermissions.permissions as Record<string, any>;
  return permissions[action] === true;
}

/**
 * Verifica si un usuario puede acceder a una ruta de studio
 */
export async function canAccessStudioRoute(
  userId: string,
  studioSlug: string,
  pathname: string
): Promise<boolean> {
  // 1. Obtener studio
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!studio) return false;

  // 2. Verificar que tiene rol activo
  const userRole = await getUserStudioRole(userId, studio.id);
  if (!userRole) return false;

  // 3. OWNER y ADMIN pueden acceder a todo
  if (userRole === StudioRole.OWNER || userRole === StudioRole.ADMIN) {
    return true;
  }

  // 4. Mapear rutas a módulos
  const routeModuleMap: Record<string, string> = {
    '/manager': 'manager',
    '/marketing': 'marketing',
    '/magic': 'magic',
    '/payment': 'payment',
    '/conversations': 'conversations',
    '/cloud': 'cloud',
    '/invitation': 'invitation',
    '/config': 'config',
    '/business': 'manager', // business es parte de manager
  };

  // 5. Extraer módulo de la ruta
  const moduleSlug = Object.entries(routeModuleMap).find(([route]) =>
    pathname.includes(route)
  )?.[1];

  if (!moduleSlug) return false;

  // 6. Verificar permiso de lectura
  return hasStudioPermission(userId, studio.id, moduleSlug, 'read');
}

/**
 * Obtiene todos los permisos de un usuario en un studio
 */
export async function getUserStudioPermissions(
  userId: string,
  studioId: string
): Promise<Record<string, Record<string, boolean>>> {
  const userRole = await getUserStudioRole(userId, studioId);
  if (!userRole) return {};

  if (userRole === StudioRole.OWNER) {
    // OWNER tiene todos los permisos
    return {
      manager: { read: true, write: true, delete: true },
      marketing: { read: true, write: true, delete: true },
      magic: { read: true, write: true, delete: true },
      // ... todos los módulos
    };
  }

  const permissions = await prisma.studio_role_permissions.findMany({
    where: {
      studio_id: studioId,
      role: userRole,
    },
  });

  const result: Record<string, Record<string, boolean>> = {};
  permissions.forEach((perm) => {
    result[perm.module_slug] = perm.permissions as Record<string, boolean>;
  });

  return result;
}
```

### 2. Actualizar `src/proxy.ts`

```typescript
// Agregar import
import { canAccessStudioRoute } from '@/lib/auth/studio-permissions';
import { createClient } from '@/lib/supabase/server';

// Modificar sección de validación de rutas studio
if (isStudioProtected) {
  const studioSlugFromPath = pathname.match(/^\/([a-zA-Z0-9-]+)\/studio/)?.[1];
  
  if (!studioSlugFromPath) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // NUEVA VALIDACIÓN: Verificar acceso por StudioRole
  const hasStudioAccess = await canAccessStudioRoute(
    user.id,
    studioSlugFromPath,
    pathname
  );

  if (!hasStudioAccess) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Validación existente de studio_slug
  if (studioSlug && studioSlugFromPath !== studioSlug) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
}
```

### 3. Server Actions para Invitación

### Crear `src/lib/actions/studio/team/invite.actions.ts`

```typescript
"use server";

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { StudioRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const InviteTeamMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(StudioRole),
  crewMemberId: z.string().optional(),
  modulePermissions: z.record(z.string(), z.object({
    read: z.boolean(),
    write: z.boolean(),
    delete: z.boolean(),
  })).optional(),
});

/**
 * Invitar miembro del equipo al studio
 */
export async function inviteTeamMember(
  studioSlug: string,
  data: unknown
) {
  try {
    const validated = InviteTeamMemberSchema.parse(data);
    
    // 1. Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // 2. Obtener usuario actual (invitador)
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return { success: false, error: 'No autenticado' };
    }

    // 3. Verificar que el invitador tiene permisos (OWNER o ADMIN)
    const inviterRole = await getUserStudioRole(currentUser.id, studio.id);
    if (inviterRole !== StudioRole.OWNER && inviterRole !== StudioRole.ADMIN) {
      return { success: false, error: 'Sin permisos para invitar' };
    }

    // 4. Buscar si el usuario ya existe
    let user = await prisma.users.findUnique({
      where: { email: validated.email },
    });

    // 5. Si no existe, crear usuario
    if (!user) {
      // Crear en Supabase Auth
      const supabaseAdmin = createAdminClient(); // Helper
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: validated.email,
        email_confirm: false, // Enviar email de confirmación
        user_metadata: {
          role: 'suscriptor', // PlatformRole
          studio_slug: studioSlug,
        },
      });

      if (authError || !authData.user) {
        return { success: false, error: 'Error al crear usuario' };
      }

      // Crear en tabla users
      user = await prisma.users.create({
        data: {
          supabase_id: authData.user.id,
          email: validated.email,
          is_active: true,
        },
      });
    }

    // 6. Crear user_studio_roles
    const userStudioRole = await prisma.user_studio_roles.create({
      data: {
        user_id: user.id,
        studio_id: studio.id,
        role: validated.role,
        invited_by: currentUser.id,
        is_active: true,
        accepted_at: null, // Esperar aceptación
      },
    });

    // 7. Crear permisos por módulo si se especificaron
    if (validated.modulePermissions) {
      await Promise.all(
        Object.entries(validated.modulePermissions).map(([moduleSlug, perms]) =>
          prisma.studio_role_permissions.upsert({
            where: {
              studio_id_role_module_slug: {
                studio_id: studio.id,
                role: validated.role,
                module_slug: moduleSlug,
              },
            },
            update: {
              permissions: perms,
            },
            create: {
              studio_id: studio.id,
              role: validated.role,
              module_slug: moduleSlug,
              permissions: perms,
            },
          })
        )
      );
    }

    // 8. Si hay crewMemberId, vincular
    if (validated.crewMemberId) {
      await prisma.studio_crew_members.update({
        where: { id: validated.crewMemberId },
        data: {
          user_id: user.id,
          user_studio_role_id: userStudioRole.id,
        },
      });
    }

    // 9. Enviar email de invitación (TODO: implementar)

    revalidatePath(`/${studioSlug}/studio/config/equipo`);
    return { success: true, data: userStudioRole };
  } catch (error) {
    console.error('[inviteTeamMember] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al invitar',
    };
  }
}

/**
 * Aceptar invitación
 */
export async function acceptInvitation(
  studioSlug: string,
  invitationId: string
) {
  // Implementar lógica de aceptación
}

/**
 * Revocar acceso de miembro del equipo
 */
export async function revokeTeamMemberAccess(
  studioSlug: string,
  userStudioRoleId: string
) {
  // Implementar lógica de revocación
}
```

## Frontend: UI de Gestión

### 1. Página de Gestión de Equipo

**Ruta:** `/[slug]/studio/config/equipo`

**Componentes:**
- Lista de miembros del equipo con roles
- Botón "Invitar miembro"
- Modal de invitación con:
  - Email
  - Selección de rol (StudioRole)
  - Selección de crew member (opcional)
  - Configuración de permisos por módulo
- Acciones: Editar permisos, Revocar acceso

### 2. Hook de Permisos

**Crear `src/hooks/useStudioPermissions.ts`**

```typescript
"use client";

import { useEffect, useState } from 'react';
import { getUserStudioPermissions } from '@/lib/actions/studio/team/permissions.actions';

export function useStudioPermissions(studioSlug: string) {
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getUserStudioPermissions(studioSlug);
      if (result.success) {
        setPermissions(result.data);
      }
      setLoading(false);
    }
    load();
  }, [studioSlug]);

  const can = (module: string, action: 'read' | 'write' | 'delete') => {
    return permissions[module]?.[action] === true;
  };

  return { permissions, loading, can };
}
```

### 3. Componente de Protección

**Crear `src/components/shared/StudioPermissionGuard.tsx`**

```typescript
interface StudioPermissionGuardProps {
  studioSlug: string;
  module: string;
  action: 'read' | 'write' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StudioPermissionGuard({
  studioSlug,
  module,
  action,
  children,
  fallback = null,
}: StudioPermissionGuardProps) {
  const { can } = useStudioPermissions(studioSlug);

  if (!can(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

## Validación en Server Actions Existentes

### Patrón a aplicar en todas las server actions:

```typescript
export async function crearLead(studioSlug: string, data: unknown) {
  // 1. Obtener usuario actual
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // 2. Obtener studio
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });
  if (!studio) throw new Error('Studio no encontrado');

  // 3. Validar permisos
  const hasPermission = await hasStudioPermission(
    user.id,
    studio.id,
    'manager', // o el módulo correspondiente
    'write'
  );

  if (!hasPermission) {
    throw new Error('Sin permisos para esta acción');
  }

  // 4. Continuar con la lógica...
}
```

## Estructura de Permisos por Módulo

### Permisos por defecto por rol:

```typescript
const DEFAULT_ROLE_PERMISSIONS: Record<StudioRole, Record<string, any>> = {
  OWNER: {
    manager: { read: true, write: true, delete: true },
    marketing: { read: true, write: true, delete: true },
    magic: { read: true, write: true, delete: true },
    payment: { read: true, write: true, delete: true },
    conversations: { read: true, write: true, delete: true },
    cloud: { read: true, write: true, delete: true },
    invitation: { read: true, write: true, delete: true },
    config: { read: true, write: true, delete: true },
  },
  ADMIN: {
    manager: { read: true, write: true, delete: false },
    marketing: { read: true, write: true, delete: false },
    magic: { read: true, write: true, delete: false },
    config: { read: true, write: true, delete: false },
  },
  MANAGER: {
    manager: { read: true, write: true, delete: false },
    marketing: { read: true, write: false, delete: false },
  },
  PHOTOGRAPHER: {
    manager: { read: true, write: false, delete: false },
  },
  EDITOR: {
    manager: { read: true, write: false, delete: false },
  },
  ASSISTANT: {
    manager: { read: true, write: false, delete: false },
  },
  PROVIDER: {
    // Sin acceso por defecto
  },
  CLIENT: {
    // Sin acceso por defecto
  },
};
```

## Checklist de Implementación

### Fase 1: Base de Datos
- [ ] Crear migración para agregar `user_id` y `user_studio_role_id` a `studio_crew_members`
- [ ] Actualizar schema Prisma
- [ ] Ejecutar migración
- [ ] Verificar índices y foreign keys

### Fase 2: Backend - Helpers
- [ ] Crear `src/lib/auth/studio-permissions.ts`
- [ ] Implementar `getUserStudioRole`
- [ ] Implementar `hasStudioPermission`
- [ ] Implementar `canAccessStudioRoute`
- [ ] Implementar `getUserStudioPermissions`

### Fase 3: Backend - Middleware
- [ ] Actualizar `src/proxy.ts` para validar `StudioRole`
- [ ] Agregar validación de permisos por ruta
- [ ] Probar acceso con diferentes roles

### Fase 4: Backend - Server Actions
- [ ] Crear `src/lib/actions/studio/team/invite.actions.ts`
- [ ] Implementar `inviteTeamMember`
- [ ] Implementar `acceptInvitation`
- [ ] Implementar `revokeTeamMemberAccess`
- [ ] Crear actions para obtener permisos
- [ ] Actualizar server actions existentes con validación de permisos

### Fase 5: Frontend - UI
- [ ] Crear página `/[slug]/studio/config/equipo`
- [ ] Crear componente de lista de miembros
- [ ] Crear modal de invitación
- [ ] Crear componente de configuración de permisos
- [ ] Crear hook `useStudioPermissions`
- [ ] Crear componente `StudioPermissionGuard`
- [ ] Integrar protección en componentes existentes

### Fase 6: Testing
- [ ] Probar invitación de nuevo usuario
- [ ] Probar invitación de usuario existente
- [ ] Probar diferentes roles y permisos
- [ ] Probar restricciones de acceso por módulo
- [ ] Probar revocación de acceso
- [ ] Probar vinculación con crew members

### Fase 7: Documentación
- [ ] Documentar estructura de permisos
- [ ] Documentar flujo de invitación
- [ ] Crear guía para developers sobre cómo usar permisos
- [ ] Actualizar README con nueva funcionalidad

## Notas Técnicas

### Consideraciones

1. **Performance**: Cachear permisos en sesión para evitar queries repetidas
2. **Seguridad**: Validar permisos en server actions, no solo en frontend
3. **UX**: Mostrar mensajes claros cuando no hay permisos
4. **Migración**: Crew members existentes pueden no tener cuenta, manejar caso opcional

### Extensiones Futuras

- Portal separado para operadores (si se requiere)
- Permisos más granulares por sección dentro de módulos
- Historial de cambios de permisos
- Notificaciones de invitaciones y cambios de permisos

## Referencias

- Schema actual: `prisma/schema.prisma`
- Middleware actual: `src/proxy.ts`
- Helpers de módulos: `src/lib/modules/index.ts`
- Roles: `src/lib/actions/constants/roles.ts`

