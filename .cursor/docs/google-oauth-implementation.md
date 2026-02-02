# Implementación de OAuth Google (Calendar y Drive)

## 📋 Resumen

Este documento describe la implementación actual de las conexiones OAuth de Google Calendar y Google Drive en ZEN Platform, incluyendo la solución al problema de PKCE y la separación de flujos de autenticación.

**Fecha:** 26 de diciembre de 2024  
**Última revisión:** 2 de febrero de 2026  
**Rama:** `251226-studio-review-calendar-drive`

> **Nota:** Este documento cubre OAuth directo para integraciones de Calendar y Drive.  
> Para autenticación de usuarios (login), ver: [AUTENTICACION_MASTER.md](auth/AUTENTICACION_MASTER.md)

---

## 🏗️ Arquitectura General

### Separación de Flujos OAuth

La implementación distingue **tres flujos OAuth independientes**:

1. **Login de Usuario** (`LoginForm.tsx`)
   - Usa Supabase Auth OAuth
   - Solo solicita scopes básicos (`email`, `profile`)
   - Crea/actualiza usuario en Prisma
   - **Estado:** ✅ Funcional

2. **Conexión Google Calendar** (`CalendarIntegrationCard.tsx`)
   - Usa OAuth directo de Google (sin Supabase Auth)
   - Solicita scopes: `calendar`, `calendar.events`
   - Vincula tokens al Studio (no al usuario)
   - **Estado:** ✅ Funcional

3. **Conexión Google Drive** (`GoogleDriveIntegrationCard.tsx`)
   - Usa OAuth directo de Google (sin Supabase Auth)
   - Solicita scopes: `drive.readonly`, `drive`
   - Vincula tokens al Studio (no al usuario)
   - **Estado:** ✅ Funcional

### ¿Por qué OAuth directo para Calendar y Drive?

**Problema original:** Usar Supabase Auth OAuth para vincular recursos (Calendar/Drive) causaba:

- Cierre de sesión del usuario actual
- Conflictos con PKCE `code_verifier`
- Interferencia entre sesión de usuario y tokens de recursos

**Solución:** OAuth directo con Google API evita:

- Interferencia con la sesión de Supabase
- Problemas de PKCE (no usa Supabase Auth)
- Mejor control sobre scopes y tokens

---

## 🔄 Flujo de Conexión Google Calendar

### 1. Inicio de Conexión

**Archivo:** `src/lib/actions/auth/oauth-calendar.actions.ts`

```typescript
export async function iniciarConexionGoogleCalendar(
  studioSlug: string,
  returnUrl?: string
): Promise<GoogleOAuthUrlResult>;
```

**Proceso:**

1. Valida que el studio existe
2. Obtiene credenciales Google (clientId, clientSecret, redirectUri)
3. Genera URL de OAuth con:
   - Scopes: `calendar`, `calendar.events`
   - `access_type: 'offline'` (para obtener refresh_token)
   - `prompt: 'consent'` (para forzar consentimiento)
   - `state`: Base64 JSON con `{ studioSlug, returnUrl, resourceType: 'calendar' }`
4. Retorna URL para redirección

**Llamado desde:**

- `src/lib/actions/auth/oauth-client.actions.ts` → `iniciarVinculacionRecursoGoogleClient()`
- `src/app/[slug]/studio/config/integraciones/page.tsx` → `handleConnectCalendar()`

### 2. Callback de OAuth

**Archivo:** `src/app/(auth)/auth/callback/route.ts`

**Detección de flujo:**

```typescript
// Si hay 'state' en la URL, es OAuth directo (Calendar o Drive)
if (state && code) {
  const stateData = JSON.parse(Buffer.from(state, "base64").toString());

  if (stateData.resourceType === "calendar") {
    await procesarCallbackGoogleCalendar(code, state);
  }
}
```

**Procesamiento:**

1. Decodifica `state` para obtener `studioSlug`, `returnUrl`, `resourceType`
2. Llama a `procesarCallbackGoogleCalendar()`
3. Redirige con `success=google_connected` o `error=...`

### 3. Procesamiento de Tokens

**Archivo:** `src/lib/actions/auth/oauth-calendar.actions.ts`

```typescript
export async function procesarCallbackGoogleCalendar(
  code: string,
  state: string
): Promise<{
  success: boolean;
  studioSlug?: string;
  returnUrl?: string;
  error?: string;
}>;
```

**Proceso:**

1. Decodifica `state` para obtener `studioSlug`
2. Intercambia `code` por tokens con Google OAuth API:
   ```typescript
   POST https://oauth2.googleapis.com/token
   {
     code,
     client_id,
     client_secret,
     redirect_uri,
     grant_type: 'authorization_code'
   }
   ```
