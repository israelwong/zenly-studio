# Plan de Trabajo: Integración Google (Drive + Calendar)

## 📋 Resumen Ejecutivo

Implementar integración con Google APIs para optimizar entrega de contenido y sincronización de agenda:

- **Google Drive**: Vincular carpetas de Drive a eventos y gestionar entregables
- **Google Calendar**: Sincronización opcional bidireccional con agenda del estudio
- **Portal Cliente**: Visualizar galería con thumbnails y descargar desde Google
- **Beneficio**: $0 costo de almacenamiento, sincronización automática de eventos

---

## 🔍 Análisis del Estado Actual

### Componentes Existentes

**Estudio:**

- ✅ `EventDeliverablesCard.tsx` - Gestión básica de entregables con `file_url` manual
- ✅ `deliverables.actions.ts` - CRUD de entregables
- ✅ Schema: `studio_event_deliverables` con `file_url` (string opcional)

**Portal Cliente:**

- ✅ `entrega-digital/page.tsx` - Placeholder vacío
- ✅ Layout y contexto de evento configurados
- ❌ Sin componente de galería

### Limitaciones Actuales

1. **Sin integración Google Drive**: Solo URLs manuales
2. **Sin integración Google Calendar**: Agenda no sincroniza con Google Calendar
3. **Sin OAuth2**: No hay autenticación con Google
4. **Sin campos en DB**: Faltan `google_folder_id`, `google_event_id`, `google_refresh_token`, etc.
5. **Sin visualización**: Portal cliente no muestra galería

---

## 🗄️ Fase 1: Actualización de Schema

### Arquitectura Multi-Tenant

**Separación de responsabilidades:**

- **`platform_config`**: Credenciales OAuth compartidas (un solo set para toda la plataforma)
- `google_oauth_client_id` - Client ID compartido
- `google_oauth_client_secret` - Client Secret (encriptado)
- `google_api_key` - API Key para Google Picker
- `google_oauth_redirect_uri` - URI de callback
- **`studios`**: Tokens específicos de cada estudio (cada estudio conecta su propia cuenta)
- `google_refresh_token` - Token de refresh (encriptado, específico del estudio)
- `google_email` - Email de la cuenta Google del estudio
- `is_google_connected` - Estado de conexión del estudio

### 1.1 Migración: Campos en `platform_config` (Credenciales OAuth compartidas)

**Archivo:** `prisma/migrations/manual_add_google_drive_integration/migration.sql`

```sql
-- Agregar campos de Google OAuth a nivel plataforma
ALTER TABLE "platform_config" 
ADD COLUMN IF NOT EXISTS "google_oauth_client_id" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_client_secret" TEXT,
ADD COLUMN IF NOT EXISTS "google_api_key" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_redirect_uri" TEXT;
```

**Schema Prisma:**

```prisma
model platform_config {
  // ... campos existentes
  google_oauth_client_id       String?
  google_oauth_client_secret   String?  // Encriptado
  google_api_key               String?
  google_oauth_redirect_uri    String?
}
```



### 1.2 Migración: Campos en `studios` (Tokens específicos por estudio)

**Archivo:** `prisma/migrations/manual_add_google_drive_integration/migration.sql`

```sql
-- Agregar campos de Google Drive al modelo studios
ALTER TABLE "studios" 
ADD COLUMN IF NOT EXISTS "google_refresh_token" TEXT,
ADD COLUMN IF NOT EXISTS "google_email" TEXT,
ADD COLUMN IF NOT EXISTS "is_google_connected" BOOLEAN DEFAULT false;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS "studios_is_google_connected_idx" 
ON "studios"("is_google_connected");
```

**Schema Prisma:**

```prisma
model studios {
  // ... campos existentes
  google_refresh_token  String?  // Encrypted, específico del estudio
  google_email          String?
  is_google_connected    Boolean  @default(false)
  
  @@index([is_google_connected])
}
```



### 1.3 Migración: Campos en `studio_event_deliverables`

**Archivo:** `prisma/migrations/XXXX_add_google_drive_to_deliverables/migration.sql`

