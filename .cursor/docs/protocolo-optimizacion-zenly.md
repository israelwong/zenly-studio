# Protocolo de Optimización Zenly

> **Objetivo:** Establecer las reglas de oro para cualquier ruta de alta carga (como el Detalle de Promesa) para evitar que el proyecto vuelva a degradarse en el futuro.

---

## 🎯 Principio Fundamental

**Este modelo establece las reglas de oro para cualquier ruta de alta carga.** Las páginas de detalle (Promise Detalle, Contacto Detalle, etc.) son las más propensas a sufrir de "Sobre-hidratación" y deben seguir este protocolo estrictamente.

---

## 1. Estrategia de Servidor (Fetching & Layouts)

### 1.1 Consultas Atómicas

**Regla:** Prohibido usar `include` masivos. Se debe usar `select` para traer estrictamente lo que se muestra en pantalla.

```typescript
// ✅ CORRECTO: Select específico
const promise = await prisma.platform_promises.findUnique({
  where: { id: promiseId },
  select: {
    id: true,
    title: true,
    status: true,
    studio_id: true,
    // Solo campos visibles en pantalla
  },
});

// ❌ PROHIBIDO: Include masivo
const promise = await prisma.platform_promises.findUnique({
  where: { id: promiseId },
  include: {
    studio: true,
    contact: {
      include: {
        addresses: true,
        phones: true,
        emails: true,
        // Trae TODO aunque no se use
      },
    },
    quotes: {
      include: {
        items: {
          include: {
            product: true,
            // Include anidado masivo
          },
        },
      },
    },
  },
});
```

**Checklist:**
- [ ] ¿Cada campo en `select` se muestra en la UI?
- [ ] ¿Eliminé relaciones que no se usan?
- [ ] ¿Los includes anidados son necesarios?

### 1.2 Paralelismo Obligatorio

**Regla:** Las consultas de datos independientes deben ejecutarse con `Promise.all()`.

```typescript
// ✅ CORRECTO: Paralelismo
const [promise, tags, contacts] = await Promise.all([
  getPromiseData(promiseId),
  getPromiseTags(promiseId),
  getPromiseContacts(promiseId),
]);

// ❌ PROHIBIDO: Secuencial
const promise = await getPromiseData(promiseId);
const tags = await getPromiseTags(promiseId); // Espera a que termine promise
const contacts = await getPromiseContacts(promiseId); // Espera a que termine tags
```

**Checklist:**
- [ ] ¿Las queries son independientes? → `Promise.all()`
- [ ] ¿Hay dependencias? → Mantener secuencial solo lo necesario

### 1.3 Caché de Solicitud

**Regla:** Usar `React.cache()` para funciones de servidor que se llaman en múltiples componentes durante un mismo renderizado.

```typescript
// ✅ CORRECTO: React.cache para evitar duplicados
const getCachedUser = React.cache(async (userId: string) => {
  return await prisma.platform_users.findUnique({
    where: { id: userId },
  });
});

// En Layout
const user = await getCachedUser(userId);

// En Page (mismo render) - NO hace query duplicada
const userAgain = await getCachedUser(userId);
```

**Casos de uso:**
- `getUser(userId)` - Llamado en Layout + Page
- `getStudioConfig(studioId)` - Llamado en múltiples componentes
- `getPermissions(userId, studioId)` - Validación repetida

**Checklist:**
- [ ] ¿Esta función se llama 2+ veces en el mismo render? → `React.cache()`

### 1.4 Prefetching Controlado

**Regla:** Todo `<Link>` de navegación principal debe llevar `prefetch={false}` para no saturar al servidor con visitas fantasma.

```typescript
// ✅ CORRECTO: Prefetch deshabilitado en navegación principal
<Link 
  href={`/studio/${slug}/promise/${promiseId}`}
  prefetch={false}
>
  Ver Promesa
</Link>

// ✅ CORRECTO: Prefetch habilitado solo en hover (default)
<Link href="/about">About</Link> // Prefetch en hover es aceptable

// ❌ PROHIBIDO: Prefetch masivo en listas
{promises.map(p => (
  <Link href={`/promise/${p.id}`} prefetch={true}>
    {p.title}
  </Link>
))}
```

**Checklist:**
- [ ] ¿Es navegación principal (menús, tabs)? → `prefetch={false}`
- [ ] ¿Es lista grande de items? → `prefetch={false}`
- [ ] ¿Es link único y crítico? → Prefetch OK (default)

---

## 2. Estrategia de Cliente (Hidratación & Realtime)

### 2.1 Modelo Híbrido (SSR + Realtime)

**Regla:** El servidor entrega los `initialData`. El cliente los muestra de inmediato y solo se suscribe a Realtime para actualizaciones. **0 POSTs de recarga al montar.**

