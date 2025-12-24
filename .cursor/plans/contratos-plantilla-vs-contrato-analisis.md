# 📋 Contratos - Análisis: Plantilla vs Contrato

**Fecha:** 2025-01-29  
**Contexto:** Distinguir entre editar plantilla (reutilizable) vs editar contrato (específico)

---

## 🔍 Arquitectura Actual

### Modelos de Datos

```prisma
// PLANTILLA (Reutilizable)
studio_contract_templates {
  id            String
  studio_id     String
  name          String
  content       String  // Plantilla con variables (@nombre_cliente, etc.)
  version       Int     // Versión de la plantilla
  is_active     Boolean
  contracts     studio_event_contracts[] // Relación 1:N
}

// CONTRATO (Específico de evento/cliente)
studio_event_contracts {
  id            String
  event_id       String  @unique
  template_id   String? // Referencia a plantilla usada
  content       String  // Contenido RENDERIZADO (ya con datos del evento)
  version       Int     // Versión del contrato específico
  status        ContractStatus
}
```

### Flujo de Generación

```
1. Seleccionar plantilla (template.content)
   ↓
2. Obtener datos del evento (nombre_cliente, fecha, etc.)
   ↓
3. Renderizar: template.content + eventData → contenido renderizado
   ↓
4. Guardar en contract.content (snapshot del contenido renderizado)
   ↓
5. Guardar contract.template_id (referencia a plantilla usada)
```

**Punto clave:** El `contract.content` es un **snapshot renderizado**, no la plantilla original.

---

## 🎯 Distinción Fundamental

### Editar Plantilla
- **Alcance:** Todos los contratos futuros que usen esa plantilla
- **No afecta:** Contratos ya generados (tienen su propio `content` snapshot)
- **Uso:** Mejorar plantilla base, corregir errores generales, actualizar términos estándar
- **Ejemplo:** Cambiar "Entrega en 20 días" a "Entrega en 15 días" en la plantilla

### Editar Contrato
- **Alcance:** Solo ese contrato específico (ese evento/cliente)
- **No afecta:** Otros contratos, ni la plantilla original
- **Uso:** Personalización específica, correcciones puntuales, ajustes por cliente
- **Ejemplo:** Agregar cláusula especial para este cliente específico

---

## 🔄 Flujo Actual vs Flujo Ideal

### Flujo Actual (Problemas)

**Generar contrato:**
```
Seleccionar plantilla → Preview → generateEventContract
  ✅ Funciona bien
```

**Editar contrato (menú "Editar"):**
```
handleEditClick → ContractTemplateSelectorModal → ContractPreviewModal
  ↓
generateEventContract → ❌ Error: "Ya existe un contrato"
  ❌ Intenta crear nuevo en lugar de actualizar
```

**Editar contrato (desde view modal):**
```
handleEditContract → ContractEditorModal → updateEventContract
  ✅ Funciona bien (pero no accesible desde menú principal)
```

**Actualizar plantilla:**
```
updateEventContract(update_template: true) → Actualiza template.content
  ✅ Funciona, pero confuso
```

### Problemas Identificados

1. **Confusión en "Editar":**
   - Menú "Editar" abre selector de plantillas (cambiar plantilla)
   - No hay opción clara para "Editar contenido del contrato"
   - `handleEditContract` existe pero no se usa desde menú

2. **Cambio de plantilla mal implementado:**
   - Intenta crear nuevo contrato en lugar de actualizar existente
   - No regenera contenido con nueva plantilla

3. **Falta claridad:**
   - ¿Cuándo editar plantilla vs contrato?
   - ¿Qué pasa si edito la plantilla después de generar contratos?

---

## 💡 Solución Propuesta

### Separar Acciones Claramente

#### Menú de Contrato (EventContractCard)

