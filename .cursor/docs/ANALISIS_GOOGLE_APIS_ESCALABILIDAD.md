# Análisis: Escalabilidad de Integraciones Google

## 🔍 Análisis de Google APIs

### OAuth2 de Google

**Características clave:**

- ✅ **Un solo Client ID puede tener múltiples scopes**
  - Ejemplo: `https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar`
- ✅ **Un solo Client Secret para todas las APIs**
- ✅ **Un solo Redirect URI** (puede manejar múltiples servicios)

**Conclusión:** OAuth2 es **genérico y reutilizable** para todas las integraciones de Google.

### API Keys de Google

**Características:**

- ❌ **Cada API requiere su propia API Key**
  - Google Drive API → API Key específica
  - Gmail API → API Key específica (o usar OAuth sin API Key)
  - Google Calendar API → API Key específica (o usar OAuth sin API Key)
- ⚠️ **Google Picker API** requiere API Key específica
- ⚠️ **Algunas APIs pueden usar solo OAuth** (sin API Key)

**Conclusión:** API Keys son **específicas por servicio**.

---

## 🏗️ Propuesta de Arquitectura Escalable

### Opción A: Campos Explícitos (Recomendada)

**Ventajas:**

- ✅ Type-safe en Prisma
- ✅ Fácil de consultar y indexar
- ✅ Explícito y claro
- ✅ Escalable (agregar campos cuando se necesiten)

**Desventajas:**

- ⚠️ Requiere migración por cada nueva API
- ⚠️ Más campos en la tabla

**Estructura:**

```prisma
model platform_config {
  // OAuth genérico (reutilizable para todas las APIs)
  google_oauth_client_id       String?
  google_oauth_client_secret   String?  // Encriptado
  google_oauth_redirect_uri    String?

  // API Keys específicas por servicio
  google_drive_api_key         String?  // Para Google Picker
  google_gmail_api_key         String?  // Futuro (opcional, puede usar solo OAuth)
  google_calendar_api_key      String?  // Futuro (opcional, puede usar solo OAuth)
}

model studios {
  // Tokens OAuth (genérico, puede tener múltiples scopes)
  google_oauth_refresh_token   String?  // Encriptado
  google_oauth_email           String?
  google_oauth_scopes          String?  // JSON array: ["drive.readonly", "gmail.send"]
  is_google_connected          Boolean  @default(false)

  // Configuración específica por servicio (opcional, usar JSONB)
  google_integrations_config    Json?   // { drive: { enabled: true }, gmail: { enabled: false } }
}
```

### Opción B: JSONB Flexible

**Ventajas:**

- ✅ Muy flexible
- ✅ No requiere migraciones para nuevas APIs
- ✅ Similar al patrón existente (`StudioIntegrationsConfigSchema`)

**Desventajas:**

- ❌ Menos type-safe
- ❌ Más difícil de consultar
- ❌ Requiere validación manual

**Estructura:**

```prisma
model platform_config {
  google_oauth_config  Json?  // { client_id, client_secret, redirect_uri }
  google_apis_config   Json?  // { drive: { api_key }, gmail: { api_key } }
}

model studios {
  google_oauth_tokens  Json?  // { refresh_token, email, scopes: [] }
  google_integrations  Json?  // { drive: { enabled }, gmail: { enabled } }
}
```

---

## ✅ Recomendación Final: Opción A (Híbrida)

### Naming Strategy

**OAuth (Genérico):**

- `google_oauth_client_id` ✅
- `google_oauth_client_secret` ✅
- `google_oauth_redirect_uri` ✅

**API Keys (Específicas):**

- `google_drive_api_key` ✅ (para Google Picker)
- `google_gmail_api_key` ⏳ (futuro, opcional)
- `google_calendar_api_key` ⏳ (futuro, opcional)

**Tokens por Estudio:**

- `google_oauth_refresh_token` ✅ (genérico, puede tener múltiples scopes)
- `google_oauth_email` ✅
- `google_oauth_scopes` ✅ (JSON array de scopes autorizados)
- `is_google_connected` ✅

**Configuración por Servicio (JSONB opcional):**

- `google_integrations_config` (JSONB) - Para flags de habilitación por servicio

### Migración Actualizada

```sql
-- OAuth genérico
ALTER TABLE "platform_config"
ADD COLUMN IF NOT EXISTS "google_oauth_client_id" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_client_secret" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_redirect_uri" TEXT;

-- API Keys específicas (agregar solo las necesarias)
ALTER TABLE "platform_config"
ADD COLUMN IF NOT EXISTS "google_drive_api_key" TEXT;
-- Futuro: google_gmail_api_key, google_calendar_api_key

-- Tokens genéricos en studios
ALTER TABLE "studios"
ADD COLUMN IF NOT EXISTS "google_oauth_refresh_token" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_email" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_scopes" TEXT,  -- JSON array
ADD COLUMN IF NOT EXISTS "is_google_connected" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "google_integrations_config" JSONB;  -- { drive: { enabled: true } }
```

---

## 📋 Plan de Implementación

### Fase 1: Google Drive (Actual)

- ✅ OAuth genérico
- ✅ `google_drive_api_key` (para Picker)
- ✅ Tokens en `studios`

### Fase 2: Gmail (Futuro)

- Agregar `google_gmail_api_key` a `platform_config`
- Agregar scope `gmail.send` o `gmail.readonly` a OAuth
- Actualizar `google_oauth_scopes` en `studios`
- Agregar configuración en `google_integrations_config`

### Fase 3: Calendar (Futuro)

- Agregar `google_calendar_api_key` a `platform_config`
- Agregar scope `calendar` a OAuth
- Actualizar `google_oauth_scopes` en `studios`
- Agregar configuración en `google_integrations_config`

---

## 🎯 Ventajas de Esta Arquitectura

1. **OAuth Reutilizable**: Un solo Client ID para todas las APIs
2. **API Keys Específicas**: Cada servicio tiene su propia key
3. **Escalable**: Agregar nuevas APIs sin romper existentes
4. **Type-Safe**: Campos explícitos en Prisma
5. **Flexible**: JSONB para configuraciones específicas
6. **Claro**: Naming convention consistente

---

## ⚠️ Consideraciones

1. **Scopes**: Al conectar OAuth, solicitar todos los scopes necesarios:

   ```
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/calendar
   ```

2. **API Keys Opcionales**: Algunas APIs (Gmail, Calendar) pueden funcionar solo con OAuth, sin API Key

3. **Naming**: Mantener consistencia:
   - `google_oauth_*` = Genérico OAuth
   - `google_{service}_api_key` = API Key específica
   - `google_integrations_config` = Configuración por servicio

---

**Conclusión:** Usar **naming específico por servicio** (`google_drive_*`, `google_gmail_*`) para API Keys, pero **OAuth genérico** (`google_oauth_*`) que se reutiliza para todas las integraciones.
