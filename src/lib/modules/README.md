# 🧩 Módulos V2.0 - Helpers de Validación

Sistema de validación básica de módulos para ZENPro V2.0.

## 📋 Alcance

**✅ Implementado (MVP Studio):**
- Verificar si un módulo está activo en un studio
- Listar módulos activos de un studio
- Obtener información de módulos
- Validación múltiple de módulos

**⚪ Pendiente (Iteración 2 - Admin):**
- Validación con planes y suscripciones
- Verificación de límites de uso
- Billing y Stripe integration
- Activación/desactivación de módulos

---

## 🚀 Uso Básico

### 1. Verificar si un módulo está activo

```typescript
import { checkStudioModule } from '@/lib/modules';

// En un Server Component o Server Action
const hasManager = await checkStudioModule('demo-studio-id', 'manager');

if (!hasManager) {
  redirect('/studio/demo-studio/settings/modules');
}
```

### 2. Proteger rutas con middleware

```typescript
// src/app/studio/[slug]/manager/layout.tsx
import { checkStudioModule } from '@/lib/modules';
import { redirect } from 'next/navigation';

export default async function ManagerLayout({ 
  params,
  children 
}: {
  params: { slug: string };
  children: React.ReactNode;
}) {
  // Verificar acceso al módulo Manager
  const hasManager = await checkStudioModule(params.slug, 'manager');
  
  if (!hasManager) {
    redirect(`/studio/${params.slug}/settings/modules`);
  }

  return <>{children}</>;
}
```

### 3. Menú lateral dinámico basado en módulos activos

```typescript
// src/app/studio/[slug]/components/Sidebar.tsx
import { getActiveModules } from '@/lib/modules';

export async function Sidebar({ studioId }: { studioId: string }) {
  const activeModules = await getActiveModules(studioId);

  return (
    <nav>
      {activeModules.map(module => (
        <Link 
          key={module.slug}
          href={`/studio/${studioId}/${module.slug}`}
        >
          {module.name}
        </Link>
      ))}
    </nav>
  );
}
```

### 4. Verificar múltiples módulos (Dashboard)

```typescript
import { checkMultipleModules } from '@/lib/modules';

export async function Dashboard({ studioId }: { studioId: string }) {
  // Verificar acceso a varios módulos a la vez
  const access = await checkMultipleModules(studioId, [
    'manager',
    'marketing',
    'payment'
  ]);

  return (
    <div>
      {access.manager && <EventsWidget />}
      {access.marketing && <LeadsWidget />}
      {access.payment && <PaymentsWidget />}
    </div>
  );
}
```

### 5. Página de configuración de módulos

```typescript
import { getAllModulesWithStatus } from '@/lib/modules';

export async function ModulesSettingsPage({ studioId }: { studioId: string }) {
  const modules = await getAllModulesWithStatus(studioId);

  return (
    <div>
      <h2>Módulos Core</h2>
      {modules
        .filter(m => m.category === 'CORE')
        .map(module => (
          <ModuleCard 
            key={module.slug}
            module={module}
            active={module.is_active}
          />
        ))}

      <h2>Módulos Add-ons</h2>
      {modules
        .filter(m => m.category === 'ADDON')
        .map(module => (
          <ModuleCard 
            key={module.slug}
            module={module}
            active={module.is_active}
            price={module.base_price}
          />
        ))}
    </div>
  );
}
```

---

## 📚 API Reference

### `checkStudioModule(studioId: string, moduleSlug: string): Promise<boolean>`

Verifica si un módulo está activo para un studio.

**Parámetros:**
- `studioId`: ID del studio
- `moduleSlug`: Slug del módulo (`manager`, `magic`, `marketing`, `payment`, etc.)

**Retorna:** `true` si está activo, `false` si no

**Ejemplo:**
```typescript
const hasManager = await checkStudioModule('demo-studio-id', 'manager');
// true
```

---

### `getActiveModules(studioId: string): Promise<Module[]>`

Obtiene todos los módulos activos de un studio.

**Parámetros:**
- `studioId`: ID del studio

