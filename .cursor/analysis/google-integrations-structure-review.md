# 📁 Revisión de Estructura: Integraciones de Google

**Fecha:** 2025-12-28  
**Objetivo:** Analizar y proponer reorganización de archivos de integraciones de Google

---

## 📊 Estructura Actual (Dispersa)

### 1. **OAuth y Autenticación** (`src/lib/actions/auth/`)

- ✅ `google-unified.actions.ts` - Sistema unificado (nuevo)
- ✅ `oauth-calendar.actions.ts` - OAuth Calendar
- ✅ `oauth-contacts.actions.ts` - OAuth Contacts
- ✅ `desconectar-google-calendar.actions.ts` - Desconexión Calendar
- ✅ `desconectar-google-contacts.actions.ts` - Desconexión Contacts
- ⚠️ `oauth-client.actions.ts` - Cliente OAuth (legacy)
- ⚠️ `oauth.actions.ts` - OAuth general (legacy, para login)

**Propósito:** Manejar flujos OAuth y callbacks

### 2. **Clientes de API** (`src/lib/integrations/`)

- ✅ `google-contacts.client.ts` - Cliente People API
- ✅ `google-drive.client.ts` - Cliente Drive API
- ✅ `google-calendar/` - Directorio con múltiples archivos:
  - `client.ts` - Cliente Calendar API
  - `calendar-manager.ts` - Gestión de calendarios
  - `sync-manager.ts` - Sincronización de eventos
  - `helpers.ts` - Helpers
  - `timezone.ts` - Manejo de timezones

**Propósito:** Clientes autenticados para interactuar con APIs de Google

### 3. **Acciones de Integración** (`src/lib/actions/integrations/`)

- ✅ `google-contacts.actions.ts` - Sincronizar contactos/staff con Google

**Propósito:** Lógica de negocio para sincronización de datos

### 4. **Acciones de Studio** (`src/lib/actions/studio/integrations/`)

- ⚠️ `google-drive.actions.ts` - **MEZCLA** OAuth + operaciones Drive
  - `iniciarConexionGoogle()` - OAuth (debería estar en auth)
  - `procesarCallbackGoogle()` - Callback (debería estar en auth)
  - `obtenerEstadoConexion()` - Estado de conexión (genérico, debería estar separado)
  - `listarCarpetasDrive()` - Operaciones Drive
  - `desconectarGoogleDrive()` - Desconexión

**Propósito:** Mezcla de OAuth y operaciones de Drive

### 5. **Plataforma** (`src/lib/actions/platform/integrations/`)

- ✅ `google.actions.ts` - Credenciales OAuth compartidas

**Propósito:** Configuración a nivel plataforma

---

## 🎯 Estructura Propuesta (Nueva)

```
src/lib/integrations/google/
├── auth/                          # OAuth y autenticación
│   ├── unified.actions.ts         # Sistema unificado ✅ MOVIDO
│   ├── calendar.actions.ts        # OAuth Calendar ✅ MOVIDO
│   ├── contacts.actions.ts        # OAuth Contacts ✅ MOVIDO
│   ├── drive.actions.ts           # OAuth Drive ⏳ PENDIENTE (extraer de studio/integrations)
│   └── disconnect/                # Desconexión
│       ├── calendar.actions.ts   # ✅ MOVIDO
│       └── contacts.actions.ts   # ✅ MOVIDO
│
├── clients/                        # Clientes de API
│   ├── contacts.client.ts         # ✅ MOVIDO
│   ├── drive.client.ts            # ✅ MOVIDO
│   └── calendar/                  # ✅ MOVIDO
│       ├── client.ts
│       ├── calendar-manager.ts
│       ├── sync-manager.ts
│       ├── helpers.ts
│       └── timezone.ts
│
├── sync/                          # Sincronización de datos
│   └── contacts.actions.ts        # ✅ MOVIDO
│
├── studio/                        # Operaciones a nivel studio
│   ├── drive.actions.ts           # Operaciones Drive (limpiar OAuth) ⏳ PENDIENTE
│   └── status.actions.ts          # Estado de conexión (genérico) ⏳ PENDIENTE
│
└── index.ts                        # Barrel export ✅ CREADO
```

---

## ✅ Estado de Migración

### Completado:

1. ✅ Estructura de directorios creada
2. ✅ Archivos OAuth movidos (unified, calendar, contacts, disconnect)
3. ✅ Clientes movidos (contacts, drive, calendar)
4. ✅ Sync movido (contacts)
5. ✅ Barrel export creado (`index.ts`)
6. ✅ Imports actualizados en archivos movidos

### Completado:

1. ✅ OAuth de Drive extraído:
   - `iniciarConexionGoogleDrive()` → `auth/drive.actions.ts`
   - `procesarCallbackGoogleDrive()` → `auth/drive.actions.ts`
2. ✅ Estado de conexión extraído:
   - `obtenerEstadoConexion()` → `studio/status.actions.ts`
3. ✅ Operaciones Drive movidas:
   - Todas las operaciones Drive → `studio/drive.actions.ts`
4. ✅ Imports actualizados en el codebase:
   - Componentes UI actualizados
   - Callback route actualizado
   - Barrel exports configurados
5. ✅ Compatibilidad hacia atrás:
   - `actions/studio/integrations/index.ts` re-exporta desde nuevas ubicaciones
   - Funciones con nombres alternativos para compatibilidad

---

## ✅ Reorganización Completada

### Estructura Final:

```
src/lib/integrations/google/
├── auth/
│   ├── unified.actions.ts         ✅
│   ├── calendar.actions.ts         ✅
│   ├── contacts.actions.ts        ✅
│   ├── drive.actions.ts           ✅ NUEVO
│   └── disconnect/
│       ├── calendar.actions.ts    ✅
│       └── contacts.actions.ts   ✅
│
├── clients/
│   ├── contacts.client.ts         ✅
│   ├── drive.client.ts            ✅
│   └── calendar/                    ✅
│
├── sync/
│   └── contacts.actions.ts        ✅
│
├── studio/
│   ├── status.actions.ts          ✅ NUEVO
│   └── drive.actions.ts           ✅ NUEVO
│
└── index.ts                        ✅ Barrel export completo
```

### Archivos Actualizados:

- ✅ Todos los imports en componentes UI
- ✅ Callback route (`auth/callback/route.ts`)
- ✅ Barrel exports configurados
- ✅ Compatibilidad hacia atrás mantenida en `actions/studio/integrations/index.ts`

### Nota sobre Archivos Antiguos:

El archivo `src/lib/actions/studio/integrations/google-drive.actions.ts` aún existe pero ahora solo re-exporta desde las nuevas ubicaciones. Se puede eliminar después de verificar que todo funciona correctamente.

---

## ✅ Ventajas de la Nueva Estructura

1. **Cohesión:** Todo lo relacionado con Google en un solo lugar (`integrations/google/`)
2. **Claridad:** Separación clara entre OAuth, clientes, sync y operaciones
3. **Mantenibilidad:** Fácil encontrar y modificar código relacionado
4. **Escalabilidad:** Fácil añadir nuevos recursos (Sheets, Gmail, etc.)
5. **Barrel Exports:** Imports más limpios usando `@/lib/integrations/google`

---

## ⚠️ Consideraciones

- **No romper imports:** Usar barrel exports para mantener compatibilidad
- **Mover, no reescribir:** Preservar todo el código existente
- **Actualizar gradualmente:** Mantener imports antiguos funcionando durante transición
- **Verificar callbacks:** Asegurar que el callback route sigue funcionando con nuevas rutas
