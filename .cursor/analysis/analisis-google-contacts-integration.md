# Análisis Técnico: Integración Google Contacts (People API)

**Fecha:** 27 de diciembre de 2024  
**Objetivo:** Plan de implementación para sincronización bidireccional de contactos entre ZEN Platform y Google Contacts

---

## 📋 Resumen Ejecutivo

Este documento analiza la arquitectura necesaria para integrar Google Contacts (People API) en ZEN Platform, siguiendo el patrón OAuth directo ya establecido para Calendar y Drive. La integración sincronizará dos entidades principales a **nivel de estudio**:

1. **Contactos del Estudio** (`studio_contacts`) → Contactos en Google
2. **Personal (Staff)** (`user_studio_roles`) → Contactos en Google

**⚠️ IMPORTANTE:** La sincronización es a nivel de estudio, no a nivel de plataforma. Cada estudio sincroniza sus propios contactos independientemente.

---

## 1. Mapeo de la People API

### 1.1 Requerimientos de `google-api-nodejs-client`

**Biblioteca:** `googleapis` (ya instalada en el proyecto)

**Scope requerido:**

```
https://www.googleapis.com/auth/contacts
```

**Cliente People API:**

```typescript
import { google } from "googleapis";

const people = google.people({
  version: "v1",
  auth: oauth2Client,
});
```

### 1.2 Mapeo de Campos: Contactos del Estudio → Google Contacts

**Tabla origen:** `studio_contacts` (a nivel de estudio)

| Campo ZEN            | Campo Google Contacts     | Tipo   | Notas                                        |
| -------------------- | ------------------------- | ------ | -------------------------------------------- |
| `name`               | `names[0].displayName`    | String | Nombre completo del contacto                 |
| `email`              | `emailAddresses[0].value` | String | Email principal (tipo: `work`)               |
| `phone`              | `phoneNumbers[0].value`   | String | Teléfono (tipo: `work`)                      |
| `studio.studio_name` | `organizations[0].name`   | String | Nombre del estudio (contexto)                |
| `notes`              | `biographies[0].value`    | String | Notas del contacto                           |
| `status`             | `biographies[0].value`    | String | Estado (prospecto, cliente, etc.) - en notas |

**Estructura JSON propuesta:**

```typescript
{
  names: [{
    displayName: contact.name,
    givenName: contact.name.split(' ')[0],
    familyName: contact.name.split(' ').slice(1).join(' ') || ''
  }],
  emailAddresses: contact.email ? [{
    value: contact.email,
    type: 'work'
  }] : [],
  phoneNumbers: [{
    value: contact.phone,
    type: 'work'
  }],
  organizations: [{
    name: studio.studio_name,
    title: 'Cliente'
  }],
  biographies: [{
    value: `Contacto de ${studio.studio_name}\nEstado: ${contact.status}\n${contact.notes || ''}`
  }]
}
```

### 1.3 Mapeo de Campos: Staff → Google Contacts

**Tabla origen:** `user_studio_roles` + `users` + `studio_user_profiles`

| Campo ZEN                                    | Campo Google Contacts     | Tipo   | Notas                                         |
| -------------------------------------------- | ------------------------- | ------ | --------------------------------------------- |
| `user.full_name` o `user_profiles.full_name` | `names[0].displayName`    | String | Nombre completo                               |
| `user.email` o `user_profiles.email`         | `emailAddresses[0].value` | String | Email (tipo: `work`)                          |
| `user.phone` (si existe)                     | `phoneNumbers[0].value`   | String | Teléfono (tipo: `work`)                       |
| `role` (StudioRole)                          | `organizations[0].title`  | String | Puesto/Rol (OWNER, ADMIN, PHOTOGRAPHER, etc.) |
| `studio.name`                                | `organizations[0].name`   | String | Nombre del estudio                            |

**Estructura JSON propuesta:**

```typescript
{
  names: [{
    displayName: staff.full_name || staff.email,
    givenName: (staff.full_name || staff.email).split(' ')[0],
    familyName: (staff.full_name || staff.email).split(' ').slice(1).join(' ') || ''
  }],
  emailAddresses: [{
    value: staff.email,
    type: 'work'
  }],
  phoneNumbers: staff.phone ? [{
    value: staff.phone,
    type: 'work'
  }] : [],
  organizations: [{
    name: studio.name,
    title: mapStudioRoleToTitle(staff.role) // OWNER → "Propietario", etc.
  }],
  biographies: [{
    value: `Personal de ${studio.name} - Rol: ${staff.role}`
  }]
}
```

### 1.4 Etiqueta Automática "ZEN: [Nombre del Studio]"

**Estrategia:** Usar Contact Groups (Grupos de Contactos) de Google

**API Endpoint:**

