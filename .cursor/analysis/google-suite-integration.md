# Documentación Técnica: Integración Google Suite (ZEN Platform)

**Fecha de creación:** 27 de diciembre de 2024  
**Última actualización:** 28 de diciembre de 2024  
**Estado:** ✅ Implementado y en producción

---

## 📋 Resumen Ejecutivo

ZEN Platform integra tres servicios principales de Google Suite a nivel de estudio:

1. **Google Drive** - Gestión de carpetas y entregables de eventos
2. **Google Calendar** - Sincronización de eventos principales y tareas operativas
3. **Google Contacts** - Sincronización de contactos del estudio y personal (staff)

**Arquitectura clave:**
- ✅ **OAuth Directo** - Independiente de Supabase Auth (cada estudio conecta su propia cuenta)
- ✅ **Sistema Unificado** - Conexión simultánea de múltiples servicios en un solo flujo
- ✅ **Autorización Incremental** - Los scopes se combinan sin sobrescribir
- ✅ **Tokens Encriptados** - Refresh tokens almacenados de forma segura
- ✅ **Nivel de Estudio** - Cada estudio sincroniza sus propios datos independientemente

---

## 🏗️ Arquitectura del Sistema

### Estructura de Directorios

```
src/lib/integrations/google/
├── auth/                          # OAuth y autenticación
│   ├── unified.actions.ts         # Sistema unificado (Drive + Calendar + Contacts)
│   ├── calendar.actions.ts        # OAuth Calendar (individual)
│   ├── contacts.actions.ts        # OAuth Contacts (individual)
│   ├── drive.actions.ts           # OAuth Drive (individual)
│   └── disconnect/                # Desconexión por servicio
│       ├── calendar.actions.ts
│       └── contacts.actions.ts
│
├── clients/                        # Clientes de API
│   ├── contacts.client.ts          # People API client
│   ├── drive.client.ts             # Drive API client
│   └── calendar/                   # Calendar API clients
│       ├── client.ts
│       ├── calendar-manager.ts
│       ├── sync-manager.ts
│       └── helpers.ts
│
├── sync/                          # Sincronización de datos
│   └── contacts.actions.ts        # Sincronización contactos/staff
│
├── studio/                        # Operaciones a nivel studio
│   ├── status.actions.ts          # Estado de conexión (genérico)
│   └── drive.actions.ts           # Operaciones Drive
│
└── index.ts                        # Barrel export
```

### Flujo OAuth Unificado

El sistema permite conectar múltiples servicios de Google en un solo flujo:

```typescript
// Ejemplo: Conectar Drive + Calendar + Contacts simultáneamente
const url = await obtenerUrlConexionUnificada(
  studioSlug,
  ['drive', 'calendar', 'contacts'],
  returnUrl,
  'personel' // Contexto opcional
);
```

**Ventajas:**
- ✅ Usuario autoriza una sola vez
- ✅ Todos los servicios se configuran automáticamente
- ✅ Mejor UX (menos pasos)

**Componentes principales:**
- `obtenerUrlConexionUnificada()` - Genera URL OAuth con scopes combinados
- `procesarCallbackUnificado()` - Procesa callback y configura todos los recursos
- `obtenerEstadoConexion()` - Verifica estado de cada servicio independientemente

---

## 🔐 Google Drive

### Funcionalidad

- **Carpetas de Eventos**: Vincular carpetas de Drive a eventos para gestionar entregables
- **Permisos Públicos**: Establecer permisos recursivos para acceso desde portal cliente
- **Gestión de Entregables**: Asociar archivos de Drive con `studio_event_deliverables`

### Scopes Requeridos

```typescript
[
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file'
]
```

### Implementación Técnica

**Cliente:** `src/lib/integrations/google/clients/drive.client.ts`

**Funciones principales:**
- `getGoogleDriveClient(studioSlug)` - Obtiene cliente autenticado
- `listFolders()` - Lista carpetas del usuario
- `obtenerOCrearCarpetaDrive()` - Crea carpeta "ZEN Drive: [Studio Name]"

**Schema:**
```prisma
model studio_event_deliverables {
  google_folder_id String?  // ID de carpeta en Drive
  delivery_mode    String?  // 'native' | 'google_drive'
}
```