```
┌─────────────────────────────────────┐
│  Menú del Contrato                  │
├─────────────────────────────────────┤
│  📄 Ver contrato                    │ → EventContractViewModal
│  📝 Editar contenido                │ → ContractEditorModal (modo edit-event-contract)
│  📋 Cambiar plantilla               │ → ContractTemplateSelectorModal → Regenerar
│  📚 Historial de versiones          │ → ContractVersionsModal
│  ─────────────────────────────────  │
│  🚀 Publicar                        │ (si DRAFT)
│  ❌ Solicitar cancelación           │ (si SIGNED)
└─────────────────────────────────────┘
```

#### Menú de Plantilla (ContractTemplateManager)

```
┌─────────────────────────────────────┐
│  Menú de Plantilla                  │
├─────────────────────────────────────┤
│  📝 Editar plantilla                │ → ContractEditorModal (modo edit-template)
│  📄 Vista previa                    │ → ContractPreviewModal
│  🔄 Regenerar contratos existentes  │ → Opción para actualizar contratos DRAFT
└─────────────────────────────────────┘
```

### Flujos Específicos

#### 1. Editar Contenido del Contrato

**Propósito:** Personalizar este contrato específico sin afectar plantilla ni otros contratos.

**Flujo:**
```
Editar contenido → ContractEditorModal
  ↓
Modo: "edit-event-contract"
Contenido inicial: contract.content (ya renderizado)
  ↓
Usuario edita contenido directamente
  ↓
Guardar → updateEventContract
  ↓
- Actualiza contract.content
- Incrementa contract.version
- Crea entrada en studio_contract_versions
- change_type: "MANUAL_EDIT"
```

**Implicaciones:**
- ✅ Solo afecta este contrato
- ✅ No afecta plantilla
- ✅ No afecta otros contratos
- ⚠️ El contenido editado puede perder sincronización con plantilla

#### 2. Cambiar Plantilla del Contrato

**Propósito:** Usar otra plantilla para este contrato específico.

**Flujo:**
```
Cambiar plantilla → ContractTemplateSelectorModal
  ↓
Seleccionar nueva plantilla → ContractPreviewModal
  ↓
Preview con datos del evento renderizados
  ↓
Confirmar → updateEventContractTemplate
  ↓
- Obtener datos actualizados del evento
- Renderizar nueva plantilla con datos
- Actualizar contract.content (nuevo contenido renderizado)
- Actualizar contract.template_id (nueva plantilla)
- Incrementa contract.version
- Crea entrada en studio_contract_versions
- change_type: "TEMPLATE_UPDATE"
- change_reason: "Plantilla cambiada a: [nombre]"
```

**Implicaciones:**
- ✅ Solo afecta este contrato
- ✅ Regenera contenido con nueva plantilla
- ✅ Mantiene datos del evento actualizados
- ⚠️ Pierde ediciones manuales previas al contenido

#### 3. Editar Plantilla

**Propósito:** Mejorar plantilla base para contratos futuros.

**Flujo:**
```
Editar plantilla → ContractEditorModal
  ↓
Modo: "edit-template"
Contenido inicial: template.content (plantilla con variables)
  ↓
Usuario edita plantilla
  ↓
Guardar → updateContractTemplate
  ↓
- Actualiza template.content
- Incrementa template.version
- Opción: "¿Actualizar contratos DRAFT existentes?"
```

**Implicaciones:**
- ✅ Afecta contratos futuros
- ❌ NO afecta contratos ya generados (tienen snapshot)
- ⚠️ Opción para regenerar contratos DRAFT existentes (opcional)

#### 4. Regenerar Contrato (Actualizar Datos)

**Propósito:** Actualizar contenido cuando cambian datos del evento (nombre, fecha, servicios, etc.).

**Flujo:**
```
Regenerar contrato → regenerateEventContract
  ↓
- Obtener datos actualizados del evento
- Usar template.content actual (o contract.template si existe)
- Renderizar con datos nuevos
- Actualizar contract.content
- Incrementa contract.version
- Crea entrada en studio_contract_versions
- change_type: "AUTO_REGENERATE"
- change_reason: "Regeneración por cambios en datos del evento"
```

**Implicaciones:**
- ✅ Actualiza datos del evento automáticamente
- ⚠️ Puede perder ediciones manuales al contenido
- ⚠️ Usa plantilla actual (puede ser diferente a la original)