```typescript
// Crear grupo
POST https://people.googleapis.com/v1/contactGroups
{
  contactGroup: {
    name: `ZEN: ${studioName}`
  }
}

// Asignar contacto a grupo
POST https://people.googleapis.com/v1/{resourceName}:modifyContactGroupMembers
{
  resourceNamesToAdd: ['contactos/...'],
  resourceNamesToRemove: []
}
```

**Lógica:**

1. Al conectar Contacts por primera vez, crear grupo `ZEN: [Studio Name]`
2. Guardar `groupResourceName` en `studios.google_integrations_config.contacts.groupResourceName`
3. Todos los contactos creados por ZEN se asignan a este grupo
4. Al desconectar, opcionalmente eliminar el grupo (o dejarlo sin contactos)

**⚠️ CRÍTICO - Sincronización Dinámica de Etiquetas:**

- **Trigger:** Al actualizar `studios.name` o `studios.slug` (cambio de nombre del estudio)
- **Acción:** Renombrar automáticamente el grupo de contactos en Google Contacts
- **Ubicación:** `src/lib/actions/studio/studios.actions.ts` → `actualizarStudio()`
- **Implementación:**
  ```typescript
  // Después de actualizar studio.name
  if (contactsConfig?.groupResourceName) {
    await renombrarGrupoContactosZEN(
      studioSlug,
      contactsConfig.groupResourceName,
      nuevoNombre
    );
    // Actualizar groupResourceName si cambió el nombre del grupo
  }
  ```

---

## 2. Extensión del Motor OAuth

### 2.1 Modificaciones en `oauth.actions.ts`

**Archivo:** `src/lib/actions/auth/oauth.actions.ts`

**Cambios propuestos:**

```typescript
// Añadir tipo de recurso 'contacts'
export type GoogleResourceType = "calendar" | "drive" | "contacts";

// Función genérica para iniciar OAuth (refactorizar)
export async function iniciarConexionGoogleRecurso(
  studioSlug: string,
  resourceType: GoogleResourceType,
  returnUrl?: string
): Promise<GoogleOAuthUrlResult> {
  const scopes = getScopesForResource(resourceType);
  const state = Buffer.from(
    JSON.stringify({
      studioSlug,
      returnUrl: returnUrl || null,
      resourceType,
    })
  ).toString("base64");

  // ... resto de lógica OAuth
}

function getScopesForResource(resourceType: GoogleResourceType): string[] {
  switch (resourceType) {
    case "calendar":
      return [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ];
    case "drive":
      return [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive",
      ];
    case "contacts":
      return ["https://www.googleapis.com/auth/contacts"];
    default:
      return [];
  }
}
```

**Alternativa (mantener separado):** Crear `oauth-contacts.actions.ts` siguiendo el patrón de `oauth-calendar.actions.ts`

### 2.2 Impacto en Callback Unificado

**Archivo:** `src/app/(auth)/auth/callback/route.ts`

**Cambios necesarios:**

```typescript
// Línea ~120: Añadir caso para 'contacts'
if (stateResourceType === "calendar" && studioSlugFromState) {
  // ... código existente
}

if (stateResourceType === "drive" && studioSlugFromState) {
  // ... código existente
}

// NUEVO: Añadir caso para contacts
if (stateResourceType === "contacts" && studioSlugFromState) {
  const result = await procesarCallbackGoogleContacts(code, state);

  if (!result.success) {
    const redirectPath = getSafeRedirectUrl(
      returnUrl,
      `/${studioSlugFromState}/studio/config/integraciones`,
      request
    );
    return NextResponse.redirect(
      new URL(
        `${redirectPath}?error=${encodeURIComponent(result.error || "Error al conectar")}`,
        request.url
      )
    );
  }

  const redirectPath = getSafeRedirectUrl(
    result.returnUrl || returnUrl,
    `/${result.studioSlug || studioSlugFromState}/studio/config/integraciones`,
    request
  );
  const redirectUrl = new URL(redirectPath, request.url);
  redirectUrl.searchParams.set("success", "google_contacts_connected");

  return NextResponse.redirect(redirectUrl);
}
```

### 2.3 Procesamiento de Tokens para Contacts

**Archivo:** `src/lib/actions/auth/oauth-contacts.actions.ts` (nuevo)

**Estructura propuesta:**

```typescript
export async function procesarCallbackGoogleContacts(
  code: string,
  state: string
): Promise<{
  success: boolean;
  studioSlug?: string;
  returnUrl?: string;
  error?: string;
}> {
  // Similar a procesarCallbackGoogleCalendar pero:
  // 1. Verificar scope de contacts
  // 2. Crear grupo de contactos "ZEN: [Studio Name]"
  // 3. Guardar groupResourceName en google_integrations_config.contacts.groupResourceName
  // 4. Actualizar google_integrations_config.contacts.enabled = true
}
```

---

## 3. Auditoría de Base de Datos

### 3.1 Cambios en Schema de Prisma

**Archivo:** `prisma/schema.prisma`

#### 3.1.1 Tabla `studio_contacts`

**Campo a añadir:**