**Notas técnicas:**
- ✅ Auto-refresh de tokens (manejo de 401)
- ✅ Encriptación de refresh tokens
- ✅ Validación de permisos antes de vincular carpetas

---

## 📅 Google Calendar

### Funcionalidad

- **Calendario Primario**: Sincronización de eventos principales (`studio_events`)
- **Calendario Secundario**: Tareas operativas del scheduler (`studio_scheduler_event_tasks`)
- **Sincronización Bidireccional**: Eventos creados en ZEN se crean en Google y viceversa

### Scopes Requeridos

```typescript
[
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
]
```

### Implementación Técnica

**Cliente:** `src/lib/integrations/google/clients/calendar/`

**Estructura:**
- `client.ts` - Cliente base de Calendar API
- `calendar-manager.ts` - Gestión de calendarios (crear, obtener, eliminar)
- `sync-manager.ts` - Sincronización de eventos
- `helpers.ts` - Funciones auxiliares

**Schema:**
```prisma
model studios {
  google_calendar_secondary_id String?  // ID del calendario "Tareas De ZEN"
}

model studio_agenda {
  google_event_id String?  // ID del evento en Google Calendar
}

model studio_scheduler_event_tasks {
  google_event_id String?  // ID del evento en calendario secundario
  google_calendar_id String?  // ID del calendario donde está el evento
}
```

**Notas técnicas:**
- ✅ Calendario secundario se crea automáticamente al conectar
- ✅ Sincronización en background (no bloqueante)
- ✅ Manejo de timezones y duplicados
- ✅ Desconexión limpia (elimina eventos o los deja según opción del usuario)

---

## 👥 Google Contacts

### Funcionalidad

- **Contactos del Estudio**: Sincronización de `studio_contacts` → Google Contacts
- **Personal (Staff)**: Sincronización de `user_studio_roles` → Google Contacts
- **Grupos Automáticos**: Todos los contactos se agrupan en "ZEN: [Studio Name]"
- **Sincronización Dinámica**: El grupo se renombra automáticamente si cambia el nombre del estudio

### Scopes Requeridos

```typescript
[
  'https://www.googleapis.com/auth/contacts'
]
```

### Implementación Técnica

**Cliente:** `src/lib/integrations/google/clients/contacts.client.ts`

**Funciones principales:**
- `getGoogleContactsClient(studioSlug)` - Obtiene cliente autenticado
- `crearGrupoContactosZEN()` - Crea grupo "ZEN: [Studio Name]"
- `sincronizarContactoGoogle()` - UPSERT de contactos (con asignación inmediata a grupo)
- `renombrarGrupoContactosZEN()` - Renombra grupo cuando cambia nombre del estudio
- `eliminarContactoGoogle()` - Elimina contacto de Google

**Schema:**
```prisma
model studio_contacts {
  google_contact_id String?  // resourceName de Google Contacts
  
  @@index([google_contact_id])
  @@index([studio_id, google_contact_id])
}

model user_studio_roles {
  google_contact_id String?  // resourceName de Google Contacts
  
  @@index([google_contact_id])
  @@index([studio_id, google_contact_id])
}

model studios {
  google_integrations_config Json?  // {
  //   contacts: {
  //     enabled: boolean,
  //     groupResourceName: string | null,  // "contactGroups/{groupId}"
  //     lastSyncAt: string | null
  //   }
  // }
}
```

**Mapeo de Campos:**

**Contactos del Estudio (`studio_contacts`):**
| Campo ZEN | Campo Google Contacts | Tipo | Notas |
|-----------|---------------------|------|-------|
| `name` | `names[0].displayName` | String | Nombre completo |
| `email` | `emailAddresses[0].value` | String | Email (tipo: `work`) |
| `phone` | `phoneNumbers[0].value` | String | Teléfono (tipo: `work`) |
| `notes` | `biographies[0].value` | String | Notas del contacto |
| `studio.studio_name` | `organizations[0].name` | String | Nombre del estudio |

**Personal (`user_studio_roles`):**
| Campo ZEN | Campo Google Contacts | Tipo | Notas |
|-----------|---------------------|------|-------|
| `user.full_name` | `names[0].displayName` | String | Nombre completo |
| `user.email` | `emailAddresses[0].value` | String | Email (tipo: `work`) |
| `role` | `organizations[0].title` | String | Rol (OWNER, ADMIN, etc.) |
| `studio.name` | `organizations[0].name` | String | Nombre del estudio |

