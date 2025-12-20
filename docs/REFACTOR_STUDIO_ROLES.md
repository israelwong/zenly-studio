# Refactor Propuesto: studio_users.role a StudioRole enum

## 📋 Estado: PENDIENTE (Post-MVP)
**Prioridad:** Media  
**Complejidad:** Media  
**Impacto:** Type Safety + Mejora Arquitectónica  
**Fecha Análisis:** 2025-12-04

---

## 🎯 Objetivo

Convertir `studio_users.role` de `String` libre a `StudioRole` enum para:
- ✅ Type safety en Prisma y TypeScript
- ✅ Prevenir errores de typos en roles
- ✅ Consistencia con otros enums del sistema
- ✅ Mejor mantenibilidad

---

## 🏗️ Arquitectura Actual

### Jerarquía de Roles (Doble Nivel)

```
┌─────────────────────────────────────────────────────────────┐
│           NIVEL PLATAFORMA (ZenPro Global)                   │
├─────────────────────────────────────────────────────────────┤
│  platform_user_profiles.role: UserRole enum                  │
│  ├─ SUPER_ADMIN      (Staff interno ZenPro)                 │
│  ├─ AGENTE           (Staff interno ZenPro)                 │
│  ├─ SUSCRIPTOR       (Cliente pagante = owner studio)       │
│  ├─ PERSONAL_SUSCRIPTOR                                     │
│  └─ CLIENTE_SUSCRIPTOR                                      │
└─────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              NIVEL STUDIO (Negocio Individual)               │
├─────────────────────────────────────────────────────────────┤
│  studio_users.type: PersonnelType enum                       │
│  ├─ EMPLEADO    (Personal interno del studio)               │
│  └─ PROVEEDOR   (Proveedor externo del studio)              │
│                                                              │
│  studio_users.role: String  ⚠️ NO TIPADO                    │
│  ├─ "owner"     (Dueño del studio)                          │
│  ├─ "admin"     (Administrador)                             │
│  ├─ "user"      (Usuario básico)                            │
│  └─ otros...    (Sin validación)                            │
└─────────────────────────────────────────────────────────────┘
```

### Schema Actual

```prisma
model studio_users {
  id                String         @id @default(cuid())
  studio_id         String
  type              PersonnelType  // enum: EMPLEADO | PROVEEDOR
  role              String         // ⚠️ String libre
  platform_user_id  String?
  // ...
}

enum PersonnelType {
  EMPLEADO
  PROVEEDOR
}

enum StudioRole {  // ← Ya existe pero NO se usa
  OWNER
  ADMIN
  MANAGER
  PHOTOGRAPHER
  EDITOR
  ASSISTANT
  PROVIDER
  CLIENT
}
```

---

## 🔍 Problema Identificado

### 1. **Falta de Type Safety**
```typescript
// Actual (❌ Acepta cualquier string)
studio_users: {
  where: { role: 'ownr' }  // ← Typo, compila pero falla en runtime
}

// Propuesto (✅ Type safe)
studio_users: {
  where: { role: 'OWNER' }  // ← Validado en tiempo de compilación
}
```

### 2. **Inconsistencia con Arquitectura**
- Otros enums del sistema: `PersonnelType`, `UserRole`, `EventStatus`, etc.
- Solo `studio_users.role` usa `String` libre
- Enum `StudioRole` ya existe pero no se utiliza

### 3. **Dificultad de Mantenimiento**
```typescript
// Valores actuales sin validación:
"owner", "admin", "user", "manager", etc.
// ¿Qué pasa si alguien escribe "Owner" o "OWNER" o "ownr"?
```

---

## ✅ Propuesta de Refactor

### Schema Actualizado

```prisma
model studio_users {
  id                String         @id @default(cuid())
  studio_id         String
  type              PersonnelType  // Clasificación: EMPLEADO | PROVEEDOR
  role              StudioRole     // ← Cambio: String → enum
  platform_user_id  String?
  // ...
}

enum StudioRole {
  OWNER          // Dueño del studio (= platform_user_profiles.role: SUSCRIPTOR)
  ADMIN          // Administrador con permisos amplios
  MANAGER        // Gerente de operaciones
  PHOTOGRAPHER   // Fotógrafo
  EDITOR         // Editor de contenido
  ASSISTANT      // Asistente
  PROVIDER       // Proveedor externo
  CLIENT         // Cliente del studio
}
```

---

## 📊 Impacto del Cambio

### Archivos a Actualizar (7 archivos)

1. **`prisma/schema.prisma`**
   - Cambiar `role String` → `role StudioRole`