```prisma
model studio_contacts {
  // ... campos existentes
  google_contact_id String? // ID del contacto en Google Contacts (resourceName)

  @@index([google_contact_id])
  @@index([studio_id, google_contact_id])
}
```

**Justificación:**

- Prevenir duplicados: Buscar por `google_contact_id` antes de crear
- Actualizaciones: Si existe `google_contact_id`, hacer UPDATE en lugar de CREATE
- Sincronización: Identificar contactos creados por ZEN
- **Nivel de estudio:** Cada estudio sincroniza sus propios contactos independientemente

#### 3.1.2 Tabla `user_studio_roles`

**Campo a añadir:**

```prisma
model user_studio_roles {
  // ... campos existentes
  google_contact_id String? // ID del contacto en Google Contacts (resourceName)

  @@index([google_contact_id])
  @@index([studio_id, google_contact_id])
}
```

**Nota:** `user_studio_roles` representa la relación usuario-estudio-rol. Un mismo usuario puede tener múltiples roles en diferentes estudios, por lo que cada `user_studio_roles` puede tener su propio contacto en Google.

#### 3.1.3 Tabla `studios`

**Campo a actualizar:**

```prisma
model studios {
  // ... campos existentes
  google_integrations_config Json? // Ya existe, solo actualizar estructura
}
```

**Estructura JSON propuesta:**

```typescript
{
  drive: { enabled: boolean },
  calendar: { enabled: boolean },
  contacts: {
    enabled: boolean,
    groupResourceName: string | null, // "contactGroups/{groupId}"
    lastSyncAt: string | null // ISO timestamp
  }
}
```

### 3.2 Índices Adicionales

**Optimización de búsquedas:**

```sql
-- Ya incluidos en los cambios de schema arriba
CREATE INDEX idx_studio_contacts_google_contact_id ON studio_contacts(google_contact_id);
CREATE INDEX idx_studio_contacts_studio_google_contact ON studio_contacts(studio_id, google_contact_id);
CREATE INDEX idx_user_studio_roles_google_contact_id ON user_studio_roles(google_contact_id);
CREATE INDEX idx_user_studio_roles_studio_google_contact ON user_studio_roles(studio_id, google_contact_id);
```

**Justificación:**

- Búsquedas rápidas por `google_contact_id` durante sincronización
- Filtrado por `studio_id` + `google_contact_id` para evitar conflictos entre estudios

### 3.3 Resumen Consolidado de Cambios en Base de Datos

**Cambios confirmados:**

1. **Tabla `studio_contacts` (a nivel de estudio):**
   - ✅ Añadir campo `google_contact_id String?`
   - ✅ Índices: `@@index([google_contact_id])` y `@@index([studio_id, google_contact_id])`
   - ✅ **Nivel:** Estudio (cada estudio sincroniza sus propios contactos)

2. **Tabla `user_studio_roles` (a nivel de estudio):**
   - ✅ Añadir campo `google_contact_id String?`
   - ✅ Índices: `@@index([google_contact_id])` y `@@index([studio_id, google_contact_id])`
   - ✅ **Nivel:** Estudio (cada estudio sincroniza su propio personal)

3. **Tabla `studios`:**
   - ✅ Campo `google_integrations_config Json?` ya existe
   - ✅ Estructura JSON extendida:
     ```typescript
     {
       drive: { enabled: boolean },
       calendar: { enabled: boolean },
       contacts: {
         enabled: boolean,
         groupResourceName: string | null, // "contactGroups/{groupId}" - CRÍTICO
         lastSyncAt: string | null // ISO timestamp
       }
     }
     ```
   - ✅ `groupResourceName` almacena el identificador del grupo de contactos para sincronización dinámica
   - ✅ **Nivel:** Estudio (cada estudio tiene su propio grupo "ZEN: [Studio Name]")

---

## 4. Definición de Triggers (Disparadores)

### 4.1 Flujo de Sincronización: Contactos del Estudio

**Momento de disparo:**

1. **Al crear un Contacto:**
   - **Trigger:** Después de `prisma.studio_contacts.create()`
   - **Ubicación:** `src/lib/actions/studio/contacts.actions.ts` → `crearContacto()`
   - **Acción:** Llamar a `sincronizarContactoConGoogle()` (Server Action)

2. **Al actualizar un Contacto:**
   - **Trigger:** Después de `prisma.studio_contacts.update()`
   - **Ubicación:** `src/lib/actions/studio/contacts.actions.ts` → `actualizarContacto()`
   - **Acción:** Si tiene `google_contact_id`, actualizar contacto en Google

3. **Al crear una Promesa asociada a un Contacto:**
   - **Trigger:** Opcional - cuando se crea `studio_promises` para un contacto existente
   - **Acción:** Actualizar contacto en Google con información de la promesa (en notas)

**Estrategia de sincronización:**