```sql
-- Enum para modo de entrega
CREATE TYPE "DeliveryMode" AS ENUM ('native', 'google_drive');

-- Agregar campos a entregables
ALTER TABLE "studio_event_deliverables"
ADD COLUMN "google_folder_id" TEXT,
ADD COLUMN "delivery_mode" "DeliveryMode" DEFAULT 'native',
ADD COLUMN "drive_metadata_cache" JSONB;

-- Índices
CREATE INDEX "studio_event_deliverables_google_folder_id_idx" 
  ON "studio_event_deliverables"("google_folder_id");
CREATE INDEX "studio_event_deliverables_delivery_mode_idx" 
  ON "studio_event_deliverables"("delivery_mode");
```

**Schema Prisma:**

```prisma
enum DeliveryMode {
  native
  google_drive
}

model studio_event_deliverables {
  // ... campos existentes
  google_folder_id      String?
  delivery_mode         DeliveryMode  @default(native)
  drive_metadata_cache  Json?
  
  @@index([google_folder_id])
  @@index([delivery_mode])
}
```

---

## 🔐 Fase 2: Autenticación OAuth2 Google

### 2.1 Configuración de Credenciales

**Opción A: Variables de Entorno (Recomendado para desarrollo)Archivo:** `.env.local`

```bash
# OAuth2 (compartidas a nivel plataforma)
GOOGLE_CLIENT_ID=tu_cliente_id
GOOGLE_CLIENT_SECRET=tu_secreto
GOOGLE_REDIRECT_URI=https://tudominio.com/api/auth/google/callback

# Google Picker API (compartida)
NEXT_PUBLIC_GOOGLE_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_GOOGLE_APP_ID=tu_app_id (opcional)

# Encriptación
ENCRYPTION_KEY=tu_llave_maestra_para_tokens
```

**Opción B: Base de Datos (Recomendado para producción)**Guardar credenciales en `platform_config`:

- Permite cambiar credenciales sin redeploy
- Mejor para multi-tenant
- `google_oauth_client_secret` debe encriptarse antes de guardar

**Configuración en Google Cloud Console:**

1. Crear API Key en Credenciales
2. Restringir API Key a "Google Picker API"
3. Restricciones de aplicaciones: `http://localhost:3000` y dominio de producción
4. Configurar OAuth 2.0 Client ID con redirect URI



### 2.2 Instalación de Dependencias

```bash
# Google APIs (servidor)
npm install googleapis
npm install @types/googleapis --save-dev

# Google Picker (cliente - se carga desde CDN)
# No requiere npm install, se carga dinámicamente
```

**Script de Google Picker:**Agregar en `app/layout.tsx` o componente específico:

```tsx
<Script
  src="https://apis.google.com/js/api.js"
  strategy="lazyOnload"
/>
<Script
  src="https://apis.google.com/js/picker.js"
  strategy="lazyOnload"
/>
```



### 2.3 Server Actions: OAuth2

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`**Funciones necesarias:**

- `iniciarConexionGoogle(studioSlug: string)` - Genera URL de OAuth
- `procesarCallbackGoogle(code: string, studioSlug: string)` - Intercambia code por tokens
- `desconectarGoogle(studioSlug: string)` - Limpia tokens
- `obtenerEstadoConexion(studioSlug: string)` - Verifica si está conectado

### 2.4 API Routes: Callback OAuth

**Archivo:** `src/app/api/auth/google/callback/route.ts`

- Recibe `code` y `state` (con `studioSlug`)
- Intercambia por `access_token` y `refresh_token`
- Encripta `refresh_token` antes de guardar
- Redirige a página de configuración del estudio

### 2.5 Utilidades: Encriptación

**Archivo:** `src/lib/utils/encryption.ts`

- `encryptToken(token: string): string` - Encripta con AES-256
- `decryptToken(encrypted: string): string` - Desencripta
- Usar `ENCRYPTION_KEY` de variables de entorno

---

## 📁 Fase 3: Server Actions Google Drive API

### 3.1 Server Action: Obtener Credenciales OAuth (desde platform_config)

**Archivo:** `src/lib/actions/platform/integrations/google-drive.actions.ts` (nuevo)**Función:** `obtenerCredencialesGoogle()`

- Obtiene credenciales OAuth desde `platform_config`
- Retorna: `{ clientId, clientSecret, apiKey, redirectUri }`
- Si no están en DB, usa variables de entorno como fallback
- Desencripta `client_secret` si está encriptado

### 3.2 Server Action: Obtener Access Token

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`**Función:** `obtenerAccessToken(studioSlug: string)`

