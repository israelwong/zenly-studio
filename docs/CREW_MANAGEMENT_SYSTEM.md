# 🎬 Sistema de Gestión de Personal (Crew Management)

**Versión:** 1.0  
**Fecha:** 27 de Noviembre 2025  
**Estado:** ✅ FASES 1-3 COMPLETADAS | ⏳ FASES 4-5 PENDIENTES  
**Prioridad:** Alta (MVP)
**Rama:** `251127-studio-crew`

---

## 🚀 ESTADO DE IMPLEMENTACIÓN (27-11-2025)

### ✅ COMPLETADO

**FASE 1: Schema & BD**
- ✅ Eliminar `studio_crew_categories` (redundante)
- ✅ Crear `studio_crew_skills` (habilidades reutilizables)
- ✅ Crear `studio_crew_member_skills` (M:N relationship)
- ✅ Crear `studio_crew_member_account` (panel personal)
- ✅ Simplificar `studio_crew_members`
- ✅ BD sincronizada con `prisma db push`
- ✅ Prisma Client generado

**FASE 2: Server Actions**
- ✅ `crew.actions.ts` (5 funciones CRUD)
- ✅ `skills.actions.ts` (7 funciones gestión skills)
- ✅ `accounts.actions.ts` (6 funciones panel personal)
- ✅ `crew-schemas.ts` (Validación Zod completa)
- ✅ Todos los actions con error handling y revalidación

**FASE 3: Componentes UI**
- ✅ `CrewMembersManager` (Sheet + Tabs)
- ✅ `CrewMemberCard` (Tarjeta con acciones)
- ✅ `CrewMemberForm` (Create/Edit)
- ✅ `SkillsInput` (Typeahead + crear skills)
- ✅ Integración completa con actions

### ⏳ PENDIENTE

**FASE 4: Panel Administrativo Crew**
- [ ] Crear rutas `/studio/[slug]/crew/dashboard`
- [ ] Crear componentes de dashboard
- [ ] Listar asignaciones (cotizaciones/eventos)
- [ ] Mostrar nóminas y pagos
- [ ] Ver perfil personal
- [ ] Descargar documentos/recibos

**FASE 5: Testing & Docs**
- [ ] Testing manual de flujos completos
- [ ] Testing edge cases
- [ ] Documentación de usuario final
- [ ] User guide admin
- [ ] User guide crew

### 📊 MÉTRICAS

