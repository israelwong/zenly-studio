# Auditoría: Unificación Perfil y Seguridad en /cuenta (ZEN Platform)

**Objetivo:** Preparar la fusión de las rutas de perfil y seguridad en una sola vista `/cuenta`. Solo auditoría; no se realizan cambios de código.

---

## 1. Estructura de rutas y componentes

### Rutas actuales

| Ruta | Archivo | Tipo página |
|------|---------|-------------|
| `/[slug]/studio/config/account/perfil` | `src/app/[slug]/studio/config/account/perfil/page.tsx` | Client (useState, useEffect, obtenerPerfil) |
| `/[slug]/studio/config/account/seguridad` | `src/app/[slug]/studio/config/account/seguridad/page.tsx` | Server (async, Suspense) |

### Perfil (`config/account/perfil`)

| Archivo | Rol |
|---------|-----|
| `perfil/page.tsx` | Carga perfil con `obtenerPerfil(studioSlug)`, estado local, render de `PerfilForm` o skeleton/error. |
| `perfil/components/PerfilForm.tsx` | Formulario: nombre, email, teléfono, avatar (`AvatarManager`). react-hook-form + Zod (`PerfilSchema`). Llama a `actualizarPerfil`. |
| `perfil/components/PerfilSkeleton.tsx` | Skeleton de carga. |
| `perfil/types.ts` | `PerfilData`, `PerfilFormData`. |

**Componentes reutilizables:** `ZenButton`, `ZenInput`, `Card` (shadcn), `AvatarManager`. Validación con `PerfilSchema` (perfil-schemas).

### Seguridad (`config/account/seguridad`)

| Archivo | Rol |
|---------|-----|
| `seguridad/page.tsx` | Layout: header + grid (PasswordChangeForm, SecuritySettings) + SessionsHistory a ancho completo. Suspense con `SecuritySkeleton`. |
| `seguridad/components/PasswordChangeForm.tsx` | Formulario: contraseña actual, nueva, confirmar. react-hook-form + `PasswordChangeSchema`. Llama a `cambiarPassword`. |
| `seguridad/components/SecuritySettings.tsx` | Formulario: notificaciones email, alertas dispositivos, timeout sesión (slider). `obtenerConfiguracionesSeguridad` / `actualizarConfiguracionesSeguridad`. |
| `seguridad/components/SessionsHistory.tsx` | Lista de `user_access_logs` con `obtenerHistorialAccesos`. |
| `seguridad/components/SecuritySkeleton.tsx` | Skeleton. |
| `seguridad/types.ts` | `SecuritySettings`, `AccessLog`, `PasswordChangeData`, etc. |

**Componentes reutilizables:** `ZenButton`, `ZenInput`, `Card` (shadcn). Schemas en `seguridad-schemas.ts`.

### Resumen reutilización

- **Compartidos:** `ZenButton`, `ZenInput`, `Card` (shadcn). Patrón: react-hook-form + Zod + server action por formulario.
- **Específicos de perfil:** `AvatarManager`, `useAvatarRefresh`.
- **Específicos de seguridad:** toggles custom, slider de timeout, `style jsx` en SecuritySettings.

---

## 2. Lógica de autenticación y proveedores

### Detección del método de inicio de sesión

- **No existe** en el código actual ninguna comprobación de `user.identities` ni `user.app_metadata` de Supabase para saber si el usuario tiene:
  - solo email/password,
  - solo Google, o
  - ambos vinculados.

Supabase expone en el usuario:

- `user.identities`: array de `{ provider: 'email' | 'google', ... }`.
- “Tiene contraseña” ≈ existe identidad con `provider === 'email'`.
- “Solo Google” ≈ una sola identidad con `provider === 'google'`.

Para una futura vista unificada haría falta, por ejemplo, una server action o helper que lea la sesión y devuelva `{ hasPassword: boolean, hasGoogle: boolean }` usando `user.identities`.

