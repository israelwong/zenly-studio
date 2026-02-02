# Verificación: Guardar/Actualizar Cotización

> **Fecha:** 2026-01-27  
> **Ruta:** `/src/app/[slug]/studio/commercial/promises/[promiseId]/cotizacion`  
> **Objetivo:** Verificar que al guardar o actualizar se redirige correctamente

---

## ✅ Resumen de Verificación

### Estado: **FUNCIONA CORRECTAMENTE**

**Hallazgos:**
- ✅ Las acciones de servidor revalidan correctamente
- ✅ Los redirects funcionan según el contexto
- ✅ Se usa `startTransition` para navegación no bloqueante
- ✅ Se llama `router.refresh()` después de navegar
- ⚠️ Un pequeño ajuste recomendado en el manejo de `onAfterSave`

---

## 1. Crear Cotización (Nueva)

### 1.1 Flujo de Guardado

**Ubicación:** `CotizacionForm.tsx:847-891`

**Estado actual:**
```typescript
const result = await createCotizacion({...});

if (!result.success) {
  toast.error(result.error || 'Error al crear cotización');
  return;
}

toast.success('Cotización creada exitosamente');
window.dispatchEvent(new CustomEvent('close-overlays'));

if (redirectOnSuccess) {
  startTransition(() => {
    router.push(redirectOnSuccess);
    router.refresh();
  });
} else if (promiseId) {
  startTransition(() => {
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    router.refresh();
  });
} else {
  startTransition(() => {
    router.back();
    router.refresh();
  });
}
```

**Análisis:**
- ✅ **Correcto:** Maneja errores y muestra toast
- ✅ **Correcto:** Cierra overlays antes de navegar
- ✅ **Correcto:** Usa `startTransition` para navegación no bloqueante
- ✅ **Correcto:** Llama `router.refresh()` después de navegar
- ✅ **Correcto:** Prioridad de redirect: `redirectOnSuccess` > `promiseId` > `router.back()`

**Revalidación en servidor:**
```typescript
// createCotizacion (línea 196)
revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises`);
```
- ✅ **Correcto:** Revalida la ruta de promises

**Redirect desde NuevaCotizacionClient:**
```typescript
// NuevaCotizacionClient.tsx:55
redirectOnSuccess={`/${studioSlug}/studio/commercial/promises/${promiseId}`}
```
- ✅ **Correcto:** Pasa `redirectOnSuccess` explícito

---

## 2. Actualizar Cotización (Editar)

### 2.1 Flujo de Actualización

**Ubicación:** `CotizacionForm.tsx:743-794`

**Estado actual:**
```typescript
const result = await updateCotizacion({...});

if (!result.success) {
  toast.error(result.error || 'Error al actualizar cotización');
  return;
}

toast.success('Cotización actualizada exitosamente');

if (onAfterSave) {
  onAfterSave();
  return; // ⚠️ Retorna sin resetear loading
}

window.dispatchEvent(new CustomEvent('close-overlays'));

if (redirectOnSuccess) {
  startTransition(() => {
    router.push(redirectOnSuccess);
    router.refresh();
  });
} else if (promiseId) {
  startTransition(() => {
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    router.refresh();
  });
} else {
  startTransition(() => {
    router.back();
    router.refresh();
  });
}
```

**Análisis:**
- ✅ **Correcto:** Maneja errores y muestra toast
- ⚠️ **Mejorable:** Cuando hay `onAfterSave`, retorna sin resetear `loading`
- ✅ **Correcto:** Si no hay `onAfterSave`, maneja redirects correctamente
- ✅ **Correcto:** Usa `startTransition` y `router.refresh()`

**Revalidación en servidor:**
```typescript
// updateCotizacion (líneas 1564-1567)
revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises`);
revalidateTag(`quote-detail-${validatedData.cotizacion_id}`, 'max');
if (cotizacion.promise_id) {
  revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises/${cotizacion.promise_id}`);
}
```
- ✅ **Correcto:** Revalida múltiples rutas y tags

**Redirect desde EditarCotizacionClient:**
```typescript
// EditarCotizacionClient.tsx:240-241
redirectOnSuccess={fromCierre ? undefined : `/${studioSlug}/studio/commercial/promises/${promiseId}`}
onAfterSave={fromCierre ? () => router.back() : undefined}
```
- ✅ **Correcto:** Maneja caso especial de `fromCierre` con `onAfterSave`

---

## 3. Casos Especiales

### 3.1 Desde Cierre (`fromCierre`)

**Estado actual:**
```typescript
// EditarCotizacionClient.tsx:240-241
redirectOnSuccess={fromCierre ? undefined : `/${studioSlug}/studio/commercial/promises/${promiseId}`}
onAfterSave={fromCierre ? () => router.back() : undefined}
```

**Análisis:**
- ✅ **Correcto:** Si viene de cierre, usa `onAfterSave` con `router.back()`
- ✅ **Correcto:** Si no viene de cierre, usa `redirectOnSuccess` normal

### 3.2 Botón Atrás

**Estado actual:**
```typescript
// EditarCotizacionClient.tsx:154-164
onClick={() => {
  window.dispatchEvent(new CustomEvent('close-overlays'));
  startTransition(() => {
    if (fromCierre) {
      router.back();
    } else {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    }
  });
}}
```

**Análisis:**
- ✅ **Correcto:** Maneja `fromCierre` con `router.back()`
- ✅ **Correcto:** Si no viene de cierre, navega explícitamente

---

## 4. Recomendación Menor

### 4.1 Manejo de Loading en `onAfterSave`

**Problema detectado:**
```typescript
if (onAfterSave) {
  onAfterSave();
  return; // ⚠️ Retorna sin resetear loading
}
```

**Recomendación:**
El callback `onAfterSave` debería manejar el reset del loading si es necesario. Sin embargo, como el componente se desmonta después de navegar, no es crítico.

**Opción 1 (Actual - Aceptable):**
- Dejar que el componente se desmonte y el cleanup resetee el estado

**Opción 2 (Más explícito):**
```typescript
if (onAfterSave) {
  await onAfterSave();
  // El callback puede manejar la navegación
  return;
}
```

**Prioridad:** 🟢 Baja (no es crítico)

---

## 5. Checklist de Verificación

### ✅ Funcionalidad Correcta

- [x] **Crear cotización:** Redirige correctamente a detalle de promesa
- [x] **Actualizar cotización:** Redirige correctamente según contexto
- [x] **Desde cierre:** Usa `router.back()` correctamente
- [x] **Revalidación:** Las acciones revalidan rutas correctas
- [x] **Navegación:** Usa `startTransition` para no bloquear
- [x] **Refresh:** Llama `router.refresh()` después de navegar
- [x] **Overlays:** Cierra overlays antes de navegar
- [x] **Errores:** Maneja errores y muestra toasts

### ⚠️ Mejoras Opcionales

- [ ] **Loading state:** Considerar resetear loading en `onAfterSave` si el callback no navega

---

## 6. Conclusión

**Estado:** ✅ **FUNCIONA CORRECTAMENTE**

Los redirects y actualizaciones funcionan correctamente. El código:
- Maneja todos los casos de uso (crear, actualizar, desde cierre)
- Revalida correctamente las rutas en el servidor
- Usa `startTransition` para navegación no bloqueante
- Cierra overlays antes de navegar
- Maneja errores apropiadamente

**No se requieren cambios críticos.** El único punto menor es el manejo de `loading` cuando se usa `onAfterSave`, pero no es crítico ya que el componente se desmonta después de navegar.

---

**Última actualización:** 2026-01-27  
**Mantenedor:** Verificación Cotización Guardar/Actualizar