3. Obtiene información del usuario (email, name) con `access_token`
4. Combina scopes existentes con nuevos scopes
5. Encripta `refresh_token` con `encryptToken()`
6. Actualiza `studios` table:
   - `google_oauth_refresh_token`
   - `google_oauth_email`
   - `google_oauth_name`
   - `google_oauth_scopes` (JSON array)
   - `is_google_connected: true`
   - `google_integrations_config.calendar.enabled: true`

---

## 🔄 Flujo de Conexión Google Drive

### 1. Inicio de Conexión

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`

```typescript
export async function iniciarConexionGoogle(
  studioSlug: string,
  returnUrl?: string
): Promise<GoogleOAuthUrlResult>;
```

**Proceso:** Similar a Calendar, pero con scopes:

- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive`

### 2. Callback y Procesamiento

**Similar a Calendar:**

- Mismo callback route (`/auth/callback`)
- Detecta `resourceType: 'drive'` en `state`
- Llama a `procesarCallbackGoogle()` (en `google-drive.actions.ts`)
- Actualiza `studios` con tokens y configuración de Drive

---

## 🔐 Validación de Conexión

### Función Principal

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`

```typescript
export async function obtenerEstadoConexion(
  studioSlug: string
): Promise<GoogleConnectionStatus>;
```

**Validación correcta (sin lógica legacy):**

```typescript
// SOLO verificar scopes de Drive
const hasDriveScope = scopes.some(
  (scope) => scope.includes("drive.readonly") || scope.includes("drive")
);

// Verificar que tenga refresh token activo
const driveConnected =
  hasDriveScope && studio.google_oauth_refresh_token !== null;
```

**❌ Lógica legacy eliminada:**

- ~~Verificar entregables vinculados~~
- ~~Verificar configuración `google_integrations_config.drive.enabled`~~
- ~~Asumir conexión basada en `is_google_connected` sin scopes~~

### Uso en Componentes

**EventDeliverablesCard:**

```typescript
const checkGoogleConnection = async () => {
  const status = await obtenerEstadoConexion(studioSlug);
  const hasDriveScope =
    status.scopes?.some(
      (scope) => scope.includes("drive.readonly") || scope.includes("drive")
    ) ?? false;
  const hasActiveConnection = hasDriveScope && !!status.email;
  setIsGoogleConnected(hasActiveConnection);
};
```

---

## 🚫 Desconexión

### Google Calendar

**Archivo:** `src/lib/actions/auth/desconectar-google-calendar.actions.ts`

```typescript
export async function desvincularRecursoGoogle(
  studioSlug: string,
  limpiarEventos: boolean
): Promise<DesvincularRecursoGoogleResult>;
```

**Opciones:**

1. **Solo desconectar:** Mantiene eventos en Google Calendar, solo detiene sincronización
2. **Limpiar y desconectar:** Elimina eventos sincronizados del calendario

**Modal:** `GoogleCalendarDisconnectModal.tsx`

- Muestra conteo de eventos sincronizados
- Permite elegir entre las dos opciones

### Google Drive

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`

```typescript
export async function desconectarGoogleDrive(
  studioSlug: string,
  limpiarPermisos: boolean = true
): Promise<{
  success: boolean;
  error?: string;
  permisosRevocados?: number;
  entregablesLimpios?: number;
}>;
```

**Opciones:**

1. **Solo desconectar:** Mantiene permisos públicos de carpetas
2. **Revocar permisos y desconectar:** Revoca permisos públicos de carpetas vinculadas

**Modal:** `GoogleDriveDisconnectModal.tsx`

**Manejo de errores:**

- Errores 403 (Insufficient Permission): Se ignoran (carpetas pueden no ser accesibles)
- Errores 404: Se ignoran (carpetas ya eliminadas)
- Errores 400: Se ignoran (solicitud inválida)

---

## 🔧 Manejo de Errores

### Errores 403 (Insufficient Permission)

**Contexto:** Ocurre cuando se intenta listar/eliminar permisos de carpetas sin acceso.

**Solución:**

```typescript
// En listFolders (google-drive.client.ts)
try {
  const response = await drive.files.list({ ... });
} catch (error: any) {
  if (error?.code === 403 || error?.response?.status === 403) {
    console.warn('[listFolders] Permisos insuficientes');
    throw new Error('Permisos insuficientes. Por favor, reconecta Google Drive.');
  }
  throw error;
}
```

**En desconectarGoogleDrive:**

```typescript
// Ignorar errores 403, 404, 400 durante revocación de permisos
if (statusCode === 404 || statusCode === 403 || statusCode === 400) {
  console.warn("Error no crítico, continuando...");
  // Continuar sin fallar
}
```

---

## 📁 Archivos Clave

### OAuth Calendar

- `src/lib/actions/auth/oauth-calendar.actions.ts` - Server Actions para Calendar
- `src/lib/actions/auth/oauth-client.actions.ts` - Cliente para iniciar OAuth Calendar
- `src/lib/actions/auth/desconectar-google-calendar.actions.ts` - Desconexión Calendar