| Métrica | Valor |
|---------|-------|
| Líneas de código creadas | 2,026 |
| Server actions | 18 |
| Componentes React | 4 |
| Archivos modificados | 6 |
| Commits | 3 |
| Tablas DB creadas | 3 |
| Tablas DB eliminadas | 3 |

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Análisis del Problema](#análisis-del-problema)
3. [Arquitectura Propuesta](#arquitectura-propuesta)
4. [Esquema de Base de Datos](#esquema-de-base-de-datos)
5. [Flujos de Usuario](#flujos-de-usuario)
6. [Plan de Implementación](#plan-de-implementación)
7. [Consideraciones Técnicas](#consideraciones-técnicas)

---

## 📊 Resumen Ejecutivo

### Objetivo

Implementar un sistema flexible y escalable para gestionar personal (fotografos, asistentes, editores, etc.) con:

- Gestión centralizada desde admin
- Panel administrativo personal (login individual)
- Asignación flexible a eventos/cotizaciones
- Reutilización de skills sin duplicación

### Cambios Principales

- ✅ **Eliminar:** Tabla redundante `studio_crew_categories`
- ✅ **Crear:** Tabla `studio_crew_skills` (M:N flexible)
- ✅ **Crear:** Tabla `studio_crew_member_account` (panel personal)
- ✅ **Simplificar:** Personal sin categorías obligatorias

### Beneficios

| Beneficio             | Antes                    | Después                 |
| --------------------- | ------------------------ | ----------------------- |
| Flexibilidad de roles | 1 categoría              | N skills                |
| Reutilización         | ❌ "Foto" ≠ "Fotografia" | ✅ Una fuente de verdad |
| Panel personal        | ❌ No existe             | ✅ Login y dashboard    |
| Auditoría             | ❌ JSON array            | ✅ Relaciones tipadas   |
| Mantenimiento         | 🔴 3 tablas              | 🟢 2 tablas             |

---

## 🔍 Análisis del Problema

### Estado Actual (Antes)

```
Tablas existentes:
├─ studio_crew_categories (clasificación laboral)
├─ studio_crew_members (personal)
│  ├─ category_id (FK obligatorio)
│  ├─ additional_roles (JSON array sin validación)
│  └─ tipo (duplicado del de category.tipo)
├─ studio_crew_profiles (habilidades - SIN USAR)
└─ studio_crew_profile_assignments (M:N - SIN USAR)

Problemas identificados:
❌ Categorías no sirven para nómina (solo agrupación UI)
❌ Roles adicionales sin validación (errores de tipeo)
❌ No reutilizables entre personal
❌ Sin panel administrativo para crew
❌ Tablas redundantes sin propósito claro
```

### Caso de Uso Principal

```
Israel (crew member):
  - Rol principal: Fotografía
  - Habilidades secundarias: Edición, Color Grading, Drone

Necesidades:
  ✓ Puede asignarse como fotógrafo a eventos
  ✓ O como editor si el evento lo requiere
  ✓ Ve sus asignaciones y honorarios en panel personal
  ✓ Admin evita escribir mal "Fotografia" vs "Fotografía"
```

### Requisitos Técnicos

1. **Gestión flexible:** Múltiples skills por persona
2. **Validación:** Skills reutilizables (no duplicación)
3. **Escalabilidad:** Fácil agregar nuevas skills
4. **Seguridad:** Panel personal con autenticación
5. **Auditoría:** Histórico de cambios

---

## 🏗️ Arquitectura Propuesta

### Conceptos Clave

#### **Skills (Habilidades/Perfiles)**

- Definidas por studio
- Reutilizables entre múltiples crew members
- Ejemplos: "Fotografía", "Edición", "Drone", "Iluminación"
- Validadas: evita errores de tipeo
- Pueden tener UI metadata (color, icono)

#### **Crew Members (Personal)**

- Identificación básica (nombre, contacto)
- Tipo de personal (`OPERATIVO|ADMINISTRATIVO|PROVEEDOR`) - para nómina
- Status (activo/inactivo)
- Múltiples skills asociados
- Opcional: account para panel personal

#### **Crew Accounts (Acceso Personal)**

- 1:1 con crew member
- Email único para login
- Vinculado con Supabase auth
- Activable/desactivable por admin
- Permite dashboard personal

### Relaciones Conceptuales

```
studio
  ├─ studio_crew_skills (definidas por studio)
  │  ├─ nombre: "Fotografía"
  │  ├─ color, icono (UI)
  │  └─ M:N → studio_crew_member_skills
  │
  └─ studio_crew_members (personal)
     ├─ info básica
     ├─ tipo (para nómina)
     ├─ M:N → skills (flexible)
     ├─ cotizaciones (asignadas)
     ├─ nóminas (pagos)
     └─ account (1:1 opcional para login)
```

---

## 🗄️ Esquema de Base de Datos

### Tablas a Crear

#### 1. `studio_crew_skills`

```prisma
model studio_crew_skills {
  id        String @id @default(cuid())
  studio_id String
  name      String                // "Fotografía", "Edición", "Drone"
  color     String?               // Para UI (ej: #FF6B6B)
  icono     String?               // Para UI (ej: "camera")
  order     Int @default(0)       // Ordenamiento
  is_active Boolean @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  studio   studios @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  crew_members studio_crew_member_skills[]

  @@unique([studio_id, name])
  @@index([studio_id, is_active])
  @@index([order])
}
```

**Propósito:** Define habilidades/perfiles reutilizables por studio.

#### 2. `studio_crew_member_skills`

```prisma
model studio_crew_member_skills {
  id            String @id @default(cuid())
  crew_member_id String
  skill_id      String
  is_primary    Boolean @default(false) // Marca skill principal
  created_at    DateTime @default(now())

  crew_member studio_crew_members @relation(fields: [crew_member_id], references: [id], onDelete: Cascade)
  skill       studio_crew_skills @relation(fields: [skill_id], references: [id], onDelete: Cascade)

  @@unique([crew_member_id, skill_id])
  @@index([crew_member_id])
  @@index([skill_id])
}
```

**Propósito:** Relación M:N entre crew members y skills.

#### 3. `studio_crew_member_account`

```prisma
model studio_crew_member_account {
  id               String @id @default(cuid())
  crew_member_id   String @unique
  email            String  // Email para login (único)
  supabase_id      String? @unique  // Link a Supabase auth
  is_active        Boolean @default(false)  // Admin activa/desactiva
  last_login       DateTime?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  crew_member studio_crew_members @relation(fields: [crew_member_id], references: [id], onDelete: Cascade)

  @@unique([crew_member_id])
  @@index([supabase_id])
  @@index([is_active])
}
```

**Propósito:** Permite que crew members hagan login en su panel personal.

### Modificaciones a Tablas Existentes

#### `studio_crew_members` (SIMPLIFICADO)

```prisma
model studio_crew_members {
  id                  String   @id @default(cuid())
  studio_id           String
  name                String
  email               String?  // Email de contacto (NO login)
  phone               String?
  emergency_phone     String?
  tipo                PersonalType  // OPERATIVO|ADMINISTRATIVO|PROVEEDOR (para nómina)
  status              String @default("activo")
  fixed_salary        Float?
  variable_salary     Float?
  clabe_account       String?
  order               Int?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  studio              studios                      @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  skills              studio_crew_member_skills[]  // ← NUEVA
  account             studio_crew_member_account?  // ← NUEVA
  nominas             studio_nominas[]
  cotizacion_items    studio_cotizacion_items[]

  @@index([studio_id])
  @@index([status])
  @@index([tipo])
}
```

**Cambios:**

- ❌ Remover: `category_id` (FK)
- ❌ Remover: `additional_roles` (JSON)
- ❌ Remover: `platform_user_id` (reemplazar con account)
- ❌ Remover: `user_studio_role_id` (no aplica)
- ✅ Agregar: relación `skills` (M:N)
- ✅ Agregar: relación `account` (1:1)

### Tablas a Eliminar

```sql
DROP TABLE studio_crew_profiles;
DROP TABLE studio_crew_profile_assignments;
DROP TABLE studio_crew_categories;
```

---

## 👥 Flujos de Usuario

### 1. Crear Personal (Admin)

```
Admin → Click "Agregar Personal"
  ↓
Abre Sheet/Modal con formulario:
  ├─ Nombre* (required)
  ├─ Teléfono (optional)
  ├─ Correo (optional)
  ├─ Tipo* (dropdown: OPERATIVO|ADMINISTRATIVO|PROVEEDOR)
  ├─ Salario Fijo (optional)
  ├─ Salario Variable (optional)
  └─ Skills (typeahead multi-select)
      └─ Typing "/" → muestra skills disponibles
      └─ Si no existe → crear dinámicamente

Click "Guardar"
  ↓
Crear crew_member + asociar skills
  ↓
Mostrar en lista (actualizada)
```

### 2. Listar Personal (Admin)

```
Admin → Abre "Gestión de Personal"
  ↓
Muestra Sheet con lista:
  ├─ Búsqueda por nombre (ej: "Israel")
  ├─ Cada fila:
  │  ├─ Nombre
  │  ├─ Tags: Skills asociadas (badges de color)
  │  ├─ Tipo (OPERATIVO/ADMIN/PROVEEDOR)
  │  ├─ Status (Activo/Inactivo)
  │  └─ Acciones: Edit | Activar Panel | Delete
  └─ Ordenamiento alfabético

Click "Edit"
  ↓
Abre formulario pre-cargado (modificar)
  ↓
Click "Guardar" → Actualiza

Click "Activar Panel"
  ↓
Si no tiene account → Crear studio_crew_member_account
  ↓
Mostrar email de acceso
  ↓
Enviar invitación
```

### 3. Editar Personal (Admin)

```
Admin → Lista → Click Edit en un crew member
  ↓
Abre formulario con datos actuales
  ├─ Nombre
  ├─ Teléfono
  ├─ Correo
  ├─ Tipo
  ├─ Salarios
  └─ Skills (puede agregar/remover)

Modifica datos
  ↓
Click "Guardar" → Actualiza crew_member + skills
  ↓
Revalida datos en BD
```

### 4. Eliminar Personal (Admin)

```
Admin → Lista → Click Delete en un crew member
  ↓
Muestra confirmación:
  "¿Eliminar a Israel? Se eliminarán:"
    - Sus skills asociadas
    - Su account (si existe)
    - Sus cotizaciones (asignaciones se limpian)

Click "Confirmar"
  ↓
Soft delete o Hard delete (según política)
  ↓
Revalida lista
```

### 5. Panel Personal (Crew Member)

```
Israel login con email: israel.work@studio.com
  ↓
Accede a: /studio/[slug]/crew/dashboard
  ↓
Ve:
  ├─ "Mis Asignaciones" (cotizaciones/eventos)
  │  ├─ Evento | Rol Asignado | Status | Fecha
  │  └─ Click → ver detalles
  │
  ├─ "Mis Honorarios" (nóminas)
  │  ├─ Período | Monto | Status | Pago
  │  └─ Botón: Descargar recibo
  │
  ├─ "Mi Perfil"
  │  ├─ Nombre
  │  ├─ Correo
  │  ├─ Teléfono
  │  ├─ Skills
  │  └─ (admin puede editar desde gestor)
  │
  └─ "Mis Documentos" (facturas, recibos)
```

---

## 📅 Plan de Implementación

### FASE 1: Schema & DB (Día 1)

**Responsable:** Backend/Prisma  
**Duración:** ~2 horas

```
☐ 1.1 - Crear migración Prisma
  ├─ Crear studio_crew_skills
  ├─ Crear studio_crew_member_skills
  ├─ Crear studio_crew_member_account
  └─ Modificar studio_crew_members

☐ 1.2 - Ejecutar migrate
  └─ npx prisma migrate dev

☐ 1.3 - Generar types
  └─ npx prisma generate

Archivos:
  ├─ prisma/schema.prisma (actualizar)
  ├─ prisma/migrations/[timestamp]_crew_refactor (crear)
  └─ prisma/schema.prisma (validar)
```

### FASE 2: Server Actions (Día 2)

**Responsable:** Backend/Actions  
**Duración:** ~4 horas

```
☐ 2.1 - Crear crew (CRUD)
  ├─ crearCrewMember()
  ├─ actualizarCrewMember()
  ├─ eliminarCrewMember()
  └─ obtenerCrewMembers()

☐ 2.2 - Gestionar skills
  ├─ obtenerCrewSkills()
  ├─ crearCrewSkill()
  ├─ asignarSkillAlCrew()
  ├─ removerSkillDelCrew()
  └─ reordenarSkills()

☐ 2.3 - Crew accounts (panel)
  ├─ crearCrewAccount()
  ├─ activarCrewAccount()
  ├─ desactivarCrewAccount()
  ├─ cambiarEmailCrew()
  └─ obtenerCrewAccountStatus()

☐ 2.4 - Queries para panel crew
  ├─ obtenerMisAsignaciones()
  ├─ obtenerMisNominas()
  ├─ obtenerMiPerfil()
  └─ obtenerMisDocumentos()

Archivos:
  ├─ src/lib/actions/studio/crew/crew.actions.ts (nuevo)
  ├─ src/lib/actions/studio/crew/skills.actions.ts (nuevo)
  ├─ src/lib/actions/studio/crew/accounts.actions.ts (nuevo)
  ├─ src/lib/actions/schemas/crew-schemas.ts (nuevo - Zod)
  └─ src/lib/actions/studio/crew/index.ts (exporter)
```

### FASE 3: Componentes UI (Día 3-4)

**Responsable:** Frontend  
**Duración:** ~6 horas

```
☐ 3.1 - Refactorizar CrewMembersManager
  ├─ Remover agrupación por categoría
  ├─ Agregar búsqueda alfabética
  ├─ Mostrar skills como tags
  └─ Actualizar obtenerCrewMembers()

☐ 3.2 - Crear CrewMemberForm
  ├─ Inputs: nombre, teléfono, correo, tipo, salarios
  ├─ SkillsInput (typeahead con "/")
  ├─ Validación con Zod
  └─ Integrar server actions

☐ 3.3 - Crear SkillsInput component
  ├─ Typeahead dinámico
  ├─ Crear skill on-the-fly
  ├─ Multi-select
  └─ Tags visualization

☐ 3.4 - Crear CrewAccountManager (admin)
  ├─ Botón "Activar Panel"
  ├─ Modal: email, status
  ├─ Mostrar link de invitación
  └─ Desactivar acceso

Archivos:
  ├─ src/components/shared/crew-members/CrewMembersManager.tsx (refactor)
  ├─ src/components/shared/crew-members/CrewMemberForm.tsx (nuevo)
  ├─ src/components/shared/crew-members/SkillsInput.tsx (nuevo)
  ├─ src/components/shared/crew-members/CrewAccountManager.tsx (nuevo)
  └─ src/components/shared/crew-members/index.ts (exporter)
```

### FASE 4: Panel Crew (Día 5)

**Responsable:** Frontend  
**Duración:** ~4 horas

```
☐ 4.1 - Crear layout panel crew
  ├─ /studio/[slug]/crew/dashboard (página)
  ├─ Header + Navigation
  └─ Layout responsivo

☐ 4.2 - Componentes panel
  ├─ CrewDashboard (main page)
  ├─ CrewMisAsignaciones (tabla)
  ├─ CrewMisNominas (tabla + download)
  ├─ CrewMiPerfil (read-only)
  └─ CrewMisDocumentos (lista)

☐ 4.3 - Protección de rutas
  ├─ Middleware auth
  ├─ Verificar crew_member_account.is_active
  ├─ Redirigir si no autorizado
  └─ Logging de acceso

Archivos:
  ├─ src/app/[slug]/studio/crew/page.tsx (redirect)
  ├─ src/app/[slug]/studio/crew/dashboard/page.tsx
  ├─ src/app/[slug]/studio/crew/dashboard/components/ (sub-components)
  ├─ src/middleware.ts (actualizar)
  └─ src/lib/auth/crew-auth.ts (utils)
```

### FASE 5: Testing & Documentación (Día 6)

**Responsable:** QA + Docs  
**Duración:** ~3 horas

```
☐ 5.1 - Testing manual
  ├─ Crear crew → ver en lista
  ├─ Editar crew → actualiza
  ├─ Eliminar crew → limpia
  ├─ Crear skill → asignar a crew
  ├─ Activar panel → recibir invitación
  ├─ Login crew → ver asignaciones
  └─ Descargar recibos → funciona

☐ 5.2 - Testing edge cases
  ├─ Eliminar crew con account activa
  ├─ Cambiar email de crew
  ├─ Desactivar account → login no funciona
  ├─ Bulk delete skills
  └─ Cambiar tipo de personal

☐ 5.3 - Documentación
  ├─ Actualizar README
  ├─ Crear user guide para admin
  ├─ Crear user guide para crew
  └─ Documentar APIs

☐ 5.4 - Deployment
  ├─ Deploy a staging
  ├─ QA final
  └─ Deploy a producción
```

---

## 🔧 Consideraciones Técnicas

### Validación (Zod)

```typescript
// Crear crew member
const createCrewSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  tipo: z.enum(["OPERATIVO", "ADMINISTRATIVO", "PROVEEDOR"]),
  fixed_salary: z.number().positive().optional(),
  variable_salary: z.number().positive().optional(),
  skills: z.array(z.string()).min(1, "Al menos 1 skill requerido"),
});

// Activar account
const activateCrewAccountSchema = z.object({
  crew_member_id: z.string().cuid(),
  email: z.string().email("Email válido requerido"),
});
```

### Queries Ejemplo

```typescript
// Obtener crew con skills
const crew = await prisma.studio_crew_members.findMany({
  where: { studio_id: studioId, status: "activo" },
  include: {
    skills: {
      include: { skill: true },
      orderBy: { is_primary: "desc" },
    },
    account: {
      select: {
        id: true,
        is_active: true,
        email: true,
      },
    },
  },
  orderBy: { name: "asc" },
});

// Obtener skills de un crew
const skills = await prisma.studio_crew_member_skills.findMany({
  where: { crew_member_id: crewId },
  include: { skill: { select: { id: true, name: true, color: true } } },
  orderBy: { is_primary: "desc" },
});
```

### Autenticación Crew

```typescript
// Middleware: proteger rutas /crew/*
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Si es ruta crew, verificar autenticación
  if (req.nextUrl.pathname.includes("/crew/")) {
    const session = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Verificar crew_member_account
    const account = await prisma.studio_crew_member_account.findFirst({
      where: { supabase_id: session.user.id, is_active: true },
    });

    if (!account) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/studio/[slug]/crew/:path*"],
};
```

### Performance

```typescript
// Índices para queries frecuentes
@@index([studio_id, status])  // Listar crew activo
@@index([crew_member_id])     // Skills de un crew
@@index([is_active])          // Cuentas activas para login

// Queries optimizadas con include selectivo
include: {
  skills: { select: { skill: { select: { name: true, color: true } } } }
}

// Usar select() en lugar de include cuando sea posible
select: {
  id: true,
  name: true,
  email: true,
  skills: { select: { skill: { select: { name: true } } } }
}
```

### Seguridad

```typescript
// RLS en Supabase (futuro)
- crew_member_account solo ve su propia data
- Admin studio ve todo su studio
- No cross-studio access

// Validación de permisos
if (crew.studio_id !== studioId) {
  throw new Error("No autorizado");
}

// Audit logging
- Quién creó crew
- Quién activó panel
- Qué cambios en skills
- Cuándo hizo login
```

### Migración de Datos (si hay prod)

```sql
-- Backup
BACKUP TABLE studio_crew_members;

-- Copiar data antigua a nueva estructura
INSERT INTO studio_crew_skills (studio_id, name)
SELECT DISTINCT studio_id, UPPER(name)
FROM studio_crew_categories
WHERE is_active = true;

-- Asignar skills
INSERT INTO studio_crew_member_skills (crew_member_id, skill_id, is_primary)
SELECT
  cm.id,
  sk.id,
  true
FROM studio_crew_members cm
JOIN studio_crew_categories cc ON cm.category_id = cc.id
JOIN studio_crew_skills sk ON sk.name = UPPER(cc.name);

-- Limpiar campos antiguos
ALTER TABLE studio_crew_members DROP COLUMN category_id;
ALTER TABLE studio_crew_members DROP COLUMN additional_roles;

-- Eliminar tablas antiguas
DROP TABLE studio_crew_profile_assignments;
DROP TABLE studio_crew_profiles;
DROP TABLE studio_crew_categories;
```

---

## 📚 Referencias

- **Prisma Docs:** https://www.prisma.io/docs/
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **Zod Validation:** https://zod.dev/
- **Next.js Middleware:** https://nextjs.org/docs/advanced-features/middleware

---

## ✅ Checklist Pre-Implementación

- [ ] Revisar documento con equipo
- [ ] Validar cambios de schema no rompen otras funcionalidades
- [ ] Preparar backup de BD (si es prod)
- [ ] Crear rama: `251127-studio-crew`
- [ ] Asignar tareas a team members
- [ ] Definir deadlines por fase
- [ ] Configurar testing environment
- [ ] Preparar documentación de usuario final

---

---

## 🎯 PRÓXIMOS PASOS (CONTINUACIÓN)

### Para la próxima sesión (FASE 4 & 5):

1. **Verificar PR** en GitHub
   - Revisar cambios de Schema
   - Revisar Server Actions
   - Revisar Componentes UI
   - Merging a `main` si todo OK

2. **Empezar FASE 4: Panel Crew**
   - Crear layout: `/studio/[slug]/crew/dashboard`
   - Componentes:
     - `CrewDashboard.tsx` (main page)
     - `CrewMisAsignaciones.tsx` (tabla)
     - `CrewMisNominas.tsx` (tabla + download)
     - `CrewMiPerfil.tsx` (read-only)
     - `CrewMisDocumentos.tsx` (lista)
   - Middleware auth para rutas crew
   - Queries para asignaciones, nóminas, perfil

3. **Completar FASE 5: Testing**
   - Testing manual E2E
   - Edge cases
   - Documentación de usuario
   - Deploy staging

### Archivos de Referencia

Toda la documentación está en: `/docs/CREW_MANAGEMENT_SYSTEM.md`

Queries de ejemplo:
```sql
-- Ver mis asignaciones
SELECT * FROM studio_cotizacion_items WHERE assigned_to_crew_member_id = $crew_id;

-- Ver mis nóminas  
SELECT * FROM studio_nominas WHERE personal_id = $crew_id ORDER BY created_at DESC;

-- Ver mis skills
SELECT sk.name FROM studio_crew_member_skills skm
JOIN studio_crew_skills sk ON skm.skill_id = sk.id
WHERE skm.crew_member_id = $crew_id;
```

### Rama & Commits

- **Rama:** `251127-studio-crew`
- **Commits completados:**
  1. ✅ `refactor: FASE 1 - Schema Prisma`
  2. ✅ `feat: FASE 2 - Server Actions`
  3. ✅ `feat: FASE 3 - UI Components`
- **Próximo:** PR a `main` (después de testing)

---

**Documento creado:** 27-11-2025  
**Última actualización:** 27-11-2025  
**Estado:** 60% Completado (Fases 1-3) | 40% Pendiente (Fases 4-5)  
**Versión:** 1.0
