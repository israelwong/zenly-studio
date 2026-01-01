# Análisis: Fuentes de Datos para Formulario "Completar Datos del Estudio"

## Contexto del Usuario

El usuario quiere que independientemente de dónde obtengamos los datos para sugerir, **siempre se escriban y guarden los valores**. El objetivo es facilitar que el usuario no vuelva a escribir datos que ya existen en el sistema.

## Flujos de Registro Identificados

### 1. Registro Manual (Email/Password)

**Paso 1: `createAuthUser`** (`src/lib/actions/auth/signup.actions.ts`)
- Captura: `email`, `password`, `full_name`, `phone`
- Guarda en: `studio_user_profiles` (email, full_name)
- Metadata en Supabase Auth: `full_name`, `phone`

**Paso 2: `createStudioAndSubscription`**
- Captura: `studio_name`, `studio_slug`, `studio_slogan`, `logo_url`
- Guarda en: `studios` (studio_name, slug)
- **NO captura**: dirección, teléfono del estudio, correo del estudio

### 2. Registro con Google OAuth

**`procesarUsuarioOAuth`** (`src/lib/actions/auth/oauth.actions.ts`)
- Extrae de Google: `email`, `full_name`, `avatar_url`
- Guarda en: `users` y `studio_user_profiles`
- **NO captura**: phone, dirección inicialmente
- Si no tiene studio → necesita onboarding (`setup-studio`)

### 3. Setup Studio (Onboarding)

**`setup-studio/page.tsx`**
- Captura: `studio_name`, `studio_slug`, `studio_slogan`
- **NO captura**: dirección, teléfono, correo del estudio

## Fuentes de Datos Disponibles

### Fuente 1: `studios` (Datos del Estudio)
```typescript
{
  studio_name: string,        // ✅ Disponible
  email: string,              // ✅ Disponible (único)
  address: string | null,     // ✅ Disponible (puede ser null)
  phone: string | null,      // ✅ Disponible (nuevo campo, puede ser null)
  representative_name: string | null  // ✅ Disponible (nuevo campo)
}
```

### Fuente 2: `platform_leads` (Perfil del Usuario/Lead)
```typescript
{
  name: string,              // ✅ Disponible
  email: string,             // ✅ Disponible
  phone: string | null,      // ✅ Disponible (puede ser null)
  // NO tiene: address
}
```
**Acceso**: `obtenerPerfil(studioSlug)` en `src/lib/actions/studio/account/perfil.actions.ts`

### Fuente 3: `users` (Usuario Autenticado)
```typescript
{
  email: string,             // ✅ Disponible
  full_name: string | null,  // ✅ Disponible
  // NO tiene: phone, address
}
```
**Acceso**: A través de Supabase Auth o `studio_user_profiles.supabase_id`

### Fuente 4: `studio_user_profiles` (Perfil del Usuario en el Studio)
```typescript
{
  email: string,             // ✅ Disponible
  full_name: string | null,  // ✅ Disponible
  // NO tiene: phone, address
}
```

### Fuente 5: Google OAuth Metadata (Si está conectado)
```typescript
{
  email: string,            // ✅ Disponible (google_oauth_email en studios)
  name: string,             // ✅ Disponible (google_oauth_name en studios)
  // NO tiene: phone, address
}
```
**Acceso**: `studios.google_oauth_email`, `studios.google_oauth_name`

## Mapeo de Campos del Formulario

### Campo: Nombre del Estudio
- **Siempre editable** (sin checkbox)
- **Fuente inicial**: `studios.studio_name`
- **Valor por defecto**: `studio.studio_name`

### Campo: Nombre del Representante Legal
- **Siempre editable** (sin checkbox)
- **Fuente inicial**: `studios.representative_name`
- **Valor por defecto**: `studio.representative_name || ""`

### Campo: Dirección
- **Editable con checkbox**
- **Fuentes posibles**:
  1. `studios.address` (si existe)
- **Checkbox**: "Usar la dirección del estudio"
- **Valor por defecto**: `studio.address || ""`
- **Lógica**: Si checkbox marcado → readonly con valor de `studio.address`

### Campo: Correo
- **Editable con radio buttons**
- **Fuentes posibles**:
  1. `studios.email` (correo del estudio)
  2. `platform_leads.email` (correo del perfil del usuario)
  3. `studios.google_oauth_email` (correo de Google si está conectado)
- **Opciones**:
  - "Usar el correo del estudio" → `studio.email` readonly
  - "Usar el correo de mi perfil" → `platform_leads.email` readonly
  - "Usar el correo de Google" → `studio.google_oauth_email` readonly (solo si está conectado)
  - "Usar otro correo" → editable
- **Valor por defecto**: `studio.email` (siempre existe)
- **Lógica**: Solo una opción puede estar seleccionada

### Campo: Teléfono
- **Editable con radio buttons**
- **Fuentes posibles**:
  1. `studios.phone` (teléfono del estudio - nuevo campo)
  2. `platform_leads.phone` (teléfono del perfil del usuario)