```typescript
// ✅ CORRECTO: SSR + Realtime
export default async function PromisePage({ params }) {
  const { promiseId } = await params;
  
  // Servidor entrega datos iniciales
  const initialPromise = await getPromiseData(promiseId);
  
  return (
    <PromiseClientWrapper initialData={initialPromise} />
  );
}

// Cliente: Muestra initialData + Realtime
'use client';
export function PromiseClientWrapper({ initialData }) {
  const [promise, setPromise] = useState(initialPromise);
  
  useEffect(() => {
    // Solo Realtime para actualizaciones
    const channel = supabase
      .channel(`promise:${initialData.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'platform_promises',
        filter: `id=eq.${initialData.id}`,
      }, (payload) => {
        setPromise(payload.new);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialData.id]);
  
  // NO hacer fetch inicial - ya tenemos initialData
  return <PromiseView data={promise} />;
}

// ❌ PROHIBIDO: Fetch al montar
'use client';
export function PromiseClientWrapper({ initialData }) {
  const [promise, setPromise] = useState(null);
  
  useEffect(() => {
    // ❌ POST innecesario - ya tenemos initialData
    fetchPromise(initialData.id).then(setPromise);
  }, []);
  
  return <PromiseView data={promise} />;
}
```

**Checklist:**
- [ ] ¿El servidor entrega `initialData`? → Cliente NO debe hacer fetch inicial
- [ ] ¿Realtime solo para actualizaciones? → Sí, no para carga inicial

### 2.2 Lifting State Up

**Regla:** Las peticiones al servidor se hacen en el componente de mayor jerarquía posible. Los componentes hijos (cards, badges, buttons) reciben datos por props.

```typescript
// ✅ CORRECTO: State en componente padre
export function PromisePage({ initialData }) {
  const [promise, setPromise] = useState(initialData);
  
  return (
    <div>
      <PromiseHeader promise={promise} />
      <PromiseStatusBadge status={promise.status} />
      <PromiseActions promiseId={promise.id} />
    </div>
  );
}