### “Vincular Google” cuando el usuario solo tiene email/password

- **No existe** flujo de “Vincular Google” en la app para usuarios que hoy solo tienen email/password.
- En el código solo aparecen “link” a Google en contexto de **integraciones** (Calendar, Drive en `oauth-client.actions.ts`), no para vincular la cuenta de Auth con Google.
- Para ofrecer “Vincular Google” en /cuenta habría que:
  - Detectar “solo email” (p. ej. con `user.identities`).
  - Iniciar flujo OAuth con Supabase (`signInWithOAuth({ provider: 'google' })`) en modo “link” (por ejemplo `linkIdentity` o el flujo que recomiende Supabase para añadir proveedor sin cerrar sesión).

---

## 3. Server actions

### Perfil

| Action | Archivo | Descripción |
|--------|---------|-------------|
| `obtenerPerfil(studioSlug)` | `perfil.actions.ts` | Busca estudio por slug, luego **primer `platform_leads` con `studio_id`**. Devuelve nombre, email, teléfono, avatar_url, fechas. |
| `actualizarPerfil(studioSlug, data)` | `perfil.actions.ts` | Valida con `PerfilSchema`. Actualiza **`platform_leads`** (name, email, phone, avatar_url). Si cambia email: comprueba duplicados en leads y en Auth; actualiza Supabase Auth (`admin.updateUserById`), `users` y `studio_user_profiles` en transacción. Revalida rutas perfil y studio. |

**Nota:** El “perfil de cuenta” actual está basado en **`platform_leads`** (lead asociado al estudio), no en `users` / `studio_user_profiles`. Si la intención es “perfil del usuario autenticado”, habría que alinear modelo de datos y acciones.

### Seguridad

| Action | Archivo | Descripción |
|--------|---------|-------------|
| `cambiarPassword(studioSlug, data)` | `seguridad.actions.ts` | Valida con `PasswordChangeSchema`. Verifica contraseña actual con `signInWithPassword` (cliente anon), luego `supabase.auth.updateUser({ password })`. Registra en `user_access_logs`. Revalida ruta seguridad. |
| `obtenerConfiguracionesSeguridad(studioSlug)` | `seguridad.actions.ts` | Usuario desde Supabase; `getOrCreateUser`; busca/upsert `user_security_settings`. |
| `actualizarConfiguracionesSeguridad(studioSlug, data)` | `seguridad.actions.ts` | Valida con `SecuritySettingsSchema`; upsert en `user_security_settings`; log en `user_access_logs`. |
| `obtenerHistorialAccesos(studioSlug, limit, offset)` | `seguridad.actions.ts` | Usuario desde Supabase; `users` por `supabase_id`; `user_access_logs` ordenado por fecha. |
| `cerrarTodasLasSesiones(studioSlug)` | `seguridad.actions.ts` | Definida pero no usada en la UI actual. |

### Coexistencia en una misma página

- **Perfil:** un formulario (nombre, email, teléfono, avatar); estado local + `obtenerPerfil` al montar; `actualizarPerfil` al enviar.
- **Seguridad:** tres bloques independientes (cambio de contraseña, configuraciones, historial), cada uno con su estado y sus acciones.
- No comparten estado entre sí ni esquemas: pueden vivir en la misma página sin conflictos. Único punto común: `studioSlug` y la sesión (usuario actual). Conviene mantener formularios y handlers separados al unificar.

---

## 4. Archivos implicados (resumen)