```typescript
// Server Action inmediata (no background job)
export async function sincronizarContactoConGoogle(
  contactId: string,
  studioSlug: string
): Promise<{ success: boolean; googleContactId?: string; error?: string }> {
  // 1. Verificar que Contacts está conectado
  // 2. Obtener contacto de DB (studio_contacts)

  // ⚠️ CRÍTICO - Validación de Datos (Filtro de Calidad)
  // 3. Validar: ¿Tiene name Y phone? (email es opcional en studio_contacts)
  if (!contact.name || !contact.phone) {
    return {
      success: false,
      error:
        "Contacto no tiene datos suficientes para sincronizar (requiere: name y phone)",
    };
  }

  // 4. Si tiene google_contact_id, UPDATE
  // 5. Si no tiene, CREATE
  // 6. Guardar google_contact_id en DB
  // 7. Asignar a grupo "ZEN: [Studio Name]" (INMEDIATAMENTE después de crear)
}
```

**⚠️ CRÍTICO - Validación de Datos (Filtro de Calidad):**

- **Regla:** No intentar sincronización si el contacto no tiene:
  - ✅ `name` (obligatorio en `studio_contacts`)
  - ✅ `phone` (obligatorio en `studio_contacts`)
  - ⚠️ `email` es opcional en `studio_contacts`, pero se incluirá si existe
- **Justificación:** Evitar crear contactos incompletos en Google Contacts
- **Implementación:** Validar ANTES de llamar a People API

**Consideraciones:**

- ✅ **Inmediata:** Mejor UX, contacto disponible al instante
- ⚠️ **Riesgo:** Si Google API falla, el lead se crea pero no se sincroniza
- ✅ **Solución:** Log de errores, reintento manual desde UI

### 4.2 Flujo de Sincronización: Staff

**Momento de disparo:**

1. **Al asignar rol de Staff:**
   - **Trigger:** Después de `prisma.user_studio_roles.create()` o `update()`
   - **Ubicación:** `src/lib/actions/studio/users.actions.ts` → `asignarRolUsuario()`
   - **Acción:** Llamar a `sincronizarStaffConGoogle()`

2. **Al actualizar información de usuario:**
   - **Trigger:** Después de `prisma.users.update()` o `studio_user_profiles.update()`
   - **Acción:** Si tiene `google_contact_id`, actualizar contacto

3. **Al activar/desactivar staff:**
   - **Trigger:** Cuando `is_active` cambia
   - **Acción:** Opcionalmente actualizar contacto (marcar como inactivo en notas)

**Estrategia de sincronización:**

```typescript
export async function sincronizarStaffConGoogle(
  userStudioRoleId: string,
  studioSlug: string
): Promise<{ success: boolean; googleContactId?: string; error?: string }> {
  // Similar a sincronizarLeadConGoogle pero para staff

  // ⚠️ CRÍTICO - Validación de Datos (Filtro de Calidad)
  // Validar: ¿Tiene (full_name O email) Y email?
  if (!staff.email || (!staff.full_name && !staff.email)) {
    return {
      success: false,
      error:
        "Staff no tiene datos suficientes para sincronizar (requiere: email y al menos full_name)",
    };
  }
}
```

**⚠️ CRÍTICO - Validación de Datos para Staff:**

- **Regla:** No intentar sincronización si el staff no tiene:
  - ✅ `email` (obligatorio)
  - ✅ `full_name` (preferido) o usar `email` como fallback para displayName
- **Justificación:** Email es crítico para identificar staff, nombre es preferido pero no bloqueante

### 4.3 Sincronización Dinámica de Etiquetas (Renombrado de Grupo)

**⚠️ CRÍTICO - Trigger de Renombrado:**

**Momento de disparo:**

- **Al actualizar nombre del estudio:** Después de `prisma.studios.update()` cuando cambia `name`
- **Ubicación:** `src/lib/actions/studio/studios.actions.ts` → `actualizarStudio()`

**Implementación:**

```typescript
export async function actualizarStudio(
  studioSlug: string,
  data: UpdateStudioData
): Promise<{ success: boolean }> {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: {
      name: true,
      google_integrations_config: true,
    },
  });

  // Actualizar estudio
  const updated = await prisma.studios.update({
    where: { slug: studioSlug },
    data: { ...data },
  });

  // ⚠️ CRÍTICO: Si cambió el nombre Y tiene Contacts conectado, renombrar grupo
  if (data.name && data.name !== studio?.name) {
    const contactsConfig = updated.google_integrations_config?.contacts;
    if (contactsConfig?.enabled && contactsConfig?.groupResourceName) {
      await renombrarGrupoContactosZEN(
        studioSlug,
        contactsConfig.groupResourceName,
        data.name
      );
    }
  }

  return { success: true };
}
```

**Justificación:**

- Mantener consistencia entre nombre del estudio en ZEN y grupo en Google Contacts
- Evitar confusión cuando el usuario cambia el nombre del estudio
- Automático, sin intervención manual

### 4.4 Sincronización en Segundo Plano (Futuro)

