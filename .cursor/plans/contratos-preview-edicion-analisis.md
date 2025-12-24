# 📋 Contratos - Análisis de Preview y Edición

**Fecha:** 2025-01-29  
**Contexto:** Unificar estilos de preview y mejorar flujo de edición de contratos

---

## 🔍 Problemas Identificados

### 1. Estilos de Preview Duplicados

**Situación actual:**
- `EventContractViewModal`: Usa `.contract-preview-modal` con estilos inline
- `ContractPreview` (config/contratos): Usa `.contract-preview` con estilos inline
- `ContractVersionsModal`: Usa `.contract-preview` **SIN estilos** ❌
- Página del cliente: Usa `.contract-preview` con estilos inline duplicados

**Impacto:**
- Inconsistencia visual entre modales
- Código duplicado (mismo CSS en 4+ lugares)
- Mantenimiento difícil

### 2. Flujo de Edición Confuso

**Situación actual:**

```
handleEditClick → ContractTemplateSelectorModal → ContractPreviewModal → generateEventContract
                                                                          ❌ Error: "Ya existe un contrato"
```

**Problemas:**
- "Editar" abre selector de plantillas (no editor de contenido)
- Al seleccionar nueva plantilla, intenta crear contrato nuevo
- No hay opción clara para editar el contenido del contrato actual
- `handleEditContract` existe pero no se usa desde el menú

**Flujos actuales:**
1. **Editar (menú)**: Abre selector de plantillas → Preview → Intenta generar (falla)
2. **Editar (desde view modal)**: Abre `ContractEditorModal` con contenido actual ✅

### 3. Cambio de Plantilla vs Edición de Contenido

**Confusión:**
- ¿"Editar" significa cambiar plantilla o editar contenido?
- Actualmente solo permite cambiar plantilla
- No hay forma directa de editar el contenido renderizado

---

## 🎯 Solución Propuesta

### Opción A: Unificar Preview + Separar Acciones (RECOMENDADA)

#### 1. Crear componente unificado de estilos

```typescript
// src/lib/utils/contract-styles.ts
export const CONTRACT_PREVIEW_STYLES = `
  .contract-preview {
    color: rgb(161 161 170);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .contract-preview h1 {
    font-size: 1.5rem !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    margin-top: 1.5rem !important;
    margin-bottom: 1rem !important;
    color: rgb(244, 244, 245) !important;
    text-transform: uppercase;
  }
  .contract-preview h1:first-child {
    margin-top: 0 !important;
  }
  .contract-preview h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: rgb(244 244 245);
  }
  .contract-preview h3 {
    font-size: 1.125rem;
    font-weight: 500;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
    color: rgb(212 212 216);
  }
  .contract-preview p {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    line-height: 1.6;
    color: rgb(161 161 170);
  }
  .contract-preview ul,
  .contract-preview ol {
    list-style-position: outside;
    padding-left: 1.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    color: rgb(161 161 170);
  }
  .contract-preview ul {
    list-style-type: disc;
  }
  .contract-preview ol {
    list-style-type: decimal;
  }
  .contract-preview ul li,
  .contract-preview ol li {
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
    padding-left: 0.5rem;
    line-height: 1.5;
    display: list-item;
  }
  .contract-preview strong {
    font-weight: 600;
    color: rgb(228 228 231);
  }
  .contract-preview em {
    font-style: italic;
    color: rgb(113 113 122);
  }
  .contract-preview blockquote {
    margin: 0.5rem 0;
    padding-left: 1rem;
    border-left: 2px solid rgb(63 63 70);
    color: rgb(161 161 170);
  }
`;
```

#### 2. Separar acciones en el menú

**Menú actual:**
```
Editar → Abre selector de plantillas
```

**Menú propuesto:**
```
Editar contenido → Abre ContractEditorModal con contenido actual
Cambiar plantilla → Abre selector de plantillas → Actualiza contrato existente
```

#### 3. Corregir flujo de cambio de plantilla

**Actual:**
```typescript
ContractPreviewModal → generateEventContract → ❌ Error
```

**Propuesto:**
```typescript
ContractPreviewModal → updateEventContract (con nueva plantilla renderizada) → ✅
```

#### 4. Unificar preview en todos los modales

- `ContractVersionsModal`: Agregar estilos
- `EventContractViewModal`: Usar estilos unificados
- `ContractPreviewModal`: Ya usa `ContractPreview` (tiene estilos)
- Página del cliente: Usar estilos unificados

---

## 📝 Cambios Específicos

### 1. Crear utilidad de estilos

**Archivo:** `src/lib/utils/contract-styles.ts`
- Exportar constante `CONTRACT_PREVIEW_STYLES`
- Reutilizable en todos los componentes

### 2. Actualizar `ContractVersionsModal`

**Cambios:**
- Agregar `<style>` con `CONTRACT_PREVIEW_STYLES`
- Usar clase `contract-preview` (ya la tiene)

### 3. Refactorizar `EventContractCard`