- Obtiene credenciales OAuth desde `platform_config` (o env vars)
- Obtiene `refresh_token` del estudio (desencriptado)
- Genera `access_token` con `googleapis` usando credenciales compartidas
- Retorna `access_token` para usar en Google Picker (cliente)
- Maneja refresh automático si está expirado

### 3.3 Server Action: Listar Carpetas (Opcional)

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`**Función:** `listarCarpetasDrive(studioSlug: string)`

- Obtiene `refresh_token` del estudio
- Genera `access_token` con `googleapis`
- Lista carpetas del usuario
- Retorna: `{ id, name, mimeType }[]`
- **Nota:** Google Picker es preferido para selección, esta función es opcional

### 3.4 Server Action: Contenido de Carpeta

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`**Función:** `obtenerContenidoCarpeta(studioSlug: string, folderId: string)`

- Lista archivos dentro de la carpeta
- Filtra solo imágenes/videos (`mimeType` starts with `image/` o `video/`)
- Retorna: `{ id, name, thumbnailLink, webContentLink, mimeType, size }[]`

### 3.5 Server Action: Vincular Carpeta a Entregable

**Archivo:** `src/lib/actions/studio/business/events/deliverables.actions.ts`**Función:** `vincularCarpetaDrive(studioSlug: string, entregableId: string, folderId: string)`

- Actualiza `google_folder_id` y `delivery_mode: 'google_drive'`
- Opcionalmente cachea metadata inicial
- Valida que el estudio tenga Google conectado

### 3.6 Server Action: Obtener Entregables con Drive (Portal Cliente)

**Archivo:** `src/lib/actions/public/deliverables.actions.ts` (nuevo)**Función:** `obtenerEntregablesCliente(eventId: string, clientId: string)`

- Verifica permisos del cliente
- Obtiene entregables del evento
- Si `delivery_mode === 'google_drive'`:
- Obtiene contenido de la carpeta desde Google API
- Retorna metadata completa (thumbnails, links de descarga)
- Si `delivery_mode === 'native'`:
- Retorna `file_url` existente

---

## 🎨 Fase 4: Componentes Estudio

### 4.1 Mejora: EventDeliverablesCard

**Archivo:** `src/app/[slug]/studio/business/events/[eventId]/components/EventDeliverablesCard.tsx`**Cambios:**

1. **Botón "Conectar Google Drive"** (si no está conectado)

- Muestra modal con instrucciones
- Link a página de configuración de integraciones

2. **Selector de Carpeta** (si está conectado)

- Botón "Vincular carpeta de Drive" en formulario
- Abre Google Picker o selector custom
- Guarda `google_folder_id` al crear/editar entregable

3. **Indicador Visual**

- Badge "Google Drive" si `delivery_mode === 'google_drive'`
- Icono de Drive en entregables vinculados

### 4.2 Nuevo: Hook useGooglePicker

**Archivo:** `src/hooks/useGooglePicker.ts` ✅ **CREADOFuncionalidad:**

- Carga Google Picker API dinámicamente (gapi.js y picker.js)
- Abre selector de carpetas de Google Drive
- Retorna `{ id, name, url }` de la carpeta seleccionada
- Maneja errores y estados de carga
- Verifica que `NEXT_PUBLIC_GOOGLE_API_KEY` esté configurada

**Uso:**