2. **`src/lib/actions/public/profile.actions.ts`**
   ```typescript
   // Antes
   where: { role: 'owner' }
   
   // Después
   where: { role: 'OWNER' }
   ```

3. **`src/lib/actions/studio/business/events/payments.actions.ts`**
   ```typescript
   // Línea 594
   role: 'OWNER',  // Cambio de 'owner' → 'OWNER'
   ```

4. **`src/lib/actions/studio/business/finanzas/finanzas.actions.ts`**
   ```typescript
   // Líneas 1188, 1301, 1553
   role: 'OWNER',
   ```

5. **`src/lib/actions/studio/business/events/payroll-actions.ts`**
   ```typescript
   // Línea 203
   role: 'OWNER',
   ```

6. **`src/middleware.ts`** (si aplica)

7. **Queries en otros archivos que usen `studio_users.role`**

---

## 🔧 Migración SQL

### Paso 1: Verificar Valores Actuales

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
```

### Paso 3: Aplicar Enum

```sql
-- Crear tipo enum (si no existe en Supabase)
DO $$ BEGIN
    CREATE TYPE "StudioRole" AS ENUM (
        'OWNER',
        'ADMIN',
        'MANAGER',
        'PHOTOGRAPHER',
        'EDITOR',
        'ASSISTANT',
        'PROVIDER',
        'CLIENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Cambiar columna a enum
ALTER TABLE studio_users 
ALTER COLUMN role TYPE "StudioRole" 
USING role::"StudioRole";
```

### Paso 4: Validar

```sql
-- Verificar que todos los valores son válidos
SELECT role, COUNT(*) 
FROM studio_users 
GROUP BY role;
```

---

## ⚠️ Consideraciones

### Pros
- ✅ Type safety completo
- ✅ Prevención de errores de typos
- ✅ Autocomplete en IDE
- ✅ Validación en tiempo de compilación
- ✅ Consistencia con arquitectura
- ✅ Mejor documentación (valores claros)

### Contras
- ⚠️ Migración SQL requerida
- ⚠️ Regenerar cliente Prisma
- ⚠️ Actualizar 7 archivos de código
- ⚠️ Testing exhaustivo de permisos
- ⚠️ Posible downtime en migración

---

## 🚦 Recomendación de Implementación

### Cuándo Hacerlo
- ✅ **Post-MVP** (después de lanzamiento inicial)
- ✅ Durante **ventana de mantenimiento**
- ✅ Con **testing completo** de roles/permisos

### Cómo Hacerlo
1. **Fase 1: Preparación**
   - Auditar todos los usos de `studio_users.role`
   - Crear tests para validar permisos
   - Documentar valores actuales en DB

2. **Fase 2: Migración de Código**
   - Actualizar Prisma schema
   - Regenerar cliente
   - Actualizar imports y queries
   - Correr tests

3. **Fase 3: Migración de DB**
   - Backup completo
   - Normalizar valores existentes
   - Aplicar cambio de tipo de columna
   - Validar integridad

4. **Fase 4: Validación**
   - Testing en staging
   - Validar todos los flujos de permisos
   - Smoke tests en producción

---

## 📝 Alternativa: Mantener String

### Si se decide NO hacer el refactor

**Agregar validación en runtime:**

```typescript
// Crear un helper de validación
const VALID_STUDIO_ROLES = ['owner', 'admin', 'user', 'manager'] as const;
type StudioRoleString = typeof VALID_STUDIO_ROLES[number];

function validateStudioRole(role: string): role is StudioRoleString {
  return VALID_STUDIO_ROLES.includes(role as StudioRoleString);
}

// Usar en queries
const role = 'owner';
if (!validateStudioRole(role)) {
  throw new Error(`Invalid studio role: ${role}`);
}
```

**Pros:**
- ✅ Sin migración de DB
- ✅ Alguna validación en runtime

**Contras:**
- ❌ No previene typos en tiempo de desarrollo
- ❌ Validación manual requerida
- ❌ Menos type safety

---

## 🎯 Decisión Post-MVP

**ESTADO: PENDIENTE**

Evaluar después de:
- [ ] MVP lanzado y estable
- [ ] Feedback de usuarios iniciales
- [ ] Auditoría de uso de roles en producción
- [ ] Priorización vs otras mejoras técnicas

---

## 📚 Referencias

- Prisma Enums: https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums
- Supabase Custom Types: https://supabase.com/docs/guides/database/custom-types
- TypeScript Enums: https://www.typescriptlang.org/docs/handbook/enums.html

---

**Documentado por:** Claude  
**Fecha:** 2025-12-04  
**Contexto:** Análisis durante implementación de Analytics System