---

## 🎨 Decisiones de Diseño

### 1. ¿Permitir editar contrato directamente?

**SÍ** - Es necesario para:
- Personalizaciones específicas por cliente
- Correcciones puntuales
- Ajustes de última hora

**Pero con advertencia:**
- Mostrar warning si el contenido editado difiere mucho de la plantilla
- Opción para "Sincronizar con plantilla" (regenerar desde plantilla)

### 2. ¿Qué pasa si edito la plantilla después de generar contratos?

**Comportamiento actual (correcto):**
- Contratos ya generados NO se actualizan automáticamente
- Tienen su propio `content` snapshot
- Solo afecta contratos futuros

**Mejora propuesta:**
- Opción en UI: "¿Regenerar contratos DRAFT existentes con nueva plantilla?"
- Solo para contratos en estado DRAFT (no firmados)
- Mostrar lista de contratos que se actualizarían

### 3. ¿Sincronización plantilla-contrato?

**Opcional, no forzada:**
- Botón "Sincronizar con plantilla" en contrato editado
- Regenera desde plantilla actual
- Pierde ediciones manuales (con confirmación)

### 4. ¿Cambiar plantilla vs Editar plantilla?

**Cambiar plantilla (del contrato):**
- Usa otra plantilla para este contrato
- Regenera contenido con nueva plantilla
- Solo afecta este contrato

**Editar plantilla (la plantilla misma):**
- Modifica la plantilla base
- Afecta contratos futuros
- Opción para actualizar contratos DRAFT existentes

---

## 📝 Implementación Técnica

### Nuevas Funciones Necesarias

#### 1. `updateEventContractTemplate`

```typescript
export async function updateEventContractTemplate(
  studioSlug: string,
  contractId: string,
  newTemplateId: string,
  userId?: string
): Promise<ActionResponse<EventContract>> {
  // 1. Obtener contrato actual
  // 2. Obtener nueva plantilla
  // 3. Obtener datos actualizados del evento
  // 4. Renderizar nueva plantilla con datos
  // 5. Guardar versión anterior
  // 6. Actualizar contract.content, contract.template_id
  // 7. Incrementar contract.version
  // 8. Crear entrada en studio_contract_versions
}
```

#### 2. `regenerateContractsFromTemplate` (opcional)

```typescript
export async function regenerateContractsFromTemplate(
  studioSlug: string,
  templateId: string,
  options: {
    onlyDraft?: boolean;
    contractIds?: string[]; // Específicos
  }
): Promise<ActionResponse<{ updated: number; skipped: number }>> {
  // Regenerar contratos DRAFT que usan esta plantilla
  // Con nueva versión de plantilla
}
```

### Actualizar `updateEventContract`

**Eliminar confusión de `update_template`:**
- Separar en dos funciones:
  - `updateEventContract` - Solo actualiza contrato
  - `updateContractTemplate` - Actualiza plantilla (desde gestión de plantillas)

### Actualizar UI

#### EventContractCard - Menú

```typescript
// Antes
<ZenDropdownMenuItem onClick={handleEditClick}>
  Editar
</ZenDropdownMenuItem>

// Después
<ZenDropdownMenuItem onClick={handleEditContent}>
  <Edit className="mr-2 h-4 w-4" />
  Editar contenido
</ZenDropdownMenuItem>
<ZenDropdownMenuItem onClick={handleChangeTemplate}>
  <FileText className="mr-2 h-4 w-4" />
  Cambiar plantilla
</ZenDropdownMenuItem>
```

#### ContractPreviewModal - Cambiar plantilla

```typescript
// Antes
const handleConfirm = async () => {
  const result = await generateEventContract(...); // ❌ Falla
};

// Después
const handleConfirm = async () => {
  if (existingContract) {
    // Actualizar contrato existente con nueva plantilla
    const result = await updateEventContractTemplate(
      studioSlug,
      existingContract.id,
      templateId
    );
  } else {
    // Crear nuevo contrato
    const result = await generateEventContract(...);
  }
};
```

---

## ✅ Beneficios de la Separación

1. **Claridad UX:**
   - Usuario entiende qué acción realiza
   - "Editar contenido" vs "Cambiar plantilla" son claramente diferentes

2. **Comportamiento Predecible:**
   - Editar contrato → Solo afecta ese contrato
   - Editar plantilla → Solo afecta contratos futuros (o DRAFT si se elige)

3. **Mantenibilidad:**
   - Funciones separadas y específicas
   - Menos confusión en el código

4. **Flexibilidad:**
   - Permite personalización por contrato
   - Permite mejora de plantillas sin afectar existentes

---

## 🚨 Consideraciones Importantes

### 1. Pérdida de Ediciones Manuales

**Problema:** Si regeneras contrato desde plantilla, pierdes ediciones manuales.

**Solución:**
- Guardar versión antes de regenerar
- Mostrar diff en historial de versiones
- Advertencia antes de regenerar: "Se perderán las ediciones manuales"

### 2. Sincronización

**Problema:** Contrato editado manualmente puede desincronizarse de plantilla.

**Solución:**
- Mostrar badge "Desincronizado" si contenido difiere mucho
- Botón "Sincronizar con plantilla" (opcional)
- No forzar sincronización automática

### 3. Versionado

**Actual:**
- ✅ Contratos tienen versiones
- ✅ Plantillas tienen versiones
- ✅ Historial de cambios en contratos

**Mejora:**
- Mostrar qué versión de plantilla se usó para cada versión de contrato
- En historial: "Versión 2 - Generado desde Plantilla 'Básica' v3"

---

## 📊 Matriz de Decisiones

| Acción | Alcance | Afecta Plantilla | Afecta Otros Contratos | Afecta Este Contrato |
|--------|---------|------------------|------------------------|----------------------|
| Editar contenido contrato | Este contrato | ❌ No | ❌ No | ✅ Sí |
| Cambiar plantilla contrato | Este contrato | ❌ No | ❌ No | ✅ Sí (regenera) |
| Editar plantilla | Futuros contratos | ✅ Sí | ❌ No* | ❌ No* |
| Regenerar contrato | Este contrato | ❌ No | ❌ No | ✅ Sí (actualiza datos) |

*Excepto si se elige actualizar contratos DRAFT existentes

---

## 🚀 Plan de Implementación

### Fase 1: Separar Acciones en UI
1. Actualizar menú de `EventContractCard`
2. Agregar `handleEditContent` (editar contenido)
3. Renombrar `handleEditClick` a `handleChangeTemplate`
4. Actualizar `ContractPreviewModal` para actualizar en lugar de crear

### Fase 2: Implementar `updateEventContractTemplate`
1. Crear función en `contracts.actions.ts`
2. Manejar versionado automático
3. Integrar con UI

### Fase 3: Mejorar Gestión de Plantillas
1. Separar edición de plantilla (desde gestión de plantillas)
2. Opción para regenerar contratos DRAFT
3. Mostrar impacto de cambios en plantilla

### Fase 4: Advertencias y Sincronización
1. Detectar desincronización contrato-plantilla
2. Mostrar advertencias antes de regenerar
3. Botón "Sincronizar con plantilla" (opcional)

---

## ❓ Preguntas Pendientes

1. **¿Permitir editar contratos firmados?**
   - Actualmente: ❌ No (correcto)
   - Mantener restricción

2. **¿Regenerar automáticamente cuando cambian datos del evento?**
   - Actualmente: Manual (regenerar contrato)
   - Propuesta: Mantener manual, pero notificar cambios

3. **¿Mostrar diff al cambiar plantilla?**
   - Propuesta: Sí, en preview antes de confirmar

4. **¿Permitir múltiples plantillas por contrato?**
   - Actualmente: Una plantilla por contrato
   - Propuesta: Mantener (simplicidad)

---

**Conclusión:** La separación clara entre "editar contrato" y "editar plantilla" es fundamental para una UX clara y un comportamiento predecible del sistema.