**Consideración para Fase 2:**

Si el volumen de contactos crece, considerar:

- Queue system (BullMQ, Bull)
- Background jobs (Next.js API routes + cron)
- Batch synchronization (sincronizar múltiples contactos en una llamada)

**Por ahora:** Server Actions inmediatas son suficientes.

---

## 5. Gestión de Desconexión

### 5.1 Lógica de Limpieza

**Opciones:**

#### Opción A: Eliminar contactos creados por ZEN (Recomendada)

**Ventajas:**

- Limpieza completa
- No deja "huérfanos" en Google Contacts
- Consistente con Calendar (elimina eventos)

**Desventajas:**

- Usuario pierde contactos si se desconecta accidentalmente
- Requiere identificar todos los contactos del grupo

**Implementación:**

```typescript
export async function desconectarGoogleContacts(
  studioSlug: string,
  limpiarContactos: boolean = true
): Promise<{
  success: boolean;
  contactosEliminados?: number;
  error?: string;
}> {
  if (limpiarContactos) {
    // 1. Obtener todos los contactos con google_contact_id del estudio
    // 2. Eliminar contactos de Google usando People API
    // 3. Limpiar google_contact_id en DB
    // 4. Opcionalmente eliminar grupo de contactos
  } else {
    // Solo desconectar: limpiar tokens y configuración
    // Los contactos quedan en Google pero no se sincronizan más
  }
}
```

#### Opción B: Solo dejar de sincronizar (No eliminar)

**Ventajas:**

- Usuario conserva contactos
- Menos riesgo de pérdida de datos

**Desventajas:**

- Contactos "huérfanos" en Google
- Inconsistente con Calendar/Drive

**Recomendación:** Opción A con modal de confirmación (similar a Calendar)

### 5.2 Modal de Desconexión

**Componente:** `GoogleContactsDisconnectModal.tsx` (nuevo)

**Funcionalidad:**

- Mostrar conteo de contactos sincronizados
- Opción: "Solo desconectar" vs "Eliminar contactos y desconectar"
- Confirmación antes de eliminar

---

## 6. Estructura Propuesta: `google-contacts.client.ts`

**Archivo:** `src/lib/integrations/google-contacts.client.ts`

### 6.1 Cliente Base

```typescript
"use server";

import { google } from "googleapis";
import { obtenerCredencialesGoogle } from "@/lib/actions/platform/integrations/google.actions";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/utils/encryption";

export async function getGoogleContactsClient(studioSlug: string) {
  // Similar a getGoogleCalendarClient y getGoogleDriveClient
  // 1. Obtener credenciales
  // 2. Obtener studio y refresh_token
  // 3. Verificar scope de contacts
  // 4. Desencriptar refresh_token
  // 5. Crear OAuth2 client
  // 6. Refrescar access token
  // 7. Crear cliente de People API
  // 8. Retornar { people, oauth2Client }
}
```

### 6.2 Funciones de Sincronización

```typescript
/**
 * Crea o actualiza un contacto en Google Contacts (UPSERT)
 */
export async function sincronizarContactoGoogle(
  studioSlug: string,
  contactData: {
    resourceName?: string; // Si existe, es UPDATE
    names: Array<{
      displayName: string;
      givenName?: string;
      familyName?: string;
    }>;
    emailAddresses: Array<{ value: string; type: string }>;
    phoneNumbers?: Array<{ value: string; type: string }>;
    organizations?: Array<{ name: string; title?: string }>;
    biographies?: Array<{ value: string }>;
  },
  groupResourceName?: string
): Promise<{ resourceName: string; etag: string }> {
  const { people } = await getGoogleContactsClient(studioSlug);

  if (contactData.resourceName) {
    // UPDATE
    const updated = await people.people.updateContact({
      resourceName: contactData.resourceName,
      updatePersonFields:
        "names,emailAddresses,phoneNumbers,organizations,biographies",
      requestBody: contactData,
    });
    return {
      resourceName: updated.data.resourceName!,
      etag: updated.data.etag!,
    };
  } else {
    // CREATE
    const created = await people.people.createContact({
      requestBody: contactData,
    });

    // ⚠️ CRÍTICO - Garantía de Visibilidad
    // Asignar a grupo INMEDIATAMENTE después de crear (mismo bloque try/catch)
    // Esto evita que Google archive el contacto en "Otros contactos"
    if (groupResourceName && created.data.resourceName) {
      try {
        await people.contactGroups.members.modify({
          resourceName: groupResourceName,
          requestBody: {
            resourceNamesToAdd: [created.data.resourceName],
          },
        });
      } catch (error) {
        // Si falla la asignación, loguear pero no fallar la creación
        console.error(
          "[sincronizarContactoGoogle] Error asignando a grupo:",
          error
        );
        // El contacto se creó pero no está en el grupo - puede requerir acción manual
      }
    }

    return {
      resourceName: created.data.resourceName!,
      etag: created.data.etag!,
    };
  }
}

/**
 * Elimina un contacto de Google Contacts
 */
export async function eliminarContactoGoogle(
  studioSlug: string,
  resourceName: string
): Promise<{ success: boolean }> {
  const { people } = await getGoogleContactsClient(studioSlug);

  await people.people.deleteContact({
    resourceName,
    deletePersonFields:
      "names,emailAddresses,phoneNumbers,organizations,biographies",
  });

  return { success: true };
}

/**
 * Crea un grupo de contactos "ZEN: [Studio Name]"
 */
export async function crearGrupoContactosZEN(
  studioSlug: string,
  studioName: string
): Promise<{ resourceName: string }> {
  const { people } = await getGoogleContactsClient(studioSlug);

  const group = await people.contactGroups.create({
    requestBody: {
      contactGroup: {
        name: `ZEN: ${studioName}`,
      },
    },
  });

  return { resourceName: group.data.resourceName! };
}

/**
 * Renombra un grupo de contactos existente
 * ⚠️ CRÍTICO: Usado cuando cambia el nombre del estudio
 */
export async function renombrarGrupoContactosZEN(
  studioSlug: string,
  groupResourceName: string,
  nuevoNombre: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { people } = await getGoogleContactsClient(studioSlug);

    await people.contactGroups.update({
      resourceName: groupResourceName,
      updateGroupFields: "name",
      requestBody: {
        contactGroup: {
          name: `ZEN: ${nuevoNombre}`,
        },
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("[renombrarGrupoContactosZEN] Error:", error);
    return {
      success: false,
      error: error?.message || "Error al renombrar grupo de contactos",
    };
  }
}
```