**Cambios en menú:**
```typescript
// Antes
{contract.status === 'DRAFT' && (
  <ZenDropdownMenuItem onClick={handleEditClick}>
    Editar
  </ZenDropdownMenuItem>
)}

// Después
{contract.status === 'DRAFT' && (
  <>
    <ZenDropdownMenuItem onClick={handleEditContent}>
      <Edit className="mr-2 h-4 w-4" />
      Editar contenido
    </ZenDropdownMenuItem>
    <ZenDropdownMenuSeparator />
    <ZenDropdownMenuItem onClick={handleChangeTemplate}>
      <FileText className="mr-2 h-4 w-4" />
      Cambiar plantilla
    </ZenDropdownMenuItem>
  </>
)}
```

**Nuevos handlers:**
- `handleEditContent`: Abre `ContractEditorModal` con contenido actual
- `handleChangeTemplate`: Abre `ContractTemplateSelectorModal`

### 4. Corregir `ContractPreviewModal`

**Cambio en `handleConfirm`:**
```typescript
// Antes
const result = await generateEventContract(...); // ❌ Falla si existe

// Después
// Verificar si existe contrato
const existingContract = await getEventContract(...);
if (existingContract.success && existingContract.data) {
  // Actualizar contrato existente
  const result = await updateEventContract(studioSlug, existingContract.data.id, {
    content: renderedContent, // Contenido renderizado de la nueva plantilla
    change_reason: `Plantilla cambiada a: ${templateName}`,
  });
} else {
  // Crear nuevo contrato
  const result = await generateEventContract(...);
}
```

### 5. Actualizar `EventContractViewModal`

**Cambio:**
- Usar `CONTRACT_PREVIEW_STYLES` en lugar de estilos inline
- Cambiar clase de `.contract-preview-modal` a `.contract-preview` (unificar)

### 6. Actualizar página del cliente

**Cambio:**
- Usar `CONTRACT_PREVIEW_STYLES` en lugar de estilos inline

---

## 🎨 Arquitectura Propuesta

### Componentes de Preview

```
ContractPreview (config/contratos)
  └─ Usa: CONTRACT_PREVIEW_STYLES
  └─ Clase: .contract-preview

EventContractViewModal
  └─ Usa: CONTRACT_PREVIEW_STYLES
  └─ Clase: .contract-preview

ContractVersionsModal
  └─ Usa: CONTRACT_PREVIEW_STYLES
  └─ Clase: .contract-preview

Página del cliente
  └─ Usa: CONTRACT_PREVIEW_STYLES
  └─ Clase: .contract-preview
```

### Flujo de Edición

```
┌─────────────────────────────────────┐
│  EventContractCard                  │
│  ┌───────────────────────────────┐ │
│  │ Menú:                          │ │
│  │ • Editar contenido            │ │ → ContractEditorModal
│  │ • Cambiar plantilla           │ │ → ContractTemplateSelectorModal
│  │ • Ver contrato                │ │ → EventContractViewModal
│  │ • Historial                   │ │ → ContractVersionsModal
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Flujo de Cambio de Plantilla

```
ContractTemplateSelectorModal
  ↓ (seleccionar plantilla)
ContractPreviewModal
  ↓ (confirmar)
updateEventContract (con contenido renderizado)
  ↓
Crear versión automática
  ↓
Notificar actualización
```

---

## ✅ Beneficios

1. **Consistencia visual**: Todos los previews se ven igual
2. **Mantenibilidad**: Estilos en un solo lugar
3. **Claridad UX**: Separación clara entre "editar contenido" y "cambiar plantilla"
4. **Funcionalidad correcta**: Cambio de plantilla actualiza contrato existente
5. **Versionado automático**: Cada cambio crea versión en historial

---

## 🚀 Plan de Implementación

### Fase 1: Unificar Estilos
1. Crear `src/lib/utils/contract-styles.ts`
2. Actualizar `ContractVersionsModal` con estilos
3. Actualizar `EventContractViewModal` para usar estilos unificados
4. Actualizar página del cliente para usar estilos unificados

### Fase 2: Separar Acciones de Edición
1. Agregar `handleEditContent` en `EventContractCard`
2. Renombrar `handleEditClick` a `handleChangeTemplate`
3. Actualizar menú dropdown con ambas opciones
4. Actualizar `ContractPreviewModal` para actualizar en lugar de crear

### Fase 3: Testing
1. Verificar previews en todos los modales
2. Verificar flujo de edición de contenido
3. Verificar flujo de cambio de plantilla
4. Verificar versionado automático

---

## ❓ Decisiones Pendientes

1. **¿Mantener `ContractPreview` component o usar solo estilos?**
   - Opción A: Mantener componente (ya tiene lógica de renderizado)
   - Opción B: Solo usar estilos, cada modal maneja su renderizado
   - **Recomendación:** Opción A (componente ya funciona bien)

2. **¿Permitir editar contenido de contratos publicados?**
   - Actualmente: Solo draft y published
   - **Recomendación:** Mantener restricción (signed/cancelled no editables)

3. **¿Mostrar preview al cambiar plantilla?**
   - Actualmente: Sí (ContractPreviewModal)
   - **Recomendación:** Mantener preview antes de confirmar

---

## 📌 Notas Adicionales

- El componente `ContractPreview` ya tiene estilos, pero solo se usa en `ContractPreviewModal` y `ContractEditorModal`
- `EventContractViewModal` tiene su propia implementación de preview
- `ContractVersionsModal` no tiene estilos aplicados
- La página del cliente tiene estilos duplicados

**Prioridad:** Alta - Afecta UX y mantenibilidad

