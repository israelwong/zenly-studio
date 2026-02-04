# 🔍 FORENSIC DEBUG: Contract Visibility Issue

**Fecha:** 2026-02-04  
**Problema:** Contrato no visible después de "Define", pero sí después de "Regenerate"

---

## 🎯 CAUSA RAÍZ IDENTIFICADA

### Problema
La función `actualizarContratoCierre` intenta renderizar automáticamente el contrato en la primera asociación de template. Si el renderizado **falla silenciosamente**, guarda:

```typescript
{
  contract_template_id: "xxx",     // ✅ Template ID presente
  contract_content: null,           // ❌ NULL por error de renderizado
  contrato_definido: true,          // ✅ Marcado como definido
  contract_version: 1
}
```

### ¿Por qué no se ve en la vista pública?

El componente cliente (`PublicQuoteAuthorizedView.tsx` línea 147) verifica:

```typescript
const hasContract = !!currentContract?.content;
```

Si `content` es `null`, `hasContract = false` → Muestra mensaje "Contrato en preparación"

### ¿Por qué funciona con "Regenerate"?

`regenerarContratoCierre`:
1. Valida PRIMERO que ya exista un contrato definido
2. Renderiza con validaciones previas
3. GARANTIZA que `contract_content` tenga valor
4. Nunca guarda con `content: null`

---

## ✅ FIXES APLICADOS

### 1. Logging Mejorado (cotizaciones-cierre.actions.ts)

**Antes:** Errores capturados con `console.warn` (silenciosos)

**Después:** Errores críticos con contexto completo:

```typescript
console.error(
  '[actualizarContratoCierre] ❌ ERROR CRÍTICO: Renderizado falló:',
  renderResult.error,
  'cotizacionId:', cotizacionId,
  'templateId:', templateId
);
```

Esto revelará:
- ¿Falla al obtener la plantilla?
- ¿Falla al obtener datos del contrato?
- ¿Falla el renderizado?

### 2. Validación de Estado (cotizaciones-cierre.actions.ts)

**Antes:**
```typescript
contrato_definido: true,  // Siempre true aunque no haya contenido
```

**Después:**
```typescript
const shouldMarkAsDefinido = !!finalContentToSave || !!templateId;
contrato_definido: shouldMarkAsDefinido,  // Solo true si hay contenido O template
```

**Impacto:** Evita marcar como "definido" si no hay ningún dato útil.

### 3. Debug Logging Cliente (PublicQuoteAuthorizedView.tsx)

Agregado console.log para verificar qué datos llegan:

```typescript
console.log('[PublicQuoteAuthorizedView] 🔍 DEBUG Contract Data:', {
  hasContract,
  hasContractTemplate,
  hasContent: !!currentContract?.content,
  templateId: currentContract?.template_id,
  version: currentContract?.version,
  status: cotizacion.status,
  isEnCierre,
});
```

---

## 🧪 PRÓXIMOS PASOS DE TESTING

### Test 1: Reproducir el Problema
1. Ir a una promesa en estado "en_cierre"
2. Hacer clic en "Define Contract"
3. Seleccionar un template
4. Hacer clic en "Save"
5. **Revisar console del servidor** (terminal donde corre `npm run dev`)
6. Buscar logs con `❌ ERROR CRÍTICO`

### Test 2: Verificar Vista Pública
1. Abrir la vista pública del cliente
2. **Revisar console del navegador**
3. Buscar log: `🔍 DEBUG Contract Data`
4. Verificar valores:
   - `hasContent: false` → Confirma que no hay contenido
   - `templateId: "xxx"` → Template está definido
   - `status: "en_cierre"` → Estado correcto

### Test 3: Confirmar Fix con Regenerate
1. En el estudio, hacer clic en "Regenerate Contract"
2. Revisar si ahora aparece el contrato en la vista pública
3. El log debería mostrar: `hasContent: true`

---

## 🎓 LECCIONES APRENDIDAS

### 1. No capturar errores silenciosamente
**Malo:**
```typescript
} catch (error) {
  console.warn('Error:', error);  // Usuario no sabe que falló
  // continuar con null
}
```

**Bueno:**
```typescript
} catch (error) {
  console.error('❌ ERROR CRÍTICO:', error, { contexto });
  // Decidir: ¿Fallar rápido o continuar con null?
}
```

### 2. Estados intermedios vs finales
Si un proceso tiene múltiples pasos (obtener template → renderizar → guardar), no marcar como "completado" hasta que TODOS los pasos terminen exitosamente.

### 3. Separación de concerns
El renderizado automático en `actualizarContratoCierre` añade complejidad. Considerar:
- `definirContrato()` → Solo asocia template
- `generarContenidoContrato()` → Renderiza contenido
- `regenerarContrato()` → Re-renderiza (ya existe)

---

## 📌 HIPÓTESIS DE ERROR MÁS PROBABLE

Basado en el código, el renderizado automático puede fallar si:

1. **No se proporciona `promiseId`** (línea 748):
   ```typescript
   if (!contentToSave && finalPromiseId) {
     // Solo intenta renderizar si hay promiseId
   }
   ```

2. **Falla `getPromiseContractData`** (línea 777-782):
   - Promesa no encontrada
   - Datos de contacto incompletos
   - Condiciones comerciales mal formadas

3. **Falla `renderContractContent`** (línea 786-790):
   - Template con variables no resueltas
   - Error en el template engine

**Solución Propuesta:**
Si el renderizado falla en "Define", NO guardar nada y retornar error explícito al usuario:

```typescript
if (!finalContentToSave) {
  return {
    success: false,
    error: 'No se pudo generar el contenido del contrato. Verifica que todos los datos estén completos.',
  };
}
```

---

## 🔧 TESTING CHECKLIST

- [ ] Reproducir el problema con "Define"
- [ ] Capturar logs de error del servidor
- [ ] Verificar datos del contrato en vista pública (browser console)
- [ ] Confirmar que "Regenerate" soluciona el problema
- [ ] Identificar error específico en los logs
- [ ] Implementar fix basado en el error encontrado
- [ ] Remover console.log de debug después de resolver

---

**Estado:** DEBUGGING EN PROGRESO  
**Siguiente Acción:** Ejecutar tests y capturar logs de error