### 6.3 Server Actions de Sincronización

**Archivo:** `src/lib/actions/integrations/google-contacts.actions.ts` (nuevo)

```typescript
"use server";

/**
 * Sincroniza un Contacto del Estudio con Google Contacts
 */
export async function sincronizarContactoConGoogle(
  contactId: string,
  studioSlug: string
): Promise<{ success: boolean; googleContactId?: string; error?: string }> {
  // 1. Verificar conexión de Contacts
  // 2. Obtener contacto de DB (studio_contacts con studio)

  // ⚠️ CRÍTICO - Validación de Datos (Filtro de Calidad)
  // 3. Validar: ¿Tiene name Y phone? (email es opcional)
  if (!contact.name || !contact.phone) {
    return {
      success: false,
      error:
        "Contacto no tiene datos suficientes para sincronizar (requiere: name y phone)",
    };
  }

  // 4. Obtener grupo de contactos del estudio
  // 5. Mapear contacto a formato Google Contacts
  // 6. Llamar a sincronizarContactoGoogle() con groupResourceName
  //    (la asignación al grupo ocurre INMEDIATAMENTE después de crear)
  // 7. Guardar google_contact_id en studio_contacts
  // 8. Retornar resultado
}

/**
 * Sincroniza un Staff con Google Contacts
 */
export async function sincronizarStaffConGoogle(
  userStudioRoleId: string,
  studioSlug: string
): Promise<{ success: boolean; googleContactId?: string; error?: string }> {
  // Similar a sincronizarLeadConGoogle pero para staff
}
```

---

## 7. Flujo Paso a Paso de Sincronización

### 7.1 Flujo: Crear Contacto → Sincronizar Contacto

```
1. Usuario crea Contacto en ZEN (a nivel de estudio)
   ↓
2. Server Action: crearContacto()
   ↓
3. Prisma: studio_contacts.create()
   ↓
4. Server Action: sincronizarContactoConGoogle(contactId, studioSlug)
   ↓
5. Verificar: ¿Contacts conectado?
   ├─ NO → Retornar success (sin sincronizar)
   └─ SÍ → Continuar
   ↓
6. Obtener contacto de DB (studio_contacts)
   ↓
7. ⚠️ Validar: ¿Tiene name Y phone?
   ├─ NO → Retornar error (no sincronizar)
   └─ SÍ → Continuar
   ↓
8. Mapear contacto → Formato Google Contacts
   ↓
9. Obtener grupo "ZEN: [Studio Name]"
   ↓
10. People API: createContact()
   ↓
11. ⚠️ CRÍTICO: People API: Asignar a grupo (INMEDIATAMENTE, mismo bloque)
   ↓
12. Prisma: studio_contacts.update({ google_contact_id })
   ↓
13. Retornar success
```

### 7.2 Flujo: Actualizar Contacto → Actualizar Contacto

```
1. Usuario actualiza Contacto
   ↓
2. Server Action: actualizarContacto()
   ↓
3. Prisma: studio_contacts.update()
   ↓
4. ¿Tiene google_contact_id?
   ├─ NO → Llamar a sincronizarContactoConGoogle() (crear)
   └─ SÍ → Continuar
   ↓
5. Server Action: sincronizarContactoConGoogle(contactId, studioSlug)
   ↓
6. People API: updateContact(resourceName: google_contact_id)
   ↓
7. Retornar success
```

### 7.3 Flujo: Asignar Staff → Sincronizar Contacto

```
1. Usuario asigna rol de Staff
   ↓
2. Server Action: asignarRolUsuario()
   ↓
3. Prisma: user_studio_roles.create() o update()
   ↓
4. Server Action: sincronizarStaffConGoogle(userStudioRoleId, studioSlug)
   ↓
5. Verificar: ¿Contacts conectado?
   ├─ NO → Retornar success (sin sincronizar)
   └─ SÍ → Continuar
   ↓
6. Obtener user_studio_roles + users + studio_user_profiles
   ↓
7. Mapear staff → Formato Google Contacts
   ↓
8. Obtener grupo "ZEN: [Studio Name]"
   ↓
9. People API: createContact() o updateContact()
   ↓
10. ⚠️ CRÍTICO: People API: Asignar a grupo (INMEDIATAMENTE, mismo bloque)
   ↓
11. Prisma: user_studio_roles.update({ google_contact_id })
   ↓
12. Retornar success
```

---

## 8. Identificación de Riesgos Técnicos

### 8.1 Riesgos Identificados

#### 🔴 Alto Riesgo

1. **Duplicados en Google Contacts**
   - **Causa:** Múltiples sincronizaciones del mismo contacto/staff
   - **Mitigación:** Verificar `google_contact_id` antes de crear
   - **Solución:** UPSERT pattern (update si existe, create si no)
   - **Nota:** Cada estudio sincroniza independientemente, no hay conflictos entre estudios

2. **Límites de Rate de People API**
   - **Causa:** Google limita requests por minuto
   - **Límite:** ~1000 requests/minuto por usuario
   - **Mitigación:** Implementar retry con exponential backoff
   - **Solución futura:** Batch synchronization

3. **Contactos eliminados manualmente en Google**
   - **Causa:** Usuario elimina contacto en Google, ZEN intenta actualizar
   - **Mitigación:** Manejar error 404, recrear contacto
   - **Solución:** Similar a Calendar (recrear si no existe)

#### 🟡 Medio Riesgo

4. **Grupo de contactos eliminado manualmente**
   - **Causa:** Usuario elimina grupo "ZEN: [Studio Name]" en Google
   - **Mitigación:** Verificar existencia del grupo antes de asignar
   - **Solución:** Recrear grupo si no existe

5. **Sincronización fallida silenciosa**
   - **Causa:** Error en People API no se propaga correctamente
   - **Mitigación:** Logging detallado, notificaciones de error
   - **Solución:** UI para reintentar sincronización manual

6. **Conflictos de email duplicado**
   - **Causa:** Múltiples contactos con mismo email dentro del mismo estudio
   - **Mitigación:** Google Contacts permite múltiples contactos con mismo email
   - **Solución:** Usar `google_contact_id` como fuente de verdad
   - **Nota:** `studio_contacts` tiene `@@unique([studio_id, phone])`, no email, por lo que puede haber duplicados de email

#### 🟢 Bajo Riesgo

7. **Timezone en fechas de sincronización**
   - **Causa:** Timestamps pueden variar por timezone
   - **Mitigación:** Usar UTC en todas las operaciones
   - **Solución:** Ya manejado en Calendar sync

8. **Caracteres especiales en nombres**
   - **Causa:** Nombres con emojis o caracteres especiales
   - **Mitigación:** People API maneja UTF-8 correctamente
   - **Solución:** Validar en frontend antes de sincronizar

### 8.2 Estrategias de Manejo de Errores

```typescript
// Patrón de retry con exponential backoff
async function sincronizarConRetry(
  fn: () => Promise<any>,
  maxRetries = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error?.code === 429) {
        // Rate limit, esperar
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
      if (error?.code === 404 && i === 0) {
        // Recrear contacto si fue eliminado
        return await recrearContacto();
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
```

---

## 9. Plan de Implementación

### Fase 1: Infraestructura Base (Día 1-2)

- [ ] Crear migración Prisma: añadir `google_contact_id` a `studio_contacts` y `user_studio_roles`
- [ ] Crear `google-contacts.client.ts` con funciones base
  - [ ] `getGoogleContactsClient()` - Cliente base
  - [ ] `sincronizarContactoGoogle()` - UPSERT con asignación inmediata a grupo
  - [ ] `crearGrupoContactosZEN()` - Crear grupo
  - [ ] `renombrarGrupoContactosZEN()` - ⚠️ CRÍTICO: Renombrar grupo dinámicamente
  - [ ] `eliminarContactoGoogle()` - Eliminar contacto
- [ ] Crear `oauth-contacts.actions.ts` siguiendo patrón de Calendar
- [ ] Extender callback unificado para manejar `resourceType: 'contacts'`
- [ ] Actualizar `google_integrations_config` en schema (confirmar estructura con `groupResourceName`)
- [ ] ⚠️ CRÍTICO: Implementar validación de datos en Server Actions (name + email/phone)
- [ ] ⚠️ CRÍTICO: Integrar trigger de renombrado en `actualizarStudio()`