// ❌ PROHIBIDO: Cada hijo hace su fetch
export function PromiseStatusBadge({ promiseId }) {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    fetchPromiseStatus(promiseId).then(setStatus); // ❌ Fetch duplicado
  }, [promiseId]);
  
  return <Badge>{status}</Badge>;
}
```

**Checklist:**
- [ ] ¿El componente hijo necesita datos? → Pasar por props desde padre
- [ ] ¿Hay múltiples hijos que necesitan lo mismo? → State en padre común

### 2.3 Estabilidad de Callbacks

**Regla:** Uso de `useRef` para funciones en hooks de Realtime para evitar re-suscripciones innecesarias que generen bucles de red.

```typescript
// ✅ CORRECTO: useRef para callbacks estables
export function usePromiseRealtime(promiseId: string, onUpdate: (data: any) => void) {
  const callbackRef = useRef(onUpdate);
  
  // Actualizar ref sin causar re-suscripción
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);
  
  useEffect(() => {
    const channel = supabase
      .channel(`promise:${promiseId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'platform_promises',
        filter: `id=eq.${promiseId}`,
      }, (payload) => {
        callbackRef.current(payload.new); // Usa ref estable
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [promiseId]); // Solo se re-suscribe si cambia promiseId
  
  // ❌ PROHIBIDO: Callback en dependencias
  useEffect(() => {
    const channel = supabase
      .channel(`promise:${promiseId}`)
      .on('postgres_changes', {
        // ...
      }, onUpdate) // ❌ onUpdate cambia → re-suscripción constante
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [promiseId, onUpdate]); // ❌ Re-suscripción en cada render
}
```

**Checklist:**
- [ ] ¿El callback de Realtime está en dependencias? → Usar `useRef`
- [ ] ¿Hay re-suscripciones constantes? → Revisar dependencias del `useEffect`

---

## 3. Estrategia de Infraestructura (DB & UI)

### 3.1 Índices de Cobertura

**Regla:** Cada query lenta detectada debe ser analizada para crear un índice compuesto en PostgreSQL (Supabase).

```sql
-- ✅ CORRECTO: Índice compuesto para query específica
-- Query: SELECT * FROM platform_promises 
--        WHERE studio_id = $1 AND status = $2 
--        ORDER BY created_at DESC;

CREATE INDEX idx_promises_studio_status_created 
ON platform_promises(studio_id, status, created_at DESC);

-- ❌ PROHIBIDO: Índices individuales (menos eficientes)
CREATE INDEX idx_promises_studio ON platform_promises(studio_id);
CREATE INDEX idx_promises_status ON platform_promises(status);
-- PostgreSQL no puede combinar eficientemente
```

**Proceso de Auditoría:**

1. **Detectar query lenta:**
   ```typescript
   // En desarrollo, agregar logging
   const start = Date.now();
   const result = await prisma.platform_promises.findMany({...});
   console.log(`Query took ${Date.now() - start}ms`);
   ```

2. **Analizar con EXPLAIN:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM platform_promises 
   WHERE studio_id = 'xxx' AND status = 'active'
   ORDER BY created_at DESC;
   ```

3. **Crear índice compuesto:**
   ```sql
   -- Migración Supabase
   CREATE INDEX CONCURRENTLY idx_promises_studio_status_created 
   ON platform_promises(studio_id, status, created_at DESC);
   ```

**Checklist:**
- [ ] ¿Query > 100ms? → Analizar con EXPLAIN
- [ ] ¿Hay filtros múltiples? → Índice compuesto
- [ ] ¿Hay ORDER BY? → Incluir en índice

### 3.2 Skeletons Minimalistas

**Regla:** Los archivos `loading.tsx` deben ser componentes de cliente (`'use client'`) puros, sin lógica de datos, solo UI.

```typescript
// ✅ CORRECTO: Skeleton puro sin lógica
'use client';

export default function PromiseLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-zinc-800 rounded w-3/4" />
      <div className="h-4 bg-zinc-800 rounded w-1/2" />
      <div className="h-32 bg-zinc-800 rounded" />
    </div>
  );
}

// ❌ PROHIBIDO: Lógica de datos en loading
export default async function PromiseLoading() {
  // ❌ NO hacer queries en loading.tsx
  const studio = await getStudio(slug);
  return <Skeleton />;
}
```

**Checklist:**
- [ ] ¿Es componente `'use client'`? → Sí, para animaciones
- [ ] ¿Tiene lógica de datos? → NO, solo UI

### 3.3 Aislamiento de Errores

**Regla:** Envolver fetchings pesados en `<Suspense>` con fallbacks específicos para no bloquear todo el layout.

```typescript
// ✅ CORRECTO: Suspense granular
export default function PromisePage({ params }) {
  return (
    <div>
      <PromiseHeader /> {/* No bloquea */}
      
      <Suspense fallback={<QuotesSkeleton />}>
        <PromiseQuotes promiseId={promiseId} />
      </Suspense>
      
      <Suspense fallback={<DocumentsSkeleton />}>
        <PromiseDocuments promiseId={promiseId} />
      </Suspense>
      
      <Suspense fallback={<ChatSkeleton />}>
        <PromiseChat promiseId={promiseId} />
      </Suspense>
    </div>
  );
}

// ❌ PROHIBIDO: Todo bloqueado por un Suspense
export default function PromisePage({ params }) {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <PromiseHeader />
      <PromiseQuotes />
      <PromiseDocuments />
      <PromiseChat />
    </Suspense>
  );
}
```

**Checklist:**
- [ ] ¿Cada sección independiente tiene su Suspense? → Sí
- [ ] ¿El fallback es específico? → Sí, no genérico

---

## 🔍 Auditoría: Promise Detalle

### Checklist de Revisión

Antes de optimizar el Detalle de Promesa, auditar con "ojos de halcón":

#### 1. La Query Principal

- [ ] ¿Estamos usando un `include` gigante que trae hasta el color de ojos del contacto?
- [ ] ¿Cada campo en `select` se muestra en la UI?
- [ ] ¿Hay relaciones anidadas innecesarias?

**Acción:** Convertir a `select` atómico con solo campos visibles.

#### 2. Los Badges/Contadores

- [ ] ¿Cada pestaña (Documentos, Pagos, Chat) está haciendo un `count` por separado?
- [ ] ¿Los contadores se pueden calcular en una sola query?
- [ ] ¿Hay múltiples `useEffect` haciendo counts independientes?

**Acción:** Consolidar counts en query única o calcular desde datos ya cargados.

#### 3. El Realtime

- [ ] ¿Hay una suscripción por cada módulo o una sola global?
- [ ] ¿Los callbacks usan `useRef` para estabilidad?
- [ ] ¿Hay re-suscripciones constantes?

**Acción:** Una suscripción global con routing interno de eventos.

#### 4. El Layout

- [ ] ¿Sigue el patrón "Layout Ultraligero + Decisionador Cliente"?
- [ ] ¿Hay `redirect()` en el Layout?
- [ ] ¿El cliente recibe `initialData` sin fetch adicional?

**Acción:** Verificar `.cursor/rules/layout-ultraligero-decisionador-cliente.mdc`

---

## 📋 Template de Auditoría

Para cada ruta de alta carga, completar:

```markdown
## [Nombre de Ruta]

### Queries
- [ ] Query principal usa `select` atómico
- [ ] Queries independientes en `Promise.all()`
- [ ] Funciones repetidas usan `React.cache()`

### Cliente
- [ ] Modelo híbrido SSR + Realtime (0 POSTs al montar)
- [ ] State levantado al componente padre
- [ ] Callbacks de Realtime con `useRef`

### Infraestructura
- [ ] Índices compuestos para queries lentas
- [ ] `loading.tsx` es componente cliente puro
- [ ] `Suspense` granular por sección

### Métricas
- Tiempo de carga inicial: ___ms
- Queries ejecutadas: ___
- Re-suscripciones Realtime: ___
```

---

## 🎯 Referencias

- **Layout Ultraligero:** `.cursor/rules/layout-ultraligero-decisionador-cliente.mdc`
- **Master Plan:** `.cursor/MASTER_PLAN_OPTIMIZACION.md`
- **Realtime:** `.cursor/rules/use-realtime.mdc`

---

**Última actualización:** 2026-01-27  
**Mantenedor:** Protocolo de Optimización Zenly