```typescript
const { isLoading, isReady, error, openPicker } = useGooglePicker({
  accessToken: 'token_desde_server_action',
  onFolderSelect: (folder) => {
    // folder.id, folder.name, folder.url
    vincularCarpeta(folder.id);
  },
  onError: (error) => {
    toast.error(error);
  },
});

// En el componente:
<ZenButton onClick={openPicker} disabled={!isReady || isLoading}>
  Vincular carpeta de Drive
</ZenButton>
```



### 4.3 Componente: GoogleDrivePickerButton

**Archivo:** `src/app/[slug]/studio/business/events/[eventId]/components/GoogleDrivePickerButton.tsx`**Funcionalidad:**

- Botón "Vincular carpeta de Drive"
- Usa `useGooglePicker` hook
- Obtiene `accessToken` desde Server Action
- Llama a `vincularCarpetaDrive` al seleccionar

### 4.4 Página: Configuración Integraciones

**Archivo:** `src/app/[slug]/studio/config/integraciones/page.tsx` (nuevo)**Contenido:**

- Estado de conexión Google Drive
- Botón conectar/desconectar
- Email vinculado
- Última sincronización
- Instrucciones de configuración

---

## 👤 Fase 5: Componentes Portal Cliente

### 5.1 Nuevo: DeliverablesGallery

**Archivo:** `src/app/[slug]/cliente/[clientId]/[eventId]/components/DeliverablesGallery.tsx`**Funcionalidad:**

- Grid responsivo de thumbnails
- Loading states
- Filtros por tipo (fotos/videos)
- Modal de preview
- Botón descarga directa desde Google

**Props:**

```typescript
interface DeliverablesGalleryProps {
  eventId: string;
  clientId: string;
}
```



### 5.2 Actualizar: entrega-digital/page.tsx

**Archivo:** `src/app/[slug]/cliente/[clientId]/[eventId]/entrega-digital/page.tsx`**Reemplazar placeholder con:**

- Lista de entregables del evento
- `DeliverablesGallery` para cada entregable con Google Drive
- Links directos para entregables nativos

### 5.3 Server Action: Obtener Entregables Cliente

**Archivo:** `src/lib/actions/public/deliverables.actions.ts` (nuevo)**Función:** `obtenerEntregablesCliente(eventId: string, clientId: string)`

- Valida que el cliente tenga acceso al evento
- Obtiene entregables
- Para cada entregable con `google_folder_id`:
- Llama a Google API para obtener archivos
- Retorna metadata completa

---

## 📅 Fase 6: Integración Google Calendar (Sincronización de Agenda)

### 6.1 Migración: Campo en `studio_agenda`

**Archivo:** `prisma/migrations/manual_add_google_drive_integration/migration.sql` ✅ **YA INCLUIDO**

```sql
-- Agregar campo para sincronización con Google Calendar
ALTER TABLE "studio_agenda"
ADD COLUMN IF NOT EXISTS "google_event_id" TEXT;

CREATE INDEX IF NOT EXISTS "studio_agenda_google_event_id_idx" 
ON "studio_agenda"("google_event_id");
```

**Schema Prisma:**

```prisma
model studio_agenda {
  // ... campos existentes
  google_event_id  String?
  
  @@index([google_event_id])
}
```



### 6.2 Server Actions: Google Calendar API

**Archivo:** `src/lib/actions/studio/integrations/google-calendar.actions.ts` (nuevo)**Funciones necesarias:**

1. **`obtenerAccessTokenCalendar(studioSlug: string)`**

- Obtiene credenciales OAuth desde `platform_config`
- Obtiene `refresh_token` del estudio (desencriptado)
- Verifica que tenga scope `calendar.events`
- Genera `access_token` con `googleapis`
- Retorna `access_token`

2. **`crearEventoCalendar(studioSlug: string, agendaId: string)`**

- Obtiene datos del agendamiento desde DB
- Verifica que NO tenga `google_event_id` (prevención de duplicados)
- Crea evento en Google Calendar usando `calendar.events.insert`
- Guarda `google_event_id` en `studio_agenda`
- Retorna `google_event_id`

3. **`actualizarEventoCalendar(studioSlug: string, agendaId: string)`**