### OAuth Drive

- `src/lib/actions/studio/integrations/google-drive.actions.ts` - Server Actions para Drive
- `src/lib/integrations/google-drive.client.ts` - Cliente para operaciones Drive
- `src/lib/actions/auth/oauth-client.actions.ts` - Cliente para iniciar OAuth Drive

### Callback Unificado

- `src/app/(auth)/auth/callback/route.ts` - Callback que maneja login, Calendar y Drive

### Componentes UI

- `src/app/[slug]/studio/config/integraciones/components/CalendarIntegrationCard.tsx`
- `src/app/[slug]/studio/config/integraciones/components/GoogleDriveIntegrationCard.tsx`
- `src/components/shared/integrations/GoogleCalendarDisconnectModal.tsx`
- `src/components/shared/integrations/GoogleDriveDisconnectModal.tsx`
- `src/app/[slug]/studio/business/events/[eventId]/components/EventDeliverablesCard.tsx`

---

## ⚠️ Pendiente: Validación de Inicio de Sesión

### Estado Actual

**Login con Google OAuth:**

- ✅ Implementado en `LoginForm.tsx`
- ✅ Usa Supabase Auth OAuth
- ✅ Callback en `/auth/callback` procesa usuario
- ✅ Crea/actualiza usuario en Prisma

**❌ Falta validar:**

- Verificar que el flujo de login funcione correctamente después de los cambios
- Confirmar que no hay interferencia entre login y conexiones de recursos
- Validar que la sesión se mantiene después de conectar Calendar/Drive
- Probar escenarios:
  - Login nuevo con Google
  - Login existente con Google
  - Login y luego conectar Calendar
  - Login y luego conectar Drive
  - Conectar Calendar/Drive sin estar logueado (debe redirigir a login)

### Próximos Pasos

1. **Probar flujo de login completo:**
   - Login con Google desde `/login`
   - Verificar redirección correcta
   - Confirmar creación/actualización de usuario

2. **Probar integración con conexiones:**
   - Login → Conectar Calendar → Verificar que sesión se mantiene
   - Login → Conectar Drive → Verificar que sesión se mantiene
   - Conectar Calendar sin login → Debe redirigir a login

3. **Validar manejo de errores:**
   - Error en callback de login
   - Usuario cancela OAuth
   - Token expirado

---

## 🔍 Debugging

### Logs Importantes

**Callback OAuth:**

```typescript
console.log("[OAuth Callback] Parámetros recibidos:", {
  hasCode: !!code,
  hasError: !!error,
  hasState: !!state,
  next,
  type,
  studioSlug,
  resourceType,
});
```

**Validación de conexión:**

```typescript
console.log("[obtenerEstadoConexion] Scopes:", scopes);
console.log("[obtenerEstadoConexion] Drive conectado:", driveConnected);
```

### Verificar Estado de Conexión

**En base de datos:**

```sql
SELECT
  slug,
  is_google_connected,
  google_oauth_email,
  google_oauth_scopes,
  google_integrations_config
FROM studios
WHERE slug = 'demo-studio';
```

**En código:**

```typescript
const status = await obtenerEstadoConexion(studioSlug);
console.log("Estado:", {
  isConnected: status.isConnected,
  email: status.email,
  scopes: status.scopes,
});
```

---

## 📝 Notas Técnicas

### Scopes de Google

**Calendar:**

- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

**Drive:**

- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive`

### Encriptación de Tokens

**Refresh tokens se encriptan antes de guardar:**

```typescript
const encryptedRefreshToken = await encryptToken(tokens.refresh_token);
```

**Función:** `src/lib/utils/encryption.ts` → `encryptToken()`

### State Parameter

**Formato:**

```typescript
const state = Buffer.from(
  JSON.stringify({
    studioSlug,
    returnUrl: returnUrl || null,
    resourceType: "calendar" | "drive",
  })
).toString("base64");
```

**Uso:** Pasar contexto entre inicio de OAuth y callback sin usar cookies/sesión.

---

## ✅ Checklist de Implementación

### Google Calendar

- [x] Inicio de conexión OAuth directo
- [x] Callback y procesamiento de tokens
- [x] Actualización de base de datos
- [x] Validación de conexión
- [x] Desconexión con opciones
- [x] Modal de desconexión
- [x] Manejo de errores

### Google Drive

- [x] Inicio de conexión OAuth directo
- [x] Callback y procesamiento de tokens
- [x] Actualización de base de datos
- [x] Validación de conexión (sin lógica legacy)
- [x] Desconexión con opciones
- [x] Modal de desconexión
- [x] Manejo de errores 403/404/400
- [x] Integración en EventDeliverablesCard

### Login con Google

- [x] Implementación básica
- [ ] Validación completa del flujo
- [ ] Pruebas de integración con Calendar/Drive
- [ ] Manejo de errores en login

---

**Última actualización:** 26 de diciembre de 2024
