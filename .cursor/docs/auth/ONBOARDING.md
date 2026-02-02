# 🚀 Sistema de Onboarding y Estructura Multi-Usuario

**Guía definitiva del proceso de registro, creación de estudios y roles en ZEN Platform**

Última actualización: 2 de febrero de 2026

> **Nota:** Para autenticación (login/OAuth), ver: [AUTENTICACION_MASTER.md](AUTENTICACION_MASTER.md)

---

## 📋 Índice

1. [Onboarding - Creación del Primer Estudio](#onboarding-creación-del-primer-estudio)
2. [Setup Progresivo del Estudio](#setup-progresivo-del-estudio)
3. [Estructura Multi-Usuario](#estructura-multi-usuario)
4. [Roles y Permisos](#roles-y-permisos)
5. [Flujo Completo End-to-End](#flujo-completo-end-to-end)
6. [Referencias de Código](#referencias-de-código)

---

## 🚀 Onboarding - Creación del Primer Estudio

### Flujo General

```
Usuario hace login (email/password o Google OAuth)
         ↓
¿Tiene estudio en user_studio_roles?
         ↓ NO
Redirect a /setup-studio (onboarding)
         ↓
Usuario completa formulario inicial
         ↓
createStudioAndSubscription()
         ↓
Crea: studio + subscription + user_studio_role (OWNER)
         ↓
Redirect a /{slug}/studio (dashboard)
```

### Condición de Onboarding

**Ubicación:** `src/lib/actions/auth/oauth.actions.ts` → `procesarUsuarioOAuth()`

```typescript
// Después de crear/actualizar usuario en BD
const activeStudio = await prisma.user_studio_roles.findFirst({
  where: {
    user_id: userRecord.id,
    is_active: true,
    accepted_at: { not: null }, // Usuario aceptó invitación
  },
  include: {
    studio: {
      select: {
        slug: true,
        studio_name: true,
      }
    }
  }
})

if (!activeStudio) {
  // Usuario NO tiene estudio → necesita onboarding
  return {
    needsOnboarding: true,
    redirectTo: '/setup-studio'
  }
}

// Usuario tiene estudio → redirect a dashboard
return {
  needsOnboarding: false,
  redirectTo: `/${activeStudio.studio.slug}/studio`
}
```

---

## 📝 Setup del Estudio

### Ruta de Onboarding

**Ubicación:** `src/app/(onboarding)/setup-studio/page.tsx`

**Acceso:** Solo usuarios autenticados sin estudio activo

### Formulario Inicial

**Campos requeridos:**

```typescript
interface StudioSetupData {
  studio_name: string      // Nombre del estudio (ej: "Estudio ProFoto")
  studio_slug: string      // URL única (ej: "profoto" → zen.pro/profoto)
  studio_slogan?: string   // Slogan opcional
}
```

**Validaciones:**
- `studio_slug`: único en BD, lowercase, sin espacios
- `studio_name`: mínimo 3 caracteres
- Auto-generación de slug desde el nombre

### Server Action: createStudioAndSubscription

**Ubicación:** `src/lib/actions/auth/signup.actions.ts`

```typescript
export async function createStudioAndSubscription(
  userId: string,
  data: StudioSetupData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Buscar usuario en BD
  const dbUser = await prisma.users.findUnique({
    where: { supabase_id: user.id }
  })

  if (!dbUser) {
    return { success: false, error: 'Usuario no encontrado' }
  }

  // Verificar que el slug esté disponible
  const slugExists = await prisma.studios.findUnique({
    where: { slug: data.studio_slug }
  })

  if (slugExists) {
    return { success: false, error: 'El slug ya está en uso' }
  }

  // Transacción: Crear estudio + suscripción + rol
  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear estudio
    const studio = await tx.studios.create({
      data: {
        studio_name: data.studio_name,
        slug: data.studio_slug,
        studio_slogan: data.studio_slogan,
        is_active: true,
        created_at: new Date(),
      }
    })

    // 2. Crear suscripción (plan trial por defecto)
    const trialPlan = await tx.plans.findFirst({
      where: { name: 'Trial' }
    })

    if (!trialPlan) {
      throw new Error('Plan Trial no encontrado')
    }

    await tx.subscriptions.create({
      data: {
        studio_id: studio.id,
        plan_id: trialPlan.id,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días
      }
    })

    // 3. Crear rol de OWNER para el usuario
    await tx.user_studio_roles.create({
      data: {
        user_id: dbUser.id,
        studio_id: studio.id,
        role: 'OWNER',
        is_active: true,
        invited_at: new Date(),
        accepted_at: new Date(), // Auto-aceptado para el creador
      }
    })

    return studio
  })

  revalidatePath('/setup-studio')
  revalidatePath(`/${result.slug}/studio`)

  return {
    success: true,
    studio: {
      id: result.id,
      slug: result.slug,
      name: result.studio_name,
    }
  }
}
```

---

## ⚙️ Setup Progresivo del Estudio

Después de crear el estudio, el usuario completa la configuración en múltiples secciones.

### Secciones de Setup

**Ubicación:** `src/types/setup-validation.ts` → `SETUP_SECTIONS_CONFIG`

**Categorías:**

1. **Información Básica**
   - Identidad (nombre, logo, colores)
   - Contacto (teléfono, email, dirección)
   - Redes sociales

2. **Operación**
   - Horarios de atención
   - Métodos de pago
   - Cuentas bancarias

3. **Negocio**
   - Precios (paquetes, servicios)
   - Condiciones comerciales
   - Términos y condiciones

4. **Catálogo**
   - Servicios
   - Paquetes
   - Especialidades

### Validación de Completitud

**Servicio:** `src/lib/services/setup-validation.service.ts`

```typescript
export async function validateSetupSection(
  studioSlug: string,
  section: SetupSection
): Promise<ValidationResult> {
  const config = SETUP_SECTIONS_CONFIG[section]
  
  if (!config) {
    throw new Error(`Sección ${section} no existe`)
  }

  // Ejecutar validador específico de la sección
  const result = await config.validator(studioSlug)
  
  return {
    isComplete: result.isComplete,
    missingFields: result.missingFields,
    recommendations: result.recommendations,
  }
}

export async function getSetupProgress(
  studioSlug: string
): Promise<SetupProgress> {
  const sections = Object.keys(SETUP_SECTIONS_CONFIG)
  
  const results = await Promise.all(
    sections.map(section => 
      validateSetupSection(studioSlug, section as SetupSection)
    )
  )
  
  const completedCount = results.filter(r => r.isComplete).length
  const totalCount = sections.length
  
  return {
    percentage: Math.round((completedCount / totalCount) * 100),
    completed: completedCount,
    total: totalCount,
    sections: results,
  }
}
```

### Importante sobre Integraciones Google

⚠️ **La conexión de Google (Calendar/Drive) NO es parte del onboarding inicial.**

- Se conecta desde: `/{slug}/studio/config/integraciones`
- Es un paso opcional y separado
- Ver: [google-oauth-implementation.md](../google-oauth-implementation.md)

---

## 👥 Estructura Multi-Usuario

### Modelo de Datos

```
┌─────────────┐
│   users     │ ← Tabla global de usuarios (Supabase Auth)
│  (Prisma)   │
└─────────────┘
       │
       │ many-to-many
       ▼
┌─────────────────────┐
│ user_studio_roles   │ ← Control de acceso por estudio
│                     │
│ - user_id           │
│ - studio_id         │
│ - role (enum)       │
│ - is_active         │
│ - invited_at        │
│ - accepted_at       │
└─────────────────────┘
       │
       ▼
┌─────────────┐
│  studios    │ ← Tabla de estudios
│             │
│ - slug      │
│ - name      │
│ - is_active │
└─────────────┘
```

### Relaciones

**Un usuario puede:**
- ✅ Tener acceso a múltiples estudios (con diferentes roles)
- ✅ Ser OWNER de un estudio y MANAGER de otro
- ✅ Aceptar/rechazar invitaciones a estudios

**Un estudio puede:**
- ✅ Tener múltiples usuarios con diferentes roles
- ✅ Tener un solo OWNER (el creador)
- ✅ Tener múltiples ADMIN, MANAGER, etc.

### Tabla: user_studio_roles

```typescript
model user_studio_roles {
  id           String      @id @default(cuid())
  user_id      String
  studio_id    String
  role         StudioRole  // enum
  is_active    Boolean     @default(true)
  invited_at   DateTime?
  accepted_at  DateTime?   // null = pendiente de aceptar
  invited_by   String?     // user_id que invitó
  created_at   DateTime    @default(now())
  updated_at   DateTime    @updatedAt

  user   users   @relation(fields: [user_id], references: [id])
  studio studios @relation(fields: [studio_id], references: [id])

  @@unique([user_id, studio_id])
  @@index([studio_id])
  @@index([user_id, is_active])
}
```

---

## 🔐 Roles y Permisos

### Roles de Estudio (StudioRole)

**Enum:** `prisma/schema.prisma`

```prisma
enum StudioRole {
  OWNER        // Creador del estudio, acceso completo
  ADMIN        // Administrador, casi acceso completo
  MANAGER      // Gerente, gestiona operaciones
  PHOTOGRAPHER // Fotógrafo, acceso a eventos y clientes
  EDITOR       // Editor, acceso a archivos y edición
  ASSISTANT    // Asistente, acceso limitado
  PROVIDER     // Proveedor externo
  CLIENT       // Cliente (acceso solo a su información)
}
```

### Jerarquía de Roles

```
OWNER (100%)
  └─> ADMIN (90%)
      └─> MANAGER (70%)
          └─> PHOTOGRAPHER (50%)
              └─> EDITOR (40%)
                  └─> ASSISTANT (30%)
                      └─> PROVIDER (20%)
                          └─> CLIENT (10%)
```

### Permisos por Rol

**Tabla:** `studio_role_permissions`

```typescript
model studio_role_permissions {
  id            String     @id @default(cuid())
  studio_id     String
  role          StudioRole
  module_name   String     // 'manager', 'magic', 'marketing', etc.
  can_view      Boolean    @default(false)
  can_create    Boolean    @default(false)
  can_edit      Boolean    @default(false)
  can_delete    Boolean    @default(false)
  created_at    DateTime   @default(now())
  updated_at    DateTime   @updatedAt

  studio studios @relation(fields: [studio_id], references: [id])

  @@unique([studio_id, role, module_name])
}
```

**Ejemplo de permisos:**

```typescript
// OWNER: Acceso completo a todo
{ role: 'OWNER', module: 'manager', can_view: true, can_create: true, can_edit: true, can_delete: true }
{ role: 'OWNER', module: 'magic', can_view: true, can_create: true, can_edit: true, can_delete: true }

// PHOTOGRAPHER: Solo ver y crear en eventos
{ role: 'PHOTOGRAPHER', module: 'manager', can_view: true, can_create: true, can_edit: false, can_delete: false }
{ role: 'PHOTOGRAPHER', module: 'magic', can_view: false, can_create: false, can_edit: false, can_delete: false }
```

### Hook: useStudioAuth

**Ubicación:** `src/hooks/use-studio-auth.ts`

```typescript
export function useStudioAuth(studioSlug: string) {
  const [role, setRole] = useState<StudioRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRole() {
      const result = await getUserStudioRole(studioSlug)
      setRole(result.role)
      setLoading(false)
    }
    loadRole()
  }, [studioSlug])

  return {
    role,
    loading,
    isOwner: role === 'OWNER',
    isAdmin: role === 'ADMIN' || role === 'OWNER',
    canManage: ['OWNER', 'ADMIN', 'MANAGER'].includes(role ?? ''),
  }
}
```

---

## 🔄 Flujo Completo End-to-End

### Caso: Usuario Nuevo con Google OAuth

```
1. Usuario va a /login
         ↓
2. Click en "Continuar con Google"
         ↓
3. Redirect a Google OAuth consent screen
         ↓
4. Usuario autoriza
         ↓
5. Google redirect a /auth/callback?code=xxx
         ↓
6. Callback handler:
   - exchangeCodeForSession(code)
   - procesarUsuarioOAuth(user, session)
   - Crear/actualizar users
   - Buscar en user_studio_roles
         ↓
7. ¿Tiene estudio activo?
         ↓ NO
8. Redirect a /setup-studio
         ↓
9. Usuario completa formulario:
   - Nombre: "Estudio ProFoto"
   - Slug: "profoto"
   - Slogan: "Capturamos tus mejores momentos"
         ↓
10. Submit → createStudioAndSubscription()
         ↓
11. Transacción crea:
    - studio (profoto)
    - subscription (Trial - 14 días)
    - user_studio_role (OWNER)
         ↓
12. Redirect a /profoto/studio (dashboard)
         ↓
13. Usuario ve dashboard con setup progress al 15%
         ↓
14. Usuario completa secciones de setup progresivamente:
    - Identidad (logo, colores)
    - Contacto (teléfono, dirección)
    - Precios (paquetes)
    - etc.
         ↓
15. Opcionalmente: Conecta Google Drive/Calendar
    desde /profoto/studio/config/integraciones
         ↓
16. Setup completo al 100% → Estudio listo para operar
```

---

## 📚 Referencias de Código

### Onboarding

| Componente | Ubicación |
|-----------|-----------|
| Página de setup | `src/app/(onboarding)/setup-studio/page.tsx` |
| Crear estudio | `src/lib/actions/auth/signup.actions.ts` → `createStudioAndSubscription` |
| Procesar OAuth | `src/lib/actions/auth/oauth.actions.ts` → `procesarUsuarioOAuth` |

### Setup Progresivo

| Componente | Ubicación |
|-----------|-----------|
| Configuración de secciones | `src/types/setup-validation.ts` → `SETUP_SECTIONS_CONFIG` |
| Servicio de validación | `src/lib/services/setup-validation.service.ts` |
| Progress UI | (TODO: Implementar indicador de progreso en dashboard) |

### Roles y Permisos

| Componente | Ubicación |
|-----------|-----------|
| Schema Prisma | `prisma/schema.prisma` → `user_studio_roles`, `studio_role_permissions` |
| Hook de auth | `src/hooks/use-studio-auth.ts` |
| Obtener rol | `src/lib/actions/studio/roles.actions.ts` → `getUserStudioRole` |

---

## 🚧 Pendientes (Estado de Implementación)

### ✅ Implementado

- Creación de estudio en onboarding
- Asignación automática de rol OWNER
- Suscripción Trial de 14 días
- Configuración de secciones de setup
- Modelo de `user_studio_roles`
- Modelo de `studio_role_permissions`

### ⚠️ Parcial

- **Validación de permisos por ruta:** Middleware solo valida si tiene acceso al estudio, pero no valida permisos granulares por módulo
- **UI de progreso de setup:** No hay indicador visual del % de completitud en dashboard
- **Invitar usuarios:** Sistema diseñado pero UI no implementada

### 🔜 Pendiente

- **Sistema de invitaciones completo:** Enviar email, aceptar/rechazar
- **Crew members vinculados:** Tabla `studio_crew_members` con relación a `user_studio_roles`
- **Validación de permisos en UI:** Mostrar/ocultar botones según permisos del rol
- **Logs de auditoría:** Registrar cambios de roles y permisos

---

## 🔗 Documentos Relacionados

- [AUTENTICACION_MASTER.md](AUTENTICACION_MASTER.md) - Login y OAuth
- [google-oauth-implementation.md](../google-oauth-implementation.md) - Integraciones Calendar/Drive
- [PATRON_VALIDACION_USUARIO.md](../PATRON_VALIDACION_USUARIO.md) - Validar usuario en Server Actions

---

**Última revisión:** 2 de febrero de 2026  
**Autor:** Israel Wong  
**Estado:** ✅ Onboarding funcional - Setup progresivo en desarrollo