- Obtiene `google_event_id` del agendamiento
- Si existe, actualiza en Google Calendar usando `calendar.events.update`
- Si no existe, crea nuevo evento (fallback)
- Retorna `google_event_id`

4. **`eliminarEventoCalendar(studioSlug: string, agendaId: string)`**

- Obtiene `google_event_id` del agendamiento
- Si existe, elimina en Google Calendar usando `calendar.events.delete`
- Limpia `google_event_id` en DB

5. **`sincronizarAgendaCompleta(studioSlug: string)`**

- Sincroniza todos los agendamientos del estudio
- Crea eventos faltantes en Google Calendar
- Actualiza eventos existentes
- Opcional: Sincronización bidireccional (webhooks)

### 6.3 Integración en Agenda Actions

**Archivo:** `src/lib/actions/shared/agenda-unified.actions.ts`**Modificaciones:**

1. **`crearAgendamiento`** - Después de crear en DB:
   ```typescript
         // Después de crear agenda en DB
         if (studio.is_google_connected && google_integrations_config?.calendar?.enabled) {
           try {
             const { crearEventoCalendar } = await import('@/lib/actions/studio/integrations/google-calendar.actions');
             const googleEventId = await crearEventoCalendar(studioSlug, agenda.id);
             // Actualizar agenda con google_event_id
             await prisma.studio_agenda.update({
               where: { id: agenda.id },
               data: { google_event_id: googleEventId }
             });
           } catch (error) {
             // Log error pero no fallar la creación
             console.error('Error sincronizando con Google Calendar:', error);
           }
         }
   ```




2. **`actualizarAgendamiento`** - Después de actualizar en DB:
   ```typescript
         // Después de actualizar agenda en DB
         if (agenda.google_event_id) {
           await actualizarEventoCalendar(studioSlug, agendaId);
         } else if (studio.is_google_connected && google_integrations_config?.calendar?.enabled) {
           // Crear si no existe pero está habilitado
           await crearEventoCalendar(studioSlug, agendaId);
         }
   ```




3. **`eliminarAgendamiento`** - Antes de eliminar en DB:
   ```typescript
         // Antes de eliminar agenda en DB
         if (agenda.google_event_id) {
           await eliminarEventoCalendar(studioSlug, agendaId);
         }
   ```




### 6.4 Mapeo de Datos: Agenda → Google Calendar

**Estructura del evento en Google Calendar:**

```typescript
interface GoogleCalendarEvent {
  summary: string;              // agenda.concept
  description?: string;          // agenda.description
  start: {
    dateTime: string;           // ISO 8601: agenda.date + agenda.time
    timeZone: string;           // 'America/Mexico_City'
  };
  end: {
    dateTime: string;           // Calculado (start + 1 hora por defecto)
    timeZone: string;
  };
  location?: string;            // agenda.address
  conferenceData?: {            // Si tiene link_meeting_url
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: 'hangoutsMeet' };
    };
  };
}
```

**Mapeo:**

- `agenda.concept` → `summary`
- `agenda.description` → `description`
- `agenda.date + agenda.time` → `start.dateTime`
- `agenda.address` → `location`
- `agenda.link_meeting_url` → `conferenceData` (si es Google Meet)

### 6.5 Prevención de Duplicados

**Estrategia:**

1. **Antes de crear**: Verificar que `google_event_id IS NULL`
2. **Al crear**: Guardar `google_event_id` inmediatamente después de crear en Google
3. **Al actualizar**: Usar `google_event_id` existente para `update`
4. **Validación**: Si `google_event_id` existe pero evento no existe en Google, crear nuevo

### 6.6 Configuración de Scopes

**Scopes necesarios:**

- `https://www.googleapis.com/auth/calendar.events` - Crear, actualizar, eliminar eventos

**En OAuth flow:**

```typescript
const scopes = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];
```



### 6.7 UI: Toggle de Sincronización

**Archivo:** `src/app/[slug]/studio/config/integraciones/page.tsx`**Agregar:**

- Toggle "Sincronizar con Google Calendar"
- Estado de sincronización (última sync)
- Botón "Sincronizar ahora" (manual)
- Lista de eventos sincronizados