```
src/app/[slug]/studio/config/account/
├── perfil/
│   ├── page.tsx
│   ├── types.ts
│   └── components/
│       ├── index.ts
│       ├── PerfilForm.tsx
│       └── PerfilSkeleton.tsx
└── seguridad/
    ├── page.tsx
    ├── types.ts
    └── components/
        ├── index.ts
        ├── PasswordChangeForm.tsx
        ├── SecuritySettings.tsx
        ├── SecuritySkeleton.tsx
        └── SessionsHistory.tsx

src/lib/actions/
├── studio/account/
│   ├── perfil.actions.ts          # obtenerPerfil, actualizarPerfil
│   └── seguridad/
│       └── seguridad.actions.ts   # cambiarPassword, obtener/actualizar config, historial, cerrarSesiones
└── schemas/
    ├── perfil-schemas.ts          # PerfilSchema
    └── seguridad/
        └── seguridad-schemas.ts   # PasswordChangeSchema, SecuritySettingsSchema, ...
```

Componentes compartidos: `@/components/ui/zen` (ZenButton, ZenInput), `@/components/ui/shadcn/card`, `AvatarManager`, `useAvatarRefresh`.

---

## 5. Propuesta para la nueva vista `/cuenta`

### Opción A: Una sola página con secciones por encabezados (recomendada)

- **Ruta:** `/[slug]/studio/config/account/page.tsx` (o `/[slug]/studio/config/cuenta/page.tsx` si se prefiere nombre “cuenta” en la URL).
- **Estructura:**
  1. **Título único:** “Cuenta” (o “Perfil y seguridad”).
  2. **Sección “Perfil”:** mismo contenido que hoy en perfil (avatar + nombre, email, teléfono). Reutilizar `PerfilForm` (o moverlo a `account/components/`).
  3. **Sección “Seguridad”:** subsecciones con encabezados H2:
     - Cambiar contraseña → `PasswordChangeForm` (condicionado a “tiene contraseña” cuando se implemente detección).
     - Opcional: “Vincular Google” cuando solo haya email (futuro).
     - Configuraciones de seguridad → `SecuritySettings`.
     - Historial de sesiones → `SessionsHistory`.
- **Ventajas:** una sola carga, scroll lineal, sin estado de pestañas. Acción de perfil y de seguridad siguen separadas; no hay riesgo de mezclar submits.

### Opción B: Pestañas internas (Perfil | Seguridad)

- Misma ruta única; dentro de la página, tabs “Perfil” y “Seguridad”.
- En “Perfil”: contenido actual de perfil.
- En “Seguridad”: grid actual (cambio contraseña + config + historial).
- Útil si se quiere acortar la página o agrupar mucho más contenido más adelante.

### Recomendación

- **Opción A** (secciones con encabezados): menos cambios, reutilización directa de los cuatro bloques (PerfilForm, PasswordChangeForm, SecuritySettings, SessionsHistory), y coherente con “una sola vista /cuenta”.
- Añadir después:
  - Server action o datos en layout/página que expongan `hasPassword` / `hasGoogle` (desde `user.identities`).
  - En la sección de contraseña: si `!hasPassword`, ocultar formulario de “Cambiar contraseña” y mostrar mensaje tipo “Inicias sesión con Google” o futuro “Establecer contraseña” / “Vincular Google”.

---

## 6. Pendientes y riesgos

| Tema | Estado | Acción sugerida |
|------|--------|-----------------|
| Origen del perfil | Perfil actual = primer `platform_leads` del estudio | Definir si “cuenta” debe ser usuario (`users` + `studio_user_profiles`) o seguir con lead; alinear `obtenerPerfil` / `actualizarPerfil` y tipos. |
| Detección de proveedores | No implementada | Añadir lectura de `user.identities` (y opcionalmente `app_metadata`) para condicionar UI de contraseña y “Vincular Google”. |
| Vincular Google | No existe | Diseñar flujo OAuth de vinculación (Supabase) y enlace en /cuenta cuando el usuario solo tenga email. |
| Seguridad: `SecuritySettings` | Usa `style jsx` | Valorar migrar a Tailwind o CSS módulo para consistencia. |
| `cerrarTodasLasSesiones` | No usada en UI | Si se desea “Cerrar otras sesiones”, enlazar desde la nueva vista cuenta. |

---

*Documento generado como entregable de la auditoría. No incluye cambios de código.*
