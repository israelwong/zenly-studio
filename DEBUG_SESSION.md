# 🔍 DEBUG: AuthSessionMissingError

## PROBLEMA ACTUAL

El error `AuthSessionMissingError` aparece porque:

1. La sesión no se está guardando en localStorage
2. O las cookies no se están creando correctamente

## 🧪 VERIFICAR SESIÓN

### 1. Abrir DevTools Console y ejecutar:

```javascript
// Ver localStorage
console.log("localStorage:", localStorage.getItem("zen-auth-token"));

// Ver todas las cookies
document.cookie.split(";").forEach((c) => console.log(c.trim()));

// Intentar obtener sesión manualmente
const { createClient } = await import("@/lib/supabase/client");
const supabase = createClient();
const { data, error } = await supabase.auth.getSession();
console.log("Session:", data.session);
console.log("Error:", error);
```

### 2. Resultados esperados:

**✅ Si hay sesión:**

```javascript
localStorage: {"access_token":"eyJ...", "refresh_token":"..."}
Session: { user: {...}, access_token: "..." }
```

**❌ Si NO hay sesión:**

```javascript
localStorage: null;
Session: null;
Error: AuthSessionMissingError;
```

---

## 🔧 SOLUCIONES SEGÚN EL CASO

### CASO 1: No hay nada en localStorage

**Causa:** El login no está guardando la sesión.

**Solución:** Verificar configuración de Supabase Client.

```typescript
// src/lib/supabase/client.ts debe tener:
auth: {
  persistSession: true,      // ✅ CRÍTICO
  autoRefreshToken: true,
  storageKey: 'zen-auth-token',
}
```

### CASO 2: Hay localStorage pero getSession() falla

**Causa:** Token expirado o corrupto.

**Solución:** Hacer logout y volver a login.

### CASO 3: Solo pasa en desarrollo (Hot Reload)

**Causa:** Fast Refresh de Next.js puede desincronizar la sesión.

**Solución:** Ignorar en desarrollo, en producción no pasa.

---

## 🎯 PRUEBA DEFINITIVA

### Hacer login limpio:

1. **Limpiar todo:**

   ```javascript
   // En DevTools Console
   localStorage.clear();
   document.cookie.split(";").forEach((c) => {
     document.cookie = c
       .replace(/^ +/, "")
       .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
   });
   ```

2. **Ir a /login**

3. **Login:** `owner@demo-studio.com` / `Owner123!`

4. **Verificar inmediatamente después del redirect:**

   ```javascript
   localStorage.getItem("zen-auth-token");
   ```

5. **Resultado esperado:**
   - ✅ Debe haber un objeto JSON con `access_token`
   - ✅ UserAvatar debe aparecer
   - ✅ No debe haber errores de sesión

---

## 📊 CHECKLIST DE DIAGNÓSTICO

- [ ] localStorage tiene 'zen-auth-token'
- [ ] El token tiene `access_token` y `refresh_token`
- [ ] `supabase.auth.getSession()` retorna sesión válida
- [ ] El error solo aparece en desarrollo (Hot Reload)
- [ ] Hacer logout/login limpio funciona

---

**EJECUTA LOS COMANDOS DE VERIFICACIÓN Y REPORTA LOS RESULTADOS! 🔍**