**Retorna:** Array de módulos activos con su información completa

**Ejemplo:**
```typescript
const modules = await getActiveModules('demo-studio-id');
// [
//   { id: '...', slug: 'manager', name: 'ZEN Manager', category: 'CORE', ... },
//   { id: '...', slug: 'magic', name: 'ZEN Magic', category: 'CORE', ... },
//   { id: '...', slug: 'marketing', name: 'ZEN Marketing', category: 'CORE', ... }
// ]
```

---

### `getModuleInfo(moduleSlug: string): Promise<Module | null>`

Obtiene información detallada de un módulo específico.

**Parámetros:**
- `moduleSlug`: Slug del módulo

**Retorna:** Información del módulo o `null` si no existe

**Ejemplo:**
```typescript
const module = await getModuleInfo('payment');
// {
//   id: '...',
//   slug: 'payment',
//   name: 'ZEN Payment',
//   category: 'ADDON',
//   base_price: 10.00,
//   ...
// }
```

---

### `checkMultipleModules(studioId: string, moduleSlugs: string[]): Promise<Record<string, boolean>>`

Verifica múltiples módulos a la vez (más eficiente que llamadas individuales).

**Parámetros:**
- `studioId`: ID del studio
- `moduleSlugs`: Array de slugs a verificar

**Retorna:** Objeto con el resultado de cada módulo

**Ejemplo:**
```typescript
const access = await checkMultipleModules('demo-studio-id', [
  'manager', 'magic', 'payment'
]);
// { manager: true, magic: true, payment: false }
```

---

### `getAllModulesWithStatus(studioId: string): Promise<ModuleWithActivation[]>`

Obtiene todos los módulos disponibles con su estado de activación.

**Parámetros:**
- `studioId`: ID del studio

**Retorna:** Array de todos los módulos con información de activación

**Ejemplo:**
```typescript
const modules = await getAllModulesWithStatus('demo-studio-id');
// [
//   { slug: 'manager', name: 'ZEN Manager', is_active: true, ... },
//   { slug: 'payment', name: 'ZEN Payment', is_active: false, base_price: 10, ... }
// ]
```

---

## 🧪 Testing

### Tests unitarios (Jest)

```bash
# Ejecutar tests unitarios
npm test src/lib/modules/__tests__/modules.test.ts
```

### Tests manuales

```bash
# Ejecutar tests manuales con datos reales
npx tsx src/lib/modules/__tests__/manual-test.ts
```

---

## 🔒 Seguridad

**Importante:**
- Estos helpers NO validan planes ni suscripciones
- Solo verifican si un módulo está marcado como activo en `studio_modules`
- Para producción (Iteración 2), implementar validación completa con planes

**Recomendaciones:**
- Usar siempre en Server Components o Server Actions
- No exponer estos helpers directamente al cliente
- Implementar validación adicional en rutas sensibles

---

## 🚀 Próximos Pasos (Iteración 2)

1. **Validación completa con planes:**
   ```typescript
   checkStudioModuleWithPlan(studioId, moduleSlug)
   // Verifica: suscripción activa + plan permite módulo + módulo activo
   ```

2. **Verificación de límites:**
   ```typescript
   checkStudioLimit(studioId, 'eventos_mensuales')
   // Verifica límites de uso según plan
   ```

3. **Activación de módulos:**
   ```typescript
   activateModule(studioId, moduleSlug, config)
   // Admin puede activar módulos para studios
   ```

4. **Billing integration:**
   - Stripe webhooks para cambios de suscripción
   - Bloqueo automático por pago vencido
   - Upgrade/downgrade de planes

---

## 📝 Notas

- Los IDs de studios y módulos deben coincidir con los seeds
- Demo studio ID: `demo-studio-id`
- Módulos core: `manager`, `magic`, `marketing`
- Módulos add-on: `payment`, `cloud`, `conversations`, `invitation`

---

**Versión:** 1.0.0 (MVP Studio)  
**Última actualización:** 2025-10-02  
**Próxima iteración:** Validación con planes (Iteración 2 - Admin)

