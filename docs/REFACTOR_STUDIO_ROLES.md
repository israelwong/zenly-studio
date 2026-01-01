# Refactor Propuesto: studio_users.role a StudioRole enum

## 📋 Estado: PENDIENTE (Post-MVP)
**Prioridad:** Media  
**Complejidad:** Media  
**Impacto:** Type Safety + Mejora Arquitectónica  
**Fecha Análisis:** 2025-12-04  
**Última Actualización:** 2025-12-29

---

## 🎯 Objetivo

Convertir `studio_users.role` de `String` libre a `StudioRole` enum para:
- ✅ Type safety en Prisma y TypeScript
- ✅ Prevenir errores de typos en roles
- ✅ Consistencia con otros enums del sistema
- ✅ Mejor mantenibilidad
- ✅ Alineación con el sistema `user_studio_roles` existente

---

## 🏗️ Arquitectura Actual

### Sistema de Roles Dual (Coexistencia)

El sistema actual tiene **DOS estructuras de roles coexistiendo**:

```
┌─────────────────────────────────────────────────────────�er.user_metadata.role: String                            │
│  ├─ "super_admin"    (Staff interno ZenPro)                │
│  ├─ "agente"         (Staff interno ZenPro)                │
│  ├─ "suscriptor"     (Cliente pagante = owner studio)      │
│  └─ "studio_owner"   (Alias de suscriptor)                                                  │
│  user_platform_roles.role: PlatformRole enum                │
│  ├─ SUPER_ADMIN                                             │
│  ├─ AGENTE                                                  │
│  └─ SUSC                        │
└─────────────────────────────────────────────────────────────┘
                       ↓├─────────────────────────────────────────────────────────────┤
│  ⚠️ SISTEMA LEGACY (studio_users)                           │
│  studio_users.role: String  ⚠️ NO TIPADO                   │
│  ├─ "owner"     (Dueño del studio)                         │
│  ├─ "admin"     (Administrador)                             │
│  ├─ "user"      (Usuario básico)                            │
│  └─ otros...    (Sin validación)                                             │
│  ├─ OWNER                                                   │
│  ├─ ADMIN                                                   │
│  ├─ MANAGER                                                 │
│  ├─ PHOTOGRAPHER                                            │
│  ├─ EDITOR                                                  │
│  ├─ ASSISTANT                                               │
│  ├─ PROVIDER                                                │
│  └─ CLIENT                                                  │
│                                                              │ Permisos por StudioRole + module_slug                   │
│  └─ Permisos JSON por módulo (read/write/delete)           │
└─────────────────────────────────────────────────────────────┘
```

### Schema Actual

```prisma
// ⚠️ SISTEMA LEGACY - Aún en uso
model studio_users {
  id                String         @id @default(cuid())
  studio_id         String
  type              PersonnelType  // enum: EMPLEADO | PROVEEDOR
  role              String         // ⚠️ String libre (default: "user")
  status            String         // default: "inactive"
  platform_user_id  String?
  // ...
}

// ✅ SISTEMA NUEVO - Implementado pero no completamente util
  studio_id                 String
  role                      StudioRole                       // ✅ Enum tipado
  permissions               Json?                            // Permisos personalizados
  is_active                 Boolean                          @default(true)
  invited_at                DateTime                         @default(now())
  invited_by                String?
  accepted_at               DateTime?
  revoked_at                DateTime?
  // ...
  @@unique([user_id, studio_id, role])
}

model studio_role_permissions {
  id          String     @id @default(cuid())
  studio_id   String
  role        StudioRole // ✅ Enum tipado
  module_slug String
  permissions Json       // Permisos módulo
  // ...
  @@unique([studio_id, role, module_slug])
}

enum PersonnelType {
  EMPLEADO
  PROVEEDOR
}

enum StudioRole {  // ← Ya existe y se usa en user_studio_roles
  OWNER
  ADMIN
  MANAGER
  PHOTOGRAPHER
  EDITOR
  ASSISTANT
  PROVIDER
  CLIENT
}

enum PlatformRole {
  SUPER_ADMIN
  AGENTE
  SUSCRIPTOR
}
```

---

## 🔍 Pro Identificado

### 1. **Inconsistencia entre Sistemas**

El sistema tiene **dos estructuras de roles** que no están sincronizadas:

- **`studio_users.role`** (legacy): String libre, usado en nóminas, gastos, eventos
- **`user_studio_roles.role`** (nuevo): Enum tipado, diseñado para permisos granulares

**Problema:** No hay migración de datos ni unificación de uso.

### 2. **Falta de Type Safety en Legacy**

```typescript
// Actualcepta cualquier string)
studio_users: {
  where: { role: 'ownr' }  // ← Typo, compila pero falla en runtime
}

// Propuesto (✅ Type safe)
studio_users: {
  where: { role: 'OWN}  // ← Validado en tiempo de compilación
}
```

### 3. **Validación Solo a Nivel Plataforma**

El middleware actual (`src/proxy.ts`) solo valida `PlatformRole`:

```typescript
// src/proxylínea 116
const userRole = user.user_metadata?.role; // Solo PlatformRole
const hasAccess = checkRouteAccess(userRole, pathname); // Solo valida nivel plataforma
```

**Nose valida `StudioRole`** en middleware, solo se verifica acceso a studio por slug.

### 4. **Permisos Granulares No Implementados**

- `studio_role_permissions` existe pero no se utiliza
- `user_studio_roles.permissions` (JSON) existe pero no se valida
- No hay checks de permisos por módulo/ruta

---

## ✅ Propuesta de Refactor

### Opción A: Migrar studio_users.role a StudioRole enum

**Schema Actualizado:**

```prisma
model studio_users {
  id            String         @id @default(cuid())
  studio_id         String
  type              PersonnelType
  role              StudioRole     // ← Cambio: String �num
  status            String         @default("inactive")
  platform_user_id  String?
  // ...
}
```

**Pros:**
- ✅ Type safety completo
- ✅ Consistencia con `user_studio_roles`
- ✅ Prevencierrores de typos
- ✅ Autocomplete en IDE

**Contras:**
- ⚠️ Migración SQL requerida
- ⚠️ Actualizar múltiples archivos que usan `studio_users.role`
- ⚠️ Posible downtime en migración

### Opción B: Unificar en user_studio_roles (Recomendado)

**Estratetudio_users.role` y migrar completamente a `user_studio_roles`:

1. **Migrar datos:**
   ```sql
   -- Crear user_studio_roles desde studio_users
   INSERT INTO user_studio_roles (user_id, studio_id, role, is_active)
   SELECT 
     platform_user_id,
     studio_id,
     CASE 
       WHEN role = 'owner' THEN 'OWNER'
       WHEN role = 'admin' THEN 'ADMIN'
       WHEN role = 'user' THEN 'ASSISTANT'
       ELSE 'ASSISTANT'
     END::StudioRole,
     is_active
   FROM studio_users
   WHERE platform_user_id IS NOT NULL;
   ```

2. **Actualizar relaciones:**
   - Cambiar foreign keys de `studio_users.id` a `user_studio_roles.id` donde sea necesario
   - Mantener `studio_users` solo para datos de personal (nóminas, gastos)

3. **Actualizar middleware:**
   ```typesript
   // Validar StudioRole en middleware
   const studioRole = await getUserStudioRole(userId, studioId);
   if (!hasStudioPermission(studioRole, pathname)) {
     return NextResponse.redirect(new URL("/unauthorized", request.url));
   }
   ```

**Pros:**
- ✅ Usa sistema nuevo ya implementado
- ✅ Permisos granulares ya disponibles
- ✅ Mejor arquitectura a largo plazo
- ✅ No requiere cambiar tipo de columna en `studio_users`

**Contras:**
- ⚠️ Refactor más grande
- ⚠️ Requiere actualizar todas las relaciono de desarrollo

---

## 📊 Impacto del Cambio

### Archivos que Usan `studio_users.role` (Estimado: 10+ archivos)

1. **`prisma/schema.prisma`**
   - Cambiar `role String` → `role StudioRole`

2. **`src/lib/actions/public/profile.actions.t
   ```typescript
   // Antes
   where: { role: 'owner' }
   
   // Después
   where: { role: 'OWNER' }
   ```

3. **`src/lib/actions/studio/business/events/payments.actions.ts`**
   ```typescript
   // Línea ~594
   role: 'OWNER',  //ambio de 'owner' → 'OWNER'
   ```

4. **`src/lib/actions/studio/business/finanzas/finanzas.actions.ts`**
   ```typescript
   // Líneas ~1188, 1301, 1553
   role: 'OWNER',
   ```

5. **`src/lib/actions/studio/business/events/payroll-actions.ts`**
   ```typescr
   // Línea ~203
   role: 'OWNER',
   ```

6. **`src/middleware.ts`** / **`src/proxy.ts`**
   - Agregar validación de `StudioRole` además de `PlatformRole`

7. **Queries en otros archivos que usen `studio_users.role`**

### Archivos que Usan `user_sto_roles` (Sistema Nuevo)

- Ya implementado pero **no completamente utilizado**
- `studio_role_permissions` existe pero **no se valida**
- Middleware no valida permisos granulares

---

## 🔧 Migración SQL (Opción A)

### Paso 1: Vecar Valores Actuales

```sql
-- Ver todos los roles distintos en uso
SELECT DISTINCT role, COUNT(*) as count
FROM studio_users
GROUP BY role
ORDER BY count DESC;
```

### Paso 2: Normalizar Valores (si es necesario)

```sql
-- Convertir a uppercase si hay inconsistencias
UPDATE studio_users
SET role = UPPER(role)
WHERE role IS NOT NULL;

-- Mapear valores no estándar
UPDATE studio_users
SET role = 'OWNER'
WHERE role IN ('owner', 'Owner', 'OWNER');

UPDATE studio_users
SET role = 'ADMIN'
WHERE role IN ('admin', 'Admin', 'ADMIN');

UPDATE studio_sers
SET role = 'ASSISTANT'
WHERE role IN ('user', 'User', 'USER', 'assistant', 'Assistant');
```

