# Análisis: Botón del Header en EventContractCard

## 📋 Estado Actual

### Lógica del Botón en el Header (líneas 773-791)

```tsx
<ZenButton
  onClick={contract ? handleViewContract : handleGenerateClick}
>
  {contract ? (
    <>
      <Eye className="h-3 w-3 mr-1" />
      Ver contrato
    </>
  ) : (
    <>
      <Plus className="h-3 w-3 mr-1" />
      Anexar
    </>
  )}
</ZenButton>
```

**Comportamiento actual:**
- `contract` = primer contrato activo (no cancelado) o `null`
- Si `contract` existe → muestra "Ver contrato" → abre modal con ese contrato
- Si `contract` es `null` → muestra "Anexar" → abre selector de plantilla

### Lógica de `renderContractItem` (líneas 489-742)

**Contratos Activos (no cancelados):**
- Tienen menú dropdown con opciones (Editar, Cambiar plantilla, Publicar, Eliminar, etc.)
- **NO tienen botón "Ver" explícito** en el card item
- El botón "Ver contrato" del header es la única forma de ver el contrato activo

**Contratos Cancelados:**
- Tienen botón "Ver" explícito (líneas 739-742)
- Estilo atenuado (opacidad reducida)
- Solo lectura

## 🎯 Escenarios de Uso

### Escenario 1: Sin contratos
- **Estado:** `allContracts = []`, `contract = null`
- **Botón header:** "Anexar" ✅
- **Card items:** Mensaje "No hay contrato generado"

### Escenario 2: Solo contrato activo
- **Estado:** `allContracts = [activo]`, `contract = activo`
- **Botón header:** "Ver contrato" (abre el activo)
- **Card items:** 1 card con menú dropdown (sin botón "Ver" explícito)

### Escenario 3: Solo contrato cancelado
- **Estado:** `allContracts = [cancelado]`, `contract = null`
- **Botón header:** "Anexar" ✅
- **Card items:** 1 card cancelado con botón "Ver"

### Escenario 4: Contrato activo + cancelado(s)
- **Estado:** `allContracts = [activo, cancelado]`, `contract = activo`
- **Botón header:** "Ver contrato" (abre el activo)
- **Card items:** 
  - Card activo con menú dropdown (sin botón "Ver" explícito)
  - Card(s) cancelado(s) con botón "Ver"

## 🔍 Problemas Identificados

1. **Redundancia:** El botón "Ver contrato" del header duplica funcionalidad que debería estar en el card item
2. **Inconsistencia:** Los contratos cancelados tienen botón "Ver" en el card, pero los activos no
3. **UX confusa:** El usuario puede no entender que el botón del header se refiere al contrato activo

## 💡 Opciones Propuestas

### Opción A: Botón "Anexar" condicional mejorado
**Lógica:**
```tsx
// Mostrar "Anexar" solo si NO hay contrato activo
const hasActiveContract = allContracts.some(c => c.status !== 'CANCELLED');
const showAddButton = !hasActiveContract; // true si solo hay cancelados o no hay contratos
```

**Ventajas:**
- ✅ Lógica clara: "Anexar" solo cuando no hay contrato activo
- ✅ Permite crear nuevo contrato después de cancelar uno
- ✅ Mantiene el botón del header

**Desventajas:**
- ❌ Sigue siendo redundante con el botón "Ver" de los card items
- ❌ No resuelve la inconsistencia entre activos y cancelados

### Opción B: Botón "Ver contrato" solo si hay activo
**Lógica:**
```tsx
// Mostrar "Ver contrato" solo si hay contrato activo
const hasActiveContract = allContracts.some(c => c.status !== 'CANCELLED');
const showViewButton = hasActiveContract;
```

**Ventajas:**
- ✅ Muestra el contrato activo directamente desde el header
- ✅ Acceso rápido al contrato principal

**Desventajas:**
- ❌ No resuelve la redundancia
- ❌ Sigue siendo inconsistente (activos no tienen botón "Ver" en card)

### Opción C: Eliminar botón del header + Agregar "Ver" a cada card item ⭐ **RECOMENDADA**

**Lógica:**
```tsx
// Header: Sin botón (solo título)
<ZenCardHeader>
  <ZenCardTitle>Contrato</ZenCardTitle>
  {/* Sin botón */}
</ZenCardHeader>

// Card items: Todos tienen botón "Ver"
// - Activos: Botón "Ver" + menú dropdown
// - Cancelados: Botón "Ver" (ya existe)
```

**Ventajas:**
- ✅ **Consistencia:** Todos los contratos tienen botón "Ver" en su card
- ✅ **Claridad:** Cada card es autocontenido y muestra sus acciones
- ✅ **UX mejorada:** El usuario ve directamente qué contrato está viendo
- ✅ **Escalabilidad:** Si hay múltiples contratos activos (futuro), cada uno tiene su botón
- ✅ **Header limpio:** Solo muestra el título, sin acciones

**Desventajas:**
- ⚠️ Requiere agregar botón "Ver" a contratos activos (actualmente solo tienen dropdown)
- ⚠️ Cambio visual (header más limpio, pero menos obvio el botón "Anexar")

## 🎨 Implementación Recomendada (Opción C)

### Cambios necesarios:

1. **Header:**
   - Eliminar botón del header
   - Mantener solo el título "Contrato"

2. **Card items activos:**
   - Agregar botón "Ver" visible (similar al de cancelados)
   - Mantener menú dropdown para otras acciones
   - Layout: Botón "Ver" a la izquierda, menú dropdown a la derecha

3. **Card items cancelados:**
   - Mantener botón "Ver" existente
   - Sin cambios

4. **Botón "Anexar":**
   - Mostrar como card item especial cuando `allContracts.length === 0`
   - O mostrar mensaje con botón "Anexar" en el estado vacío

### Estructura propuesta:

```tsx
<ZenCardHeader>
  <ZenCardTitle>Contrato</ZenCardTitle>
  {/* Sin botón aquí */}
</ZenCardHeader>

<ZenCardContent>
  {allContracts.length > 0 ? (
    <div className="space-y-3">
      {/* Contratos activos */}
      {allContracts
        .filter(c => c.status !== 'CANCELLED')
        .map(contractItem => (
          <div className="contract-item">
            {/* Botón "Ver" visible */}
            <ZenButton onClick={() => handleViewContract(contractItem)}>
              <Eye /> Ver
            </ZenButton>
            {/* Menú dropdown */}
            <ZenDropdownMenu>...</ZenDropdownMenu>
          </div>
        ))}
      
      {/* Contratos cancelados */}
      {allContracts
        .filter(c => c.status === 'CANCELLED')
        .map(contractItem => (
          <div className="contract-item">
            {/* Botón "Ver" (ya existe) */}
            <ZenButton onClick={() => handleViewContract(contractItem)}>
              <Eye /> Ver
            </ZenButton>
          </div>
        ))}
    </div>
  ) : (
    <div className="empty-state">
      <p>No hay contrato generado</p>
      <ZenButton onClick={handleGenerateClick}>
        <Plus /> Anexar contrato
      </ZenButton>
    </div>
  )}
</ZenCardContent>
```

## ✅ Recomendación Final

**Opción C** es la mejor porque:
1. **Consistencia:** Todos los contratos se comportan igual
2. **Claridad:** Cada card muestra sus propias acciones
3. **UX:** El usuario entiende inmediatamente qué contrato está viendo
4. **Mantenibilidad:** Lógica más simple y predecible

## 📝 Próximos Pasos

1. Implementar Opción C
2. Agregar botón "Ver" a contratos activos
3. Eliminar botón del header
4. Mejorar estado vacío con botón "Anexar" visible

