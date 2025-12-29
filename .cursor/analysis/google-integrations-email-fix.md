# Problema: Email no se guardaba en Google OAuth Callback

## Problema Identificado

Al conectar Google Suite (Drive, Calendar, Contacts) mediante el flujo unificado OAuth, el `email` no se guardaba en la base de datos, resultando en:

- ✅ Scopes guardados correctamente
- ✅ Refresh token guardado correctamente
- ❌ Email: `null` en la base de datos
- ❌ Card de integraciones mostraba todos los servicios como "no conectados"

## Causa Raíz

En `src/lib/integrations/google/auth/unified.actions.ts`, la llamada a la API de Google UserInfo fallaba con **401 Unauthorized** porque:

1. **Método incorrecto**: Se usaba el `access_token` como query parameter:
   ```typescript
   // ❌ INCORRECTO
   fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`)
   ```

2. **Faltaban scopes**: No se solicitaban los scopes de `userinfo.email` y `userinfo.profile` en la URL de OAuth inicial.

## Solución Implementada

### 1. Corrección del método de obtención del email

```typescript
// ✅ CORRECTO - Usar header Authorization
const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
        Authorization: `Bearer ${tokens.access_token}`,
    },
});
```

### 2. Agregar scopes de userinfo a la solicitud OAuth

```typescript
// Agregar scope de userinfo para obtener email y nombre del usuario
const userInfoScopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
];
userInfoScopes.forEach((scope) => {
    if (!scopes.includes(scope)) {
        scopes.push(scope);
    }
});
```

## Resultado

Después de la corrección:

- ✅ Email se obtiene correctamente de Google: `contacto@prosocial.mx`
- ✅ Email se guarda en `studios.google_oauth_email`
- ✅ Todos los servicios se muestran como conectados en el card
- ✅ El card muestra "Gestionar (3/3)" en lugar de "Conectar Google Suite"
- ✅ Los servicios conectados aparecen marcados y deshabilitados en el modal de conexión

## Archivos Modificados

- `src/lib/integrations/google/auth/unified.actions.ts`
  - Líneas 212-226: Corrección del método de obtención del email
  - Líneas 75-85: Agregar scopes de userinfo a la solicitud OAuth

## Verificación

Los logs ahora muestran:
```
[procesarCallbackUnificado] ✅ Información del usuario obtenida: {
  email: 'contacto@prosocial.mx',
  name: '...'
}
[obtenerEstadoConexion] Datos del estudio: {
  hasRefreshToken: true,
  email: 'contacto@prosocial.mx',  // ✅ Ya no es null
  scopesParsed: [...]
}
```

## Notas Adicionales

- El problema solo afectaba al flujo unificado (`procesarCallbackUnificado`)
- Los flujos individuales (Calendar, Drive, Contacts) ya usaban el método correcto
- La solución es consistente con el patrón usado en `calendar.actions.ts` y `drive.actions.ts`