---

## 🔧 Fase 7: Utilidades y Helpers

### 6.1 Google Drive Client

**Archivo:** `src/lib/integrations/google-drive.client.ts`**Clase:** `GoogleDriveClient`

- Método: `getAuthenticatedClient(studioSlug: string)`
- Método: `listFolders()`
- Método: `listFolderContents(folderId: string)`
- Manejo de refresh tokens automático

### 6.2 Tipos TypeScript

**Archivo:** `src/types/google-drive.ts`

```typescript
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  size?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: string;
}
```

---

## 📝 Fase 8: Testing y Validación

### 8.1 Casos de Prueba

1. **OAuth Flow:**

- Conectar Google Drive desde estudio
- Verificar tokens guardados (encriptados)
- Desconectar y limpiar tokens

2. **Vincular Carpeta:**

- Seleccionar carpeta en entregable
- Verificar `google_folder_id` guardado
- Cambiar de carpeta

3. **Visualización Cliente:**

- Cargar galería con thumbnails
- Descargar archivo desde Google
- Manejo de errores (carpeta no encontrada, sin permisos)

4. **Edge Cases:**

- Token expirado (refresh automático)
- Carpeta eliminada en Drive
- Sin archivos en carpeta

---

## 🚀 Orden de Implementación Recomendado

### Sprint 1: Fundación

1. ✅ Migraciones de schema (Fase 1)
2. ✅ Variables de entorno y dependencias
3. ✅ Utilidades de encriptación
4. ✅ Google Drive Client básico

### Sprint 2: Autenticación

5. ✅ OAuth2 flow completo
6. ✅ API route callback
7. ✅ Server actions de conexión
8. ✅ Página de configuración integraciones

### Sprint 3: Estudio

9. ✅ Hook useGooglePicker
10. ✅ Mejorar EventDeliverablesCard con Google Picker
11. ✅ GoogleDrivePickerButton component
12. ✅ Vincular carpetas a entregables
13. ✅ Testing en estudio

### Sprint 4: Portal Cliente

14. ✅ DeliverablesGallery component
15. ✅ Actualizar entrega-digital/page.tsx
16. ✅ Server actions para cliente
17. ✅ Testing completo

### Sprint 5: Google Calendar

18. ✅ Server Actions Google Calendar API
19. ✅ Integración en agenda-unified.actions.ts
20. ✅ Mapeo de datos Agenda → Google Calendar
21. ✅ Prevención de duplicados
22. ✅ UI de configuración y sincronización
23. ✅ Testing de sincronización bidireccional

---

## 📚 Referencias y Recursos