- **Opciones**:
  - "Usar el teléfono del estudio" → `studio.phone` readonly (solo si existe)
  - "Usar el teléfono de mi perfil" → `platform_leads.phone` readonly (solo si existe)
  - "Usar otro teléfono" → editable
- **Valor por defecto**: `studio.phone || platform_leads.phone || ""`
- **Lógica**: Solo una opción puede estar seleccionada. Si no hay datos en ninguna fuente, solo mostrar "Usar otro teléfono"

## Estrategia de Obtención de Datos

### Función: `getStudioContractDataWithSources`

```typescript
interface StudioContractDataSources {
  // Datos del estudio
  studio: {
    studio_name: string;
    email: string;
    address: string | null;
    phone: string | null;
    representative_name: string | null;
    google_oauth_email: string | null;
    google_oauth_name: string | null;
  };
  // Datos del perfil del usuario
  profile: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}
```

**Lógica**:
1. Obtener datos del estudio (incluyendo `google_oauth_email` y `google_oauth_name`)
2. Obtener datos del perfil con `obtenerPerfil(studioSlug)`
3. Retornar todas las fuentes disponibles
4. El componente frontend decide qué mostrar según disponibilidad

## Lógica del Componente Frontend

### Inicialización

1. Cargar todas las fuentes de datos
2. Para cada campo, determinar valor inicial y opciones disponibles:
   - **Dirección**: Si `studio.address` existe → mostrar checkbox "Usar dirección del estudio"
   - **Correo**: 
     - Siempre mostrar "Usar correo del estudio" (siempre existe)
     - Si `profile.email` existe y es diferente → mostrar "Usar correo de mi perfil"
     - Si `studio.google_oauth_email` existe y es diferente → mostrar "Usar correo de Google"
   - **Teléfono**:
     - Si `studio.phone` existe → mostrar "Usar teléfono del estudio"
     - Si `profile.phone` existe → mostrar "Usar teléfono de mi perfil"

### Comportamiento de Checkboxes/Radio Buttons

1. **Al marcar una opción**:
   - Copiar valor de la fuente al campo
   - Hacer campo readonly
   - Desmarcar otras opciones (si son mutuamente exclusivas)

2. **Al desmarcar**:
   - Limpiar el valor del campo
   - Hacer campo editable
   - Permitir que el usuario ingrese nuevo valor

3. **Al guardar**:
   - Guardar el valor actual del campo (independientemente del origen)
   - Los valores readonly también se guardan

## Consideraciones Técnicas

### Validación

- Todos los campos son obligatorios para generar contratos
- Si el usuario marca un checkbox y luego lo desmarca sin ingresar valor → error de validación
- Los valores readonly también deben pasar validación

### Persistencia

- Los valores se guardan en `studios`:
  - `studio_name` → `studios.studio_name`
  - `representative_name` → `studios.representative_name`
  - `address` → `studios.address`
  - `email` → `studios.email` (⚠️ puede cambiar el email del estudio)
  - `phone` → `studios.phone`

### Edge Cases

1. **Estudio sin dirección pero perfil con dirección**: No aplica, perfil no tiene dirección
2. **Estudio sin teléfono pero perfil con teléfono**: Mostrar opción "Usar teléfono de mi perfil"
3. **Estudio sin correo**: No puede pasar (email es obligatorio en creación)
4. **Usuario sin perfil**: `obtenerPerfil` puede retornar null → no mostrar opciones de perfil
5. **Google no conectado**: No mostrar opción "Usar correo de Google"

## Implementación Propuesta

### 1. Extender `getStudioContractData`

```typescript
export interface StudioContractDataWithSources extends StudioContractData {
  sources: {
    studio: {
      email: string;
      address: string | null;
      phone: string | null;
      google_oauth_email: string | null;
    };
    profile: {
      email: string;
      phone: string | null;
    } | null;
  };
}
```

### 2. Componente Frontend

- Estado para cada campo: `value`, `source`, `isReadonly`
- Radio buttons condicionales según disponibilidad de datos
- Lógica de sincronización: cuando cambia source → actualizar value y readonly

### 3. Validación

- Validar que todos los campos tengan valor antes de guardar
- Si un campo está readonly pero vacío → error

## Preguntas Finales

1. ✅ **Nombre del estudio**: Siempre editable (confirmado)
2. ✅ **Checks mutuamente exclusivos**: Radio buttons (confirmado)
3. ✅ **Desmarcar limpia valor**: Sí (confirmado)
4. ✅ **Mostrar check del perfil si estudio no tiene datos**: Sí (confirmado)
5. ⚠️ **¿Qué pasa si cambiamos `studios.email`?**: ¿Esto afecta la autenticación? (Revisar si email es clave única)

## Recomendación Final

✅ **Implementar con la estrategia propuesta**:
- Obtener todas las fuentes de datos disponibles
- Mostrar opciones condicionalmente según disponibilidad
- Siempre escribir y guardar valores (independientemente del origen)
- Usar radio buttons para opciones mutuamente exclusivas
- Limpiar valor al desmarcar

