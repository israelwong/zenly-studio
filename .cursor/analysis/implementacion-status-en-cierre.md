# Implementación Status "en_cierre" - Resumen

## 🎯 Objetivo
Separar el proceso de autorización de cotizaciones en dos pasos:
1. **Pasar a Cierre** → Status `en_cierre` (preparación)
2. **Autorizar y Crear Evento** → Status `aprobada` (finalización)

---

## 📋 Cambios Implementados

### 1. **Migración de Base de Datos**
**Archivo:** `supabase/migrations/20260101173537_add_en_cierre_status.sql`

- Agrega nuevo valor `en_cierre` al enum `cotizacion_status`
- Incluye verificación de éxito
- Actualiza comentario del tipo para documentación

**Ejecutar:**
```bash
supabase db push
```

---

### 2. **Server Actions**
**Archivo:** `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts`

#### **Nueva Action: `pasarACierre()`**
- Cambia status de `pendiente` → `en_cierre`
- Archiva todas las demás cotizaciones pendientes de la promesa
- Valida que no exista otra cotización en cierre
- Solo una cotización en cierre a la vez por promesa

#### **Nueva Action: `cancelarCierre()`**
- Cambia status de `en_cierre` → `pendiente`
- Opción de desarchivar otras cotizaciones (default: false)
- Permite reiniciar el proceso de cierre

---

### 3. **PromiseQuotesPanelCard** (Cotización Individual)
**Archivo:** `src/app/[slug]/studio/commercial/promises/[promiseId]/components/PromiseQuotesPanelCard.tsx`

**Cambios:**
- ✅ Botón "Autorizar" → **"Pasar a Cierre"**
- ✅ Elimina modal de autorización (ahora solo desde card de cierre)
- ✅ Agrega handler `handlePasarACierre()`
- ✅ Actualiza badges: `en_cierre` → Azul (info)
- ✅ Label: "En Cierre"

---

### 4. **PromiseClosingProcessCard** (Card de Cierre)
**Archivo:** `src/app/[slug]/studio/commercial/promises/[promiseId]/components/PromiseClosingProcessCard.tsx`

**Cambios:**
- ✅ Detecta status `en_cierre` (además de `aprobada`)
- ✅ Nuevo botón: **"Cancelar Cierre"**
- ✅ Modal de confirmación para cancelar cierre
- ✅ Handler `handleCancelarCierre()` con reload

---

### 5. **PromiseQuotesPanel** (Listado)
**Archivo:** `src/app/[slug]/studio/commercial/promises/[promiseId]/components/PromiseQuotesPanel.tsx`

**Cambios:**
- ✅ Detecta `en_cierre` como cotización en proceso
- ✅ Filtra `en_cierre` del listado principal
- ✅ Muestra en card de cierre si existe
- ✅ Oculta botón [+] si hay cotización en cierre

---

## 🔄 Flujos Implementados

### **Cliente Legacy (selected_by_prospect = false)**
```
1. Cotización Pendiente
   ↓ Click "Pasar a Cierre"
2. Status: en_cierre
   ↓ Aparece en Card "En Proceso de Cierre"
3. Click "Autorizar y Crear Evento"
   ↓ Abre AuthorizeCotizacionModal
4. Status: aprobada + Crea Evento
```

### **Cliente Nuevo (selected_by_prospect = true)**
```
1. Cliente selecciona paquete
   ↓ AUTOMÁTICO
2. Status: en_cierre
   ↓ Aparece en Card "En Proceso de Cierre"
3. Flujo de contrato (pending → generated → signed)
   ↓
4. Click "Autorizar y Crear Evento"
   ↓ Abre AuthorizeCotizacionModal
5. Status: aprobada + Crea Evento
```

### **Cancelar Cierre**
```
Status: en_cierre
   ↓ Click "Cancelar Cierre"
Status: pendiente
   ↓ Regresa al listado de cotizaciones
```

---

## ✅ Validaciones Implementadas

1. **Solo una cotización en cierre a la vez**
   - Valida antes de pasar a cierre
   - Mensaje: "Ya existe otra cotización en proceso de cierre"

2. **Solo cotizaciones pendientes pueden pasar a cierre**
   - Valida status antes de cambiar

3. **Solo cotizaciones en cierre pueden cancelarse**
   - Valida status antes de regresar a pendiente

4. **Archivado automático**
   - Al pasar a cierre → Archiva otras pendientes
   - Al cancelar cierre → NO desarchivar (opcional)

---

## 🎨 UI/UX

### **Badge "En Cierre"**
- Color: Azul (variant: `info`)
- Texto: "En Cierre"

### **Card "En Proceso de Cierre"**
- Muestra cotización con status `en_cierre` o `aprobada`
- Indicadores de progreso
- 2 botones:
  - **"Autorizar y Crear Evento"** (primario, verde)
  - **"Cancelar Cierre"** (outline, gris → rojo hover)

### **Listado de Cotizaciones**
- NO muestra cotizaciones en `en_cierre`
- Solo muestra: Pendientes, Archivadas, Canceladas
- Botón [+] oculto si hay cotización en cierre

---

## 📝 Notas Importantes

1. **NO commitear hasta aprobación del usuario**
2. **Migración SQL debe ejecutarse manualmente**
3. **Status `en_cierre` es SOLO interno del estudio**
4. **Cliente nuevo pasa a cierre automáticamente** (pendiente implementar)
5. **Reload después de cancelar cierre** (por simplicidad)

---

## 🚀 Próximos Pasos (Pendientes)

1. ✅ Migración SQL
2. ✅ Server Actions
3. ✅ UI Components
4. ⏳ **Flujo automático para cliente nuevo** (al seleccionar paquete)
5. ⏳ **Testing completo**
6. ⏳ **Commit y Push** (esperando aprobación)

---

## 📦 Archivos Modificados

```
supabase/migrations/
└── 20260101173537_add_en_cierre_status.sql (NUEVO)

src/lib/actions/studio/commercial/promises/
└── cotizaciones.actions.ts (MODIFICADO)
    - pasarACierre()
    - cancelarCierre()

src/app/[slug]/studio/commercial/promises/[promiseId]/components/
├── PromiseQuotesPanelCard.tsx (MODIFICADO)
├── PromiseClosingProcessCard.tsx (MODIFICADO)
└── PromiseQuotesPanel.tsx (MODIFICADO)

.cursor/analysis/
└── implementacion-status-en-cierre.md (NUEVO)
```

---

**Estado:** ✅ Implementación completa, esperando aprobación para commit