**Validación de Datos (Filtro de Calidad):**
- ✅ **Contactos**: Requiere `name` + `phone` (email opcional)
- ✅ **Staff**: Requiere `email` + `full_name` (preferido)
- ⚠️ No se sincroniza si no cumple los requisitos mínimos

**Garantía de Visibilidad:**
- ✅ Los contactos se asignan al grupo **INMEDIATAMENTE** después de crear
- ✅ Esto evita que Google archive el contacto en "Otros contactos"
- ✅ Implementado en el mismo bloque try/catch que la creación

**Sincronización Dinámica de Etiquetas:**
- ✅ Trigger automático cuando cambia `studios.name`
- ✅ Renombra el grupo "ZEN: [Studio Name]" en Google Contacts
- ✅ Implementado en `actualizarStudio()`, `actualizarIdentidadBasica()`, `actualizarIdentidadCompleta()`

**Notas técnicas:**
- ✅ Manejo de grupos existentes (409 Conflict) - busca grupo por nombre
- ✅ Validación de People API habilitada (403) - muestra mensaje con URL de activación
- ✅ Auto-refresh de tokens (manejo de 401)
- ✅ Encriptación de refresh tokens

---

## 🔄 Flujo de Sincronización

### Contactos del Estudio

**Trigger:** Creación o actualización de `studio_contacts`

```typescript
// En crearContacto() o actualizarContacto()
await sincronizarContactoConGoogle(contactId, studioSlug);
```

**Proceso:**
1. Verificar que Contacts está conectado
2. Obtener contacto de DB
3. **Validar datos** (name + phone requeridos)
4. Mapear a formato Google Contacts
5. UPSERT en Google (create o update según `google_contact_id`)
6. **Asignar a grupo inmediatamente** (si es creación)
7. Guardar `google_contact_id` en DB

### Personal (Staff)

**Trigger:** Asignación o actualización de `user_studio_roles`

```typescript
// En asignarRolUsuario() o actualizarUsuario()
await sincronizarStaffConGoogle(userStudioRoleId, studioSlug);
```

**Proceso:**
1. Verificar que Contacts está conectado
2. Obtener staff de DB (con `users` y `studio_user_profiles`)
3. **Validar datos** (email + full_name requeridos)
4. Mapear a formato Google Contacts
5. UPSERT en Google
6. **Asignar a grupo inmediatamente** (si es creación)
7. Guardar `google_contact_id` en DB

---

## 🗄️ Base de Datos

### Tabla `studios`

```prisma
model studios {
  // OAuth Tokens (encriptados)
  google_oauth_refresh_token String?  // Refresh token encriptado
  google_oauth_email          String?  // Email de la cuenta Google
  google_oauth_scopes         String?  // JSON array de scopes
  is_google_connected         Boolean? // Estado general (legacy)
  
  // Configuración de integraciones
  google_integrations_config  Json?    // {
  //   drive: { enabled: boolean },
  //   calendar: { enabled: boolean, ... },
  //   contacts: { enabled: boolean, groupResourceName: string | null, lastSyncAt: string | null }
  // }
  
  // IDs de recursos creados
  google_calendar_secondary_id String?  // ID del calendario "Tareas De ZEN"
}
```

### Tabla `studio_contacts`

```prisma
model studio_contacts {
  google_contact_id String?  // resourceName de Google Contacts
  
  @@index([google_contact_id])
  @@index([studio_id, google_contact_id])
}
```

### Tabla `user_studio_roles`

```prisma
model user_studio_roles {
  google_contact_id String?  // resourceName de Google Contacts
  
  @@index([google_contact_id])
  @@index([studio_id, google_contact_id])
}
```

### Tabla `studio_event_deliverables`

```prisma
model studio_event_deliverables {
  google_folder_id String?  // ID de carpeta en Drive
  delivery_mode    String?  // 'native' | 'google_drive'
}
```

---

## 🔐 Seguridad y Tokens

### Encriptación

- ✅ **Refresh tokens** se encriptan antes de guardar en DB
- ✅ Usa `encryptToken()` / `decryptToken()` de `@/lib/utils/encryption`
- ✅ Algoritmo: AES-256-GCM