### Fase 2: Sincronización Contactos del Estudio (Día 3-4)

- [ ] Crear `sincronizarContactoConGoogle()` Server Action
  - [ ] ⚠️ CRÍTICO: Implementar validación de datos (name + phone, email opcional)
  - [ ] ⚠️ CRÍTICO: Garantizar asignación inmediata a grupo después de crear
- [ ] Integrar en `crearContacto()` y `actualizarContacto()` (a nivel de estudio)
- [ ] Implementar lógica de creación de grupo de contactos (en callback OAuth)
- [ ] Testing: Crear contacto → Verificar contacto en Google (debe estar en grupo, no en "Otros contactos")
- [ ] Testing: Crear contacto sin phone → Verificar que NO se sincroniza

### Fase 3: Sincronización Staff (Día 5-6)

- [ ] Crear `sincronizarStaffConGoogle()` Server Action
  - [ ] ⚠️ CRÍTICO: Implementar validación de datos (email + full_name)
  - [ ] ⚠️ CRÍTICO: Garantizar asignación inmediata a grupo después de crear
- [ ] Integrar en `asignarRolUsuario()` y actualizaciones de usuario
- [ ] Testing: Asignar staff → Verificar contacto en Google (debe estar en grupo)
- [ ] Testing: Asignar staff sin email → Verificar que NO se sincroniza

### Fase 4: UI y Desconexión (Día 7-8)

- [ ] Crear `GoogleContactsIntegrationCard.tsx`
- [ ] Crear `GoogleContactsDisconnectModal.tsx`
- [ ] Implementar `desconectarGoogleContacts()` con opción de limpieza
- [ ] Testing: Desconectar → Verificar limpieza de contactos

### Fase 5: Testing y Refinamiento (Día 9-10)

- [ ] Testing end-to-end: Flujos completos
- [ ] Manejo de errores: Rate limits, 404s, etc.
- [ ] Documentación: Actualizar `google-oauth-implementation.md`
- [ ] Code review y ajustes finales

---

## 10. Consideraciones Adicionales

### 10.1 Privacidad y Permisos

- **Scope mínimo:** `https://www.googleapis.com/auth/contacts` (solo lectura/escritura de contactos)
- **No requiere:** `contacts.readonly` (insuficiente para crear/actualizar)
- **Consentimiento:** Usuario debe autorizar explícitamente

### 10.2 Performance

- **Sincronización inmediata:** Aceptable para < 100 contactos/día
- **Futuro:** Considerar batch sync si volumen crece
- **Caching:** No necesario (People API es rápido)

### 10.3 Compatibilidad

- **Google Workspace:** ✅ Compatible
- **Cuentas personales:** ✅ Compatible
- **Múltiples estudios:** ✅ Cada estudio tiene su grupo de contactos

---

## 11. Referencias

- [Google People API Documentation](https://developers.google.com/people/api/rest)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [OAuth 2.0 Scopes for People API](https://developers.google.com/people/api/rest/v1/people/get#authorization-scopes)
- Documentación interna: `.cursor/docs/google-oauth-implementation.md`

---

---

## 12. Refinamientos Críticos Implementados

### 12.1 Sincronización Dinámica de Etiquetas ✅

- **Trigger:** Actualización de `studios.name`
- **Acción:** Renombrar automáticamente grupo de contactos en Google Contacts
- **Ubicación:** `actualizarStudio()` → `renombrarGrupoContactosZEN()`
- **Estado:** ✅ Documentado y listo para implementación

### 12.2 Validación de Datos (Filtro de Calidad) ✅

- **Leads:** Requiere `name` + (`email` O `phone`)
- **Staff:** Requiere `email` + `full_name` (preferido)
- **Implementación:** Validación ANTES de llamar a People API
- **Estado:** ✅ Documentado y listo para implementación

### 12.3 Garantía de Visibilidad ✅

- **Problema:** Contactos creados sin grupo se archivan en "Otros contactos"
- **Solución:** Asignar a grupo INMEDIATAMENTE después de `createContact()` (mismo bloque try/catch)
- **Implementación:** En `sincronizarContactoGoogle()` dentro del bloque CREATE
- **Estado:** ✅ Documentado y listo para implementación

### 12.4 Consolidación de Impacto en DB ✅

**Cambios confirmados:**

- ✅ `platform_leads.google_contact_id` + índices
- ✅ `user_studio_roles.google_contact_id` + índices
- ✅ `studios.google_integrations_config.contacts.groupResourceName` (CRÍTICO para renombrado dinámico)
- **Estado:** ✅ Documentado en sección 3.3

---

**Última actualización:** 27 de diciembre de 2024  
**Estado:** ✅ Análisis completo con refinamientos críticos, listo para implementación Fase 1