### Paso 3: Aplicar Enum

```sql
-- El tipo enum ya existe (usado por user_studio_roles)
-- Solo cambiar columna a enum
ALTER TABLE studio_users 
ALTER COLUMN role TYPE "StudioRole" 
USING role::"StudioRole";
```

### Paso 4: Validar

```sql
-- Verificar que todos los valores son válidos
SELECT role, COUNT(*) 
FROMstudio_users 
GROUP BY role;
```

---

## 🚦 Recomendación de Implementación

### Cuándo Hacerlo
- ✅ **Post-MVP** (después de lanzamiento inicial)
- ✅ Durante **ventana de mantenimiento**
- ✅ Con **testing completo** de roles/permisos
- ✅ Despr uso de `user_studio_roles` en toda la aplicación

### Cómo Hacerlo (Recomendado: Opción B)

1. **Fase 1: Preparación**
   - Auditar todos los usos de `studio_users.role`
   - Crear tests pvalidar permisos
   - Documentar valores actuales en DB
   - Migrar datos a `user_studio_roles`

2. **Fase 2: Implementar Validación StudioRole**
   - Crear `src/lib/auth/studio-permissions.ts`
   - Implementar `getUserStudioRole(userId, studioId)`
   - mplementar `hasStudioPermission(role, module)`
   - Implementar `canAccessStudioRoute(role, pathname)`

3. **Fase 3: Actualizar Middleware**
   - Actualizar `src/proxy.ts` para validar `StudioRole`
   - Agregar validación de permiso por ruta/módulo
   - Probar acceso con diferentes roles

4. **Fase 4: Migración de Código**
   - Actualizar queries que usan `studio_users.role`
   - Migrar a usar `user_studio_roles` donde sea posible
   - Regenercliente Prisma
   - Correr tests

5. **Fase 5: Migración de DB (Solo si Opción A)**
   - Backup completo
   - Normalizar valores existentes
   - Aplicar cambio de tipo de columna
   - Validar integridad

6. **Fase 6: Validación**
   - Testing en staging
   - Validar todos los flujos de permisos
  Smoke tests en producción

---

## ⚠️ Consideraciones

### Pros (Opción A)
- ✅ Type safety completo en `studio_users`
- ✅ Prevención de errores de typos
- ✅ Autocomplete en IDE
- ✅ Validación en tiempo de compilación
- ✅ Consistencia con `user_studio_roles`

### Contras (Opción A)
- ⚠️ Migración SQL requerida
- ⚠️ Regenerar cliente Prisma
- �s de código
- ⚠️ Testing exhaustivo de permisos
- ⚠️ Posible downtime en migración
- ⚠️ Mantiene dos sistemas de roles

### Pros (Opción B - Recomendado)
- ✅ Usa sistementado
- ✅ Permisos granulares disponibles
- ✅ Mejor arquitectura a largo plazo
- ✅ Unifica en un solo sistema de roles
- ✅ No requiere cambiar tipo de columna

### Contras (Opción B)
- ⚠️ Refactor más grande
- ⚠️ Requiere actualizar todas las relaciones
- ⚠️ Más tiempo de desarrodad de mantener `studio_users.role` temporalmente

---

## 📝 Estado Actual de Implementación

### ✅ Implementado
- `user_studio_roles` con `StudioRole` enum
- `studio_role_permissions` para sos granulares
- Schema Prisma con enums definidos

### ❌ No Implementado
- Validación de `StudioRole` en middleware (`proxy.ts`)
- Validación de permisos granulares por módulo
- Migración de `studio_users.role` a enum
- Uso consistente de `user_studio_roles` en toda la aplicación

### 🔄 Eualmente
- `studio_users.role` (String) - Sistema legacy
- `user.user_metadata.role` (PlatformRole) - Validado en middleware
- `user_studio_roles.role` (StudioRole) - Existe pero no se valida

---

## 🎯 Decisión Post-MVP

**ESTADO: PENDIENTE**

Evaluar después de:
- [ ] MVP lanza estable
- [ ] Feedback de usuarios iniciales
- [ ] Auditoría de uso de roles en producción
- [ ] Implementación completa de `user_studio_roles`
- [ ] Validación de permisos granulares funcionando
- [ ] Priorización vs otras mejoras técnicas

**Recomendación:** Implementar **Opción ficar en `user_studio_roles`) en lugar de solo migrar `studio_users.role` a enum, ya que proporciona mejor arquitectura y permisos granulares.

---

## 📚 Referencias

- Prisma Enums: https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums
- Supabase Custom Types: https://supabase.com/docs/guides/database/custom-types
- TypeScript Enums: https://www.typescriptlang.org/docs/handbook/enums.html
- Plan de Sistema de Permisos: `.cursor/plans/sistema-permisos-equipo-studio.md`---

**Documentado por:** Claude  
**Fecha Análisis:** 2025-12-04  
**Última Actualización:** 2025-12-29  
**Contexto:** Análisis durante implementación de Analytics System isión de arquitectura de roles