### Auto-Refresh

- ✅ Los clientes detectan errores 401 (Unauthorized)
- ✅ Automáticamente refrescan el `access_token` usando `refresh_token`
- ✅ Transparente para el código que usa los clientes

### Autorización Incremental

- ✅ Los scopes se combinan sin sobrescribir
- ✅ Si ya tienes Drive conectado y conectas Calendar, ambos scopes se mantienen
- ✅ Implementado en `procesarCallbackUnificado()`

---

## 🧹 Desconexión

### Independencia por Servicio

- ✅ Cada servicio se puede desconectar independientemente
- ✅ Desconectar Calendar NO afecta Drive o Contacts
- ✅ Solo se eliminan los scopes y datos del servicio desconectado

### Opciones de Limpieza

**Google Calendar:**
- Opción 1: Eliminar eventos de Google (limpia `google_event_id` en DB)
- Opción 2: Solo desconectar (mantiene eventos en Google)

**Google Contacts:**
- Opción 1: Eliminar contactos de Google (limpia `google_contact_id` en DB)
- Opción 2: Solo desconectar (mantiene contactos en Google)

**Google Drive:**
- Solo desconectar (mantiene carpetas y permisos públicos)

---

## 🎨 Componentes UI

### Componentes Globales

**`GoogleStatusPopover.tsx`**
- Muestra estado de los 3 servicios (Drive, Calendar, Contacts)
- Ubicado en `AppHeader.tsx` (icono de Google junto a notificaciones)
- Botones contextuales según estado de conexión

**`GoogleBundleModal.tsx`**
- Modal para conectar múltiples servicios simultáneamente
- Checkboxes para Drive, Calendar, Contacts
- Soporta contexto (ej: 'personel' pre-selecciona Contacts)

**`GoogleIntegrationCard.tsx`**
- Card unificado en página de integraciones
- Muestra estado de cada servicio
- Botones de conexión/gestión/desconexión

### Componentes Específicos

**`GoogleContactsConnectionModal.tsx`**
- Modal informativo antes de conectar Contacts
- Explica qué se sincronizará

**`GoogleContactsDisconnectModal.tsx`**
- Modal de confirmación para desconectar
- Opciones: Eliminar contactos o mantenerlos

**`GoogleCalendarDisconnectModal.tsx`**
- Modal de confirmación para desconectar
- Opciones: Eliminar eventos o mantenerlos

---

## 📝 Notas Técnicas Importantes

### OAuth Directo vs Supabase Auth

- ✅ **OAuth Directo**: Usado para integraciones de Google (Drive, Calendar, Contacts)
- ✅ **Independiente de sesión**: El usuario puede conectarse con una cuenta diferente a la de login
- ✅ **Nivel de estudio**: La conexión pertenece al estudio, no al usuario

### Refresh Tokens

- ✅ **Nunca sobrescribir con null**: Si el nuevo token es null, mantener el existente
- ✅ **Validación en callback**: Verificar `tokens.refresh_token` antes de actualizar DB
- ✅ **Encriptación obligatoria**: Todos los refresh tokens se encriptan antes de guardar

### Manejo de Errores

**401 Unauthorized:**
- Los clientes intentan auto-refresh automáticamente
- Si falla, mostrar mensaje al usuario para reconectar

**403 Forbidden (API no habilitada):**
- Detectar si la API no está habilitada en Google Cloud
- Mostrar mensaje con URL directa para habilitar la API

**404 Not Found:**
- Recrear recurso si fue eliminado manualmente
- Actualizar DB con nuevo ID

**409 Conflict (Grupo/Recurso existente):**
- Buscar recurso existente por nombre
- Usar ID existente en lugar de crear duplicado

### Rate Limits

- **People API**: ~1000 requests/minuto por usuario
- **Calendar API**: ~1000 requests/minuto por usuario
- **Drive API**: ~1000 requests/minuto por usuario
- **Mitigación**: Retry con exponential backoff (implementado en clientes)

---

## 🔗 Referencias

- [Google People API Documentation](https://developers.google.com/people/api/rest)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

---

**Última actualización:** 28 de diciembre de 2024  
**Estado:** ✅ Implementación completa y documentada