- [Google Drive API Docs](https://developers.google.com/drive/api)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Picker API](https://developers.google.com/picker) - **USAR ESTE** para selector de carpetas
- [Google Picker API Docs](https://developers.google.com/picker/docs)

---

## ⚠️ Consideraciones de Seguridad

1. **Tokens Encriptados**: `refresh_token` siempre encriptado en DB
2. **Scopes Mínimos**: Solo `drive.metadata.readonly` y `drive.readonly`
3. **Validación de Permisos**: Verificar que el estudio sea dueño del evento
4. **Rate Limiting**: Implementar límites en llamadas a Google API
5. **Error Handling**: Manejar tokens expirados, carpetas eliminadas, etc.

---

## 📊 Métricas de Éxito

- ✅ Estudios pueden conectar Google Drive
- ✅ Entregables vinculados a carpetas de Drive
- ✅ Clientes visualizan galería con thumbnails
- ✅ Descargas funcionan desde Google directamente
- ✅ $0 costo de almacenamiento en Supabase/Vercel
- ✅ Tiempo de carga < 2s para galerías

---

## ✅ Progreso Actual

### ✅ Completado - Google Drive (Fase Principal)

#### Fase 1: Fundación

- ✅ **Migración SQL manual** aplicada (`prisma/migrations/manual_add_google_drive_integration/migration.sql`)
- ✅ **Schema Prisma actualizado** (campos y enum `DeliveryMode`)
- ✅ **Utilidad de encriptación** (`src/lib/utils/encryption.ts`)
- ✅ **Variables de entorno** configuradas (`.env.local`)
- ✅ **Dependencias instaladas** (`googleapis`)

#### Fase 2: Autenticación OAuth2

- ✅ **Server Actions OAuth2** (`src/lib/actions/studio/integrations/google-drive.actions.ts`)
- `iniciarConexionGoogle()` - Genera URL de OAuth
- `procesarCallbackGoogle()` - Intercambia code por tokens
- `desconectarGoogle()` - Limpia tokens
- `obtenerEstadoConexion()` - Verifica conexión
- ✅ **API Route callback** (`src/app/api/auth/google/callback/route.ts`)
- ✅ **Obtener credenciales** desde `platform_config` (`src/lib/actions/platform/integrations/google.actions.ts`)
- ✅ **Componente reutilizable** `GoogleDriveConnection` para conectar/desconectar

#### Fase 3: Google Drive API

- ✅ **Google Drive Client** (`src/lib/integrations/google-drive.client.ts`)
- `getGoogleDriveClient()` - Cliente autenticado
- `listFolders()` - Lista carpetas (raíz o subcarpetas)
- `listSubfolders()` - Lista subcarpetas de una carpeta
- `listFolderContents()` - Contenido de carpeta (imágenes/videos)
- `getFolderById()` - Detalles de carpeta por ID
- `getAccessTokenForPicker()` - Token para Google Picker
- ✅ **Server Actions Drive** (`src/lib/actions/studio/integrations/google-drive.actions.ts`)
- `listarCarpetasDrive()` - Lista carpetas disponibles
- `listarSubcarpetas()` - Lista subcarpetas
- `obtenerContenidoCarpeta()` - Contenido de carpeta
- `obtenerDetallesCarpeta()` - Detalles de carpeta
- `obtenerAccessToken()` - Token para cliente

#### Fase 4: Componentes Estudio

- ✅ **Selector personalizado** `GoogleDriveFolderPicker` (`src/components/shared/integrations/GoogleDriveFolderPicker.tsx`)
- Navegación jerárquica de carpetas
- Búsqueda de carpetas
- Breadcrumb navigation
- Skeleton de carga
- Apertura directa en carpeta seleccionada
- ✅ **EventDeliverablesCard mejorado** (`src/app/[slug]/studio/business/events/[eventId]/components/EventDeliverablesCard.tsx`)
- Integración con selector personalizado
- Vinculación de carpetas a entregables
- Asignación automática de nombre de carpeta al entregable
- Visualización de carpeta vinculada
- Conexión directa desde modal
- ✅ **Página de integraciones** (`src/app/[slug]/studio/config/integraciones/page.tsx`)
- Estado de conexión
- Botones conectar/desconectar
- Email vinculado
- ✅ **Server Action vincular carpeta** (`src/lib/actions/studio/business/events/deliverables.actions.ts`)
- `vincularCarpetaDrive()` - Vincula carpeta a entregable

#### Fase 5: Tipos y Utilidades

- ✅ **Tipos TypeScript** (`src/types/google-drive.ts`)
- ✅ **Componente reutilizable** `GoogleDriveConnection`

### ⏳ Pendiente

#### Fase 5: Portal Cliente

- ⏳ **DeliverablesGallery component** - Galería con thumbnails para clientes
- ⏳ **Actualizar entrega-digital/page.tsx** - Integrar galería
- ⏳ **Server Actions para cliente** - Obtener entregables con contenido de Drive

#### Fase 6: Google Calendar (Fase 2 - Futuro)

- ⏳ Server Actions Google Calendar API
- ⏳ Integración en agenda-unified.actions.ts
- ⏳ Mapeo de datos Agenda → Google Calendar
- ⏳ UI de configuración y sincronización

#### Testing

- ⏳ Testing completo end-to-end de Google Drive
- ⏳ Testing de OAuth flow
- ⏳ Testing de edge cases (tokens expirados, carpetas eliminadas)