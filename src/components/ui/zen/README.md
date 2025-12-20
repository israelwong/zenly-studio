# ZEN Design System

Sistema de diseño unificado para Studio con tema oscuro zinc y componentes reutilizables.

## 🎯 **Propósito**

ZEN Design System resuelve las inconsistencias identificadas en Studio proporcionando:

- ✅ **Componentes unificados** para sidebar, botones, inputs y formularios
- ✅ **Tema oscuro consistente** con paleta zinc
- ✅ **TypeScript strict** con props bien tipadas
- ✅ **Tokens de diseño** centralizados

## 📁 **Estructura**

```
src/components/ui/zen/
├── index.ts                 # Exports centralizados
├── tokens/                  # Design tokens
│   ├── colors.ts           # Paleta de colores ZEN
│   ├── spacing.ts          # Espaciados
│   └── typography.ts       # Tipografía
├── base/                   # Componentes base
│   ├── ZenButton.tsx
│   ├── ZenInput.tsx
│   ├── ZenCard.tsx
│   └── ZenBadge.tsx
├── forms/                  # Componentes de formulario
│   ├── ZenFormSection.tsx
│   ├── ZenSelect.tsx
│   ├── ZenTextarea.tsx
│   ├── ZenCheckbox.tsx
│   └── ZenSwitch.tsx
├── layout/                 # Componentes de layout
│   ├── ZenSidebar.tsx
│   ├── ZenNavbar.tsx
│   └── ZenModal.tsx
├── specialized/            # Componentes especializados
│   ├── ZenProgressHeader.tsx
│   ├── ZenConfigGrid.tsx
│   └── ZenLoadingState.tsx
└── hooks/                  # Hooks específicos de ZEN
    ├── useZenTheme.ts
    └── useZenForm.ts
```

## 🚀 **Uso**

### **Importación Centralizada**

```typescript
// ✅ CORRECTO - Importar desde index
import { ZenButton, ZenInput, ZenCard, ZenSidebar } from "@/components/ui/zen";

// ❌ INCORRECTO - No importar directamente
import { ZenButton } from "@/components/ui/zen/base/ZenButton";
```

### **Componentes Base**

```typescript
// Botón con variantes
<ZenButton variant="primary" size="md" loading={saving}>
  Guardar Cambios
</ZenButton>

// Input con label integrado
<ZenInput
  label="Nombre del Estudio"
  required
  error={errors.name}
  hint="Este nombre aparecerá en tu perfil"
/>

// Card con tema ZEN
<ZenCard variant="default" padding="md">
  <h3>Contenido del card</h3>
</ZenCard>
```

### **Layout Components**

```typescript
// Sidebar unificado
<ZenSidebar
  variant="main"
  studioSlug={slug}
  currentPath={pathname}
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>

// Modal consistente
<ZenModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirmar Acción"
  variant="confirmation"
>
  <p>¿Estás seguro de continuar?</p>
</ZenModal>
```

## 🎨 **Design Tokens**

### **Colores**

```typescript
import { ZEN_COLORS } from "@/components/ui/zen";

// Usar tokens de color
const buttonClass = cn(
  ZEN_COLORS.button.primary.bg,
  ZEN_COLORS.button.primary.hover,
  ZEN_COLORS.button.primary.text
);
```

### **Espaciado**

```typescript
import { ZEN_SPACING } from "@/components/ui/zen";

// Usar tokens de espaciado
const cardClass = cn(ZEN_SPACING.padding.card.md, ZEN_SPACING.zen.cardSpacing);
```

### **Tipografía**

```typescript
import { ZEN_TYPOGRAPHY } from "@/components/ui/zen";

// Usar tokens de tipografía
const titleClass = ZEN_TYPOGRAPHY.component.pageTitle;
```

## 🔄 **Migración desde Componentes Existentes**

### **Antes (Inconsistente)**

```typescript
// Múltiples patrones diferentes
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="name">Nombre *</Label>
  <Input
    id="name"
    className="bg-zinc-800 border-zinc-700"
    placeholder="Tu nombre"
  />
</div>
<Button className="bg-blue-600 hover:bg-blue-700">
  Guardar
</Button>
```

### **Después (ZEN)**

```typescript
// Patrón unificado
import { ZenInput, ZenButton } from '@/components/ui/zen';

<ZenInput
  label="Nombre"
  required
  placeholder="Tu nombre"
/>
<ZenButton variant="primary">
  Guardar
</ZenButton>
```

## 📋 **Estado de Implementación**

### **✅ Completado**

- [x] Estructura de directorios
- [x] Design tokens (colores, espaciado, tipografía)
- [x] Exports centralizados
- [x] Documentación base

### **🔄 En Progreso**

- [ ] ZenButton (Prioridad 1)
- [ ] ZenInput (Prioridad 1)
- [ ] ZenCard (Prioridad 1)
- [ ] ZenSidebar (Prioridad 1)

### **⏳ Pendiente**

- [ ] ZenModal
- [ ] ZenFormSection
- [ ] ZenNavbar
- [ ] ZenProgressHeader
- [ ] Componentes especializados
- [ ] Hooks de ZEN

## 🎯 **Próximos Pasos**

1. **Implementar ZenButton** - Botón unificado con variantes
2. **Implementar ZenInput** - Input con label integrado
3. **Implementar ZenCard** - Contenedor base
4. **Implementar ZenSidebar** - Unificar 3 implementaciones existentes
5. **Refactorizar Studio** - Migrar componentes existentes

## ⚠️ **Reglas de Desarrollo**

### **✅ Hacer**

- Usar TypeScript strict en todos los componentes
- Seguir naming convention `Zen{ComponentName}`
- Usar design tokens en lugar de clases hardcodeadas
- Incluir props `className` para extensibilidad
- Documentar props con JSDoc
- Incluir estados de loading y error

### **❌ No Hacer**

- Usar `any` type
- Hardcodear colores o espaciados
- Crear componentes sin design tokens
- Romper compatibilidad con Shadcn existente
- Ignorar accesibilidad (ARIA labels)

---

**Última actualización**: $(date)  
**Estado**: Estructura creada, implementación en progreso  
**Próximo**: Implementar ZenButton como componente piloto
