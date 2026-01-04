# Plan de Implementación: Autorización y Creación de Evento

## 🎯 Objetivo

Implementar el flujo completo de "Autorizar y Crear Evento" que convierte una cotización en estado de cierre (staging) a una cotización autorizada con evento creado, utilizando snapshots inmutables para garantizar integridad de datos.

---

## 📋 Contexto

### Estado Actual (Staging - Tabla Temporal)

```
studio_cotizaciones:
  - status: 'en_cierre'
  - Datos mutables durante negociación

studio_cotizaciones_cierre (temporal):
  - condiciones_comerciales_id (FK temporal)
  - contract_template_id (FK temporal)
  - contract_content (HTML renderizado)
  - contract_signed_at (fecha de firma)
  - contract_version
  - pago_* (datos temporales)

studio_promises:
  - stage_id: 'en_negociacion'
```

### Estado Final (Post-Autorización)

```
studio_cotizaciones:
  - status: 'autorizada'
  - evento_id: [ID del evento]
  - *_snapshot (datos inmutables)
  - FKs = null (no dependencias)

studio_events:
  - Nuevo evento creado
  - stage_id: primera etapa del pipeline
  - status: 'ACTIVE'

studio_cotizaciones_cierre:
  - Registro eliminado ✅

studio_promises:
  - stage_id: 'aprobado'
```

---

## 🗄️ Cambios en Schema

### 1. Migración: Agregar Campos Snapshot

**Ubicación:** `/Users/israelwong/Documents/Desarrollo/zen-platform/supabase/migrations/`

**Archivo:** `[timestamp]_add_authorization_snapshots.sql`

**Nota:** Las migraciones se crean manualmente en SQL en el directorio de migraciones de Supabase.

```sql
-- ============================================
-- SNAPSHOTS DE CONDICIONES COMERCIALES
-- ============================================
ALTER TABLE public.studio_cotizaciones
ADD COLUMN IF NOT EXISTS condiciones_comerciales_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS condiciones_comerciales_description_snapshot TEXT,
ADD COLUMN IF NOT EXISTS condiciones_comerciales_advance_percentage_snapshot FLOAT,
ADD COLUMN IF NOT EXISTS condiciones_comerciales_advance_type_snapshot TEXT,
ADD COLUMN IF NOT EXISTS condiciones_comerciales_advance_amount_snapshot DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS condiciones_comerciales_discount_percentage_snapshot FLOAT;

-- ============================================
-- SNAPSHOTS DE CONTRATO
-- ============================================
ALTER TABLE public.studio_cotizaciones
ADD COLUMN IF NOT EXISTS contract_template_id_snapshot TEXT,
ADD COLUMN IF NOT EXISTS contract_template_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS contract_content_snapshot TEXT,
ADD COLUMN IF NOT EXISTS contract_version_snapshot INTEGER,
ADD COLUMN IF NOT EXISTS contract_signed_at_snapshot TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contract_signed_ip_snapshot TEXT;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_name_snapshot IS
'Snapshot inmutable del nombre de la condición comercial al momento de autorizar';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_description_snapshot IS
'Snapshot inmutable de la descripción de la condición comercial';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_advance_percentage_snapshot IS
'Snapshot inmutable del porcentaje de anticipo';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_advance_type_snapshot IS
'Snapshot inmutable del tipo de anticipo (percentage/amount)';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_advance_amount_snapshot IS
'Snapshot inmutable del monto fijo de anticipo';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_discount_percentage_snapshot IS
'Snapshot inmutable del porcentaje de descuento';

COMMENT ON COLUMN public.studio_cotizaciones.contract_template_id_snapshot IS
'Snapshot del ID de la plantilla de contrato utilizada';

COMMENT ON COLUMN public.studio_cotizaciones.contract_template_name_snapshot IS
'Snapshot del nombre de la plantilla de contrato';

COMMENT ON COLUMN public.studio_cotizaciones.contract_content_snapshot IS
'Snapshot del contenido HTML del contrato renderizado y firmado';

COMMENT ON COLUMN public.studio_cotizaciones.contract_version_snapshot IS
'Snapshot de la versión del contrato al momento de autorizar';

COMMENT ON COLUMN public.studio_cotizaciones.contract_signed_at_snapshot IS
'Snapshot de la fecha y hora de firma del contrato';

COMMENT ON COLUMN public.studio_cotizaciones.contract_signed_ip_snapshot IS
'Snapshot de la IP desde donde se firmó el contrato';

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cotizaciones_evento_id
ON public.studio_cotizaciones(evento_id)
WHERE evento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_status_autorizada
ON public.studio_cotizaciones(status)
WHERE status = 'autorizada';
```

### 2. Actualizar Prisma Schema

**Archivo:** `prisma/schema.prisma`

```prisma
model studio_cotizaciones {
  // ... campos existentes

  // Snapshots de Condiciones Comerciales (inmutables)
  condiciones_comerciales_name_snapshot              String?
  condiciones_comerciales_description_snapshot       String?
  condiciones_comerciales_advance_percentage_snapshot Float?
  condiciones_comerciales_advance_type_snapshot      String?
  condiciones_comerciales_advance_amount_snapshot    Decimal? @db.Decimal(10, 2)
  condiciones_comerciales_discount_percentage_snapshot Float?

  // Snapshots de Contrato (inmutables)
  contract_template_id_snapshot    String?
  contract_template_name_snapshot  String?
  contract_content_snapshot        String? @db.Text
  contract_version_snapshot        Int?
  contract_signed_at_snapshot      DateTime?
  contract_signed_ip_snapshot      String?

  // Relaciones
  evento                           studio_events? @relation(fields: [evento_id], references: [id])

  @@index([evento_id])
  @@index([status])
}
```

---

## 🔧 Implementación de Server Actions

### 1. Nueva Acción: `autorizarYCrearEvento`

**Archivo:** `src/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions.ts`

```typescript
/**
 * Autoriza una cotización y crea el evento asociado
 *
 * Proceso:
 * 1. Valida que la cotización esté en estado 'en_cierre'
 * 2. Valida que exista registro de cierre con datos completos
 * 3. Valida que el contrato esté firmado
 * 4. Lee datos de cierre y crea snapshots
 * 5. Crea el evento
 * 6. Actualiza cotización con snapshots (inmutables)
 * 7. Registra pago inicial (si aplica)
 * 8. Cambia etapa de promesa a 'aprobado'
 * 9. Archiva otras cotizaciones de la promesa
 * 10. Elimina registro temporal de cierre
 * 11. Crea log de autorización
 *
 * @returns Evento creado y cotización autorizada
 */
export async function autorizarYCrearEvento(
  studioSlug: string,
  promiseId: string,
  cotizacionId: string,
  options?: {
    registrarPago?: boolean;
    montoInicial?: number;
  }
): Promise<{
  success: boolean;
  data?: {
    evento_id: string;
    cotizacion_id: string;
    pago_registrado: boolean;
  };
  error?: string;
}> {
  try {
    // 1. Validar studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // 2. Validar cotización y promesa
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        promise_id: promiseId,
        studio_id: studio.id,
      },
      include: {
        promise: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: "Cotización no encontrada" };
    }

    if (cotizacion.status !== "en_cierre") {
      return {
        success: false,
        error: "La cotización debe estar en estado de cierre",
      };
    }

    // 3. Validar registro de cierre
    const registroCierre = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
      include: {
        condiciones_comerciales: true,
        contract_template: true,
      },
    });

    if (!registroCierre) {
      return { success: false, error: "No se encontró el registro de cierre" };
    }

    // 4. Validaciones de datos completos
    if (
      !registroCierre.condiciones_comerciales_definidas ||
      !registroCierre.condiciones_comerciales_id
    ) {
      return {
        success: false,
        error: "Debe definir las condiciones comerciales",
      };
    }

    if (
      !registroCierre.contrato_definido ||
      !registroCierre.contract_template_id
    ) {
      return { success: false, error: "Debe definir el contrato" };
    }

    // Validación: contrato firmado SOLO si la cotización fue seleccionada por el prospecto
    if (cotizacion.selected_by_prospect && !registroCierre.contract_signed_at) {
      return {
        success: false,
        error:
          "El contrato debe estar firmado por el cliente antes de autorizar",
      };
    }

    // 5. Obtener primera etapa del pipeline de eventos
    const primeraEtapa = await prisma.studio_event_pipeline_stages.findFirst({
      where: { studio_id: studio.id },
      orderBy: { order: "asc" },
    });

    if (!primeraEtapa) {
      return {
        success: false,
        error: "No se encontró una etapa inicial en el pipeline de eventos",
      };
    }

    // 6. Obtener etapa "aprobado" del pipeline de promesas
    const etapaAprobado = await prisma.studio_promise_pipeline_stages.findFirst(
      {
        where: {
          studio_id: studio.id,
          slug: "aprobado",
        },
      }
    );

    if (!etapaAprobado) {
      return {
        success: false,
        error: 'No se encontró la etapa "aprobado" en el pipeline de promesas',
      };
    }

    // 7. TRANSACCIÓN ATÓMICA
    const result = await prisma.$transaction(async (tx) => {
      // 7.1. Crear snapshots de condiciones comerciales
      const condicionSnapshot = registroCierre.condiciones_comerciales
        ? {
            name: registroCierre.condiciones_comerciales.name,
            description: registroCierre.condiciones_comerciales.description,
            advance_percentage: registroCierre.condiciones_comerciales
              .advance_percentage
              ? Number(
                  registroCierre.condiciones_comerciales.advance_percentage
                )
              : null,
            advance_type: registroCierre.condiciones_comerciales.advance_type,
            advance_amount:
              registroCierre.condiciones_comerciales.advance_amount,
            discount_percentage: registroCierre.condiciones_comerciales
              .discount_percentage
              ? Number(
                  registroCierre.condiciones_comerciales.discount_percentage
                )
              : null,
          }
        : null;

      // 7.2. Crear snapshots de contrato
      const contratoSnapshot = {
        template_id: registroCierre.contract_template_id,
        template_name: registroCierre.contract_template?.name || null,
        content: registroCierre.contract_content,
        version: registroCierre.contract_version,
        signed_at: registroCierre.contract_signed_at,
        signed_ip: null, // TODO: Obtener IP de firma desde tabla de versiones si existe
      };

      // 7.3. Crear evento
      const evento = await tx.studio_events.create({
        data: {
          studio_id: studio.id,
          contact_id: cotizacion.promise.contact_id,
          promise_id: promiseId,
          cotizacion_id: cotizacionId,
          event_type_id: cotizacion.promise.event_type_id,
          stage_id: primeraEtapa.id,
          event_date: cotizacion.promise.event_date,
          status: "ACTIVE",
          name:
            cotizacion.promise.event_name ||
            `Evento de ${cotizacion.promise.contact?.name || "Cliente"}`,
          address:
            cotizacion.promise.event_location ||
            cotizacion.promise.contact?.address ||
            null,
        },
      });

      // 7.4. Actualizar cotización con snapshots (inmutables)
      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: {
          status: "autorizada",
          evento_id: evento.id,
          // Snapshots de condiciones comerciales
          condiciones_comerciales_id: null, // ❌ No usar FK
          condiciones_comerciales_name_snapshot:
            condicionSnapshot?.name || null,
          condiciones_comerciales_description_snapshot:
            condicionSnapshot?.description || null,
          condiciones_comerciales_advance_percentage_snapshot:
            condicionSnapshot?.advance_percentage || null,
          condiciones_comerciales_advance_type_snapshot:
            condicionSnapshot?.advance_type || null,
          condiciones_comerciales_advance_amount_snapshot:
            condicionSnapshot?.advance_amount || null,
          condiciones_comerciales_discount_percentage_snapshot:
            condicionSnapshot?.discount_percentage || null,
          // Snapshots de contrato
          contract_template_id: null, // ❌ No usar FK
          contract_template_id_snapshot: contratoSnapshot.template_id,
          contract_template_name_snapshot: contratoSnapshot.template_name,
          contract_content_snapshot: contratoSnapshot.content,
          contract_version_snapshot: contratoSnapshot.version,
          contract_signed_at_snapshot: contratoSnapshot.signed_at,
          contract_signed_ip_snapshot: contratoSnapshot.signed_ip,
          updated_at: new Date(),
        },
      });

      // 7.5. Registrar pago inicial (si aplica)
      let pagoRegistrado = false;
      if (
        options?.registrarPago &&
        options?.montoInicial &&
        options.montoInicial > 0
      ) {
        await tx.studio_pagos.create({
          data: {
            evento_id: evento.id,
            monto: options.montoInicial,
            concepto: "Pago inicial / Anticipo",
            fecha: new Date(),
            metodo_pago_id: registroCierre.pago_metodo_id,
            status: "COMPLETED",
          },
        });
        pagoRegistrado = true;
      }

      // 7.6. Cambiar etapa de promesa a "aprobado"
      await tx.studio_promises.update({
        where: { id: promiseId },
        data: {
          stage_id: etapaAprobado.id,
          updated_at: new Date(),
        },
      });

      // 7.7. Archivar otras cotizaciones de la promesa
      await tx.studio_cotizaciones.updateMany({
        where: {
          promise_id: promiseId,
          id: { not: cotizacionId },
          status: { in: ["pendiente", "en_cierre", "autorizada"] },
        },
        data: {
          status: "archivada",
          updated_at: new Date(),
        },
      });

      // 7.8. Eliminar registro temporal de cierre
      await tx.studio_cotizaciones_cierre.delete({
        where: { cotizacion_id: cotizacionId },
      });

      // 7.9. Crear log de autorización
      await tx.studio_promise_logs.create({
        data: {
          promise_id: promiseId,
          action: "cotizacion_autorizada_evento_creado",
          description: `Cotización autorizada y evento creado exitosamente`,
          metadata: {
            cotizacion_id: cotizacionId,
            evento_id: evento.id,
            contract_signed: true,
            pago_registrado: pagoRegistrado,
          },
        },
      });

      return {
        evento_id: evento.id,
        cotizacion_id: cotizacionId,
        pago_registrado: pagoRegistrado,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[autorizarYCrearEvento] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al autorizar cotización y crear evento",
    };
  }
}
```

### 2. Helper: Leer Datos con Snapshots

**Archivo:** `src/lib/actions/studio/commercial/promises/cotizaciones-helpers.ts`

```typescript
/**
 * Obtiene las condiciones comerciales de una cotización
 * Prioriza snapshots sobre FK (para cotizaciones autorizadas)
 */
export function getCondicionesComerciales(cotizacion: {
  condiciones_comerciales_name_snapshot?: string | null;
  condiciones_comerciales_description_snapshot?: string | null;
  condiciones_comerciales_advance_percentage_snapshot?: number | null;
  condiciones_comerciales_advance_type_snapshot?: string | null;
  condiciones_comerciales_advance_amount_snapshot?: any | null;
  condiciones_comerciales_discount_percentage_snapshot?: number | null;
  condiciones_comerciales?: any; // Relación Prisma (legacy)
}) {
  // Prioridad 1: Snapshot (cotizaciones autorizadas)
  if (cotizacion.condiciones_comerciales_name_snapshot) {
    return {
      name: cotizacion.condiciones_comerciales_name_snapshot,
      description: cotizacion.condiciones_comerciales_description_snapshot,
      advance_percentage:
        cotizacion.condiciones_comerciales_advance_percentage_snapshot,
      advance_type: cotizacion.condiciones_comerciales_advance_type_snapshot,
      advance_amount: cotizacion.condiciones_comerciales_advance_amount_snapshot
        ? Number(cotizacion.condiciones_comerciales_advance_amount_snapshot)
        : null,
      discount_percentage:
        cotizacion.condiciones_comerciales_discount_percentage_snapshot,
    };
  }

  // Prioridad 2: FK con relación cargada (legacy o en proceso)
  if (cotizacion.condiciones_comerciales) {
    return {
      name: cotizacion.condiciones_comerciales.name,
      description: cotizacion.condiciones_comerciales.description,
      advance_percentage: cotizacion.condiciones_comerciales.advance_percentage
        ? Number(cotizacion.condiciones_comerciales.advance_percentage)
        : null,
      advance_type: cotizacion.condiciones_comerciales.advance_type,
      advance_amount: cotizacion.condiciones_comerciales.advance_amount
        ? Number(cotizacion.condiciones_comerciales.advance_amount)
        : null,
      discount_percentage: cotizacion.condiciones_comerciales
        .discount_percentage
        ? Number(cotizacion.condiciones_comerciales.discount_percentage)
        : null,
    };
  }

  // Sin condiciones comerciales
  return null;
}

/**
 * Obtiene el contrato de una cotización
 * Prioriza snapshot sobre FK (para cotizaciones autorizadas)
 */
export function getContrato(cotizacion: {
  contract_template_id_snapshot?: string | null;
  contract_template_name_snapshot?: string | null;
  contract_content_snapshot?: string | null;
  contract_version_snapshot?: number | null;
  contract_signed_at_snapshot?: Date | null;
  contract_signed_ip_snapshot?: string | null;
}) {
  // Si hay snapshot, usar esos datos (inmutables)
  if (cotizacion.contract_content_snapshot) {
    return {
      template_id: cotizacion.contract_template_id_snapshot,
      template_name: cotizacion.contract_template_name_snapshot,
      content: cotizacion.contract_content_snapshot,
      version: cotizacion.contract_version_snapshot,
      signed_at: cotizacion.contract_signed_at_snapshot,
      signed_ip: cotizacion.contract_signed_ip_snapshot,
    };
  }

  // Sin contrato
  return null;
}
```

---

## 🎨 Cambios en UI

### 1. Botón "Autorizar y Crear Evento"

**Ubicación:** `PromiseClosingProcessCard.tsx`

**Requisitos para habilitar:**

- ✅ Condiciones comerciales definidas
- ✅ Contrato definido
- ✅ Contrato firmado (`contract_signed_at !== null`) **SOLO si `selected_by_prospect === true`**
- ✅ Datos del cliente completos

**Implementación:**

```typescript
// En PromiseClosingProcessCard.tsx

const [showAutorizarModal, setShowAutorizarModal] = useState(false);
const [autorizando, setAutorizando] = useState(false);

// Validar si se puede autorizar
const puedeAutorizar = useMemo(() => {
  const contratoFirmado = cotizacion.selected_by_prospect
    ? contractData?.contract_signed_at !== null // Solo requerido si seleccionada por prospecto
    : true; // Si no fue seleccionada por prospecto, no requiere firma

  return (
    condicionesData?.condiciones_comerciales_definidas &&
    contractData?.contrato_definido &&
    contratoFirmado &&
    clientCompletion.percentage === 100 // Datos completos
  );
}, [condicionesData, contractData, clientCompletion, cotizacion.selected_by_prospect]);

const handleAutorizar = async () => {
  setAutorizando(true);
  try {
    const result = await autorizarYCrearEvento(
      studioSlug,
      promiseId,
      cotizacion.id
    );

    if (result.success && result.data) {
      toast.success('¡Cotización autorizada y evento creado!');

      // Redirigir al evento
      router.push(`/${studioSlug}/studio/business/events/${result.data.evento_id}`);
    } else {
      toast.error(result.error || 'Error al autorizar');
    }
  } catch (error) {
    console.error('[handleAutorizar] Error:', error);
    toast.error('Error al autorizar cotización');
  } finally {
    setAutorizando(false);
    setShowAutorizarModal(false);
  }
};

// Botón principal
{puedeAutorizar && (
  <ZenButton
    variant="primary"
    size="lg"
    onClick={() => setShowAutorizarModal(true)}
    className="w-full"
  >
    <CheckCircle2 className="w-5 h-5 mr-2" />
    Autorizar y Crear Evento
  </ZenButton>
)}

// Modal de confirmación
<ZenDialog
  isOpen={showAutorizarModal}
  onClose={() => !autorizando && setShowAutorizarModal(false)}
  title="Autorizar Cotización y Crear Evento"
  description="Esta acción creará el evento y autorizará la cotización. No se podrá revertir."
  onSave={handleAutorizar}
  onCancel={() => setShowAutorizarModal(false)}
  saveLabel="Confirmar Autorización"
  cancelLabel="Cancelar"
  loading={autorizando}
>
  <div className="space-y-4">
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-zinc-300 mb-3">Resumen:</h4>
      <ul className="space-y-2 text-sm text-zinc-400">
        <li className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Condiciones comerciales: {condicionesData?.condiciones_comerciales?.name}
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Contrato firmado: Versión {contractData?.contract_version}
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Datos del cliente: Completos
        </li>
      </ul>
    </div>

    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
      <p className="text-sm text-amber-300">
        ⚠️ Esta acción es irreversible. Se creará el evento y la cotización quedará autorizada.
      </p>
    </div>
  </div>
</ZenDialog>
```

### 2. Vista Post-Autorización en Promise

**Ubicación:** `PromiseClosingProcessSection.tsx` ✅ **YA PREPARADO**

**Lógica actual (líneas 93-100, 218-234):**

- Ya busca cotización en cierre/aprobada/autorizada (línea 93-100)
- Ya muestra `PromiseClosingProcessCard` cuando encuentra cotización en cierre/aprobada/autorizada (línea 218-234)
- Necesitamos actualizar para mostrar `CotizacionAutorizadaCard` cuando `status === 'autorizada' && evento_id !== null`

**Implementación:**

```typescript
// En PromiseClosingProcessSection.tsx

// Buscar cotización autorizada con evento
const cotizacionAutorizada = cotizaciones.find(
  (c) => c.status === 'autorizada' && c.evento_id && !c.archived
);

// Buscar cotización en cierre o aprobada (sin autorizar aún)
const closingOrApprovedQuote = cotizaciones.find(
  (c) =>
    (c.status === 'en_cierre' || c.status === 'aprobada' || c.status === 'approved') &&
    c.status !== 'autorizada' &&
    !c.archived
);

// Mostrar CotizacionAutorizadaCard si está autorizada
if (cotizacionAutorizada && promiseId) {
  return (
    <CotizacionAutorizadaCard
      cotizacion={cotizacionAutorizada}
      eventoId={cotizacionAutorizada.evento_id!}
      studioSlug={studioSlug}
    />
  );
}

// Mostrar PromiseClosingProcessCard si está en cierre/aprobada
if (closingOrApprovedQuote && promiseId) {
  return (
    <PromiseClosingProcessCard
      // ... props normales
    />
  );
}
```

**Componente:** `CotizacionAutorizadaCard.tsx`

```typescript
export function CotizacionAutorizadaCard({
  cotizacion,
  eventoId,
  studioSlug,
}: {
  cotizacion: CotizacionListItem;
  eventoId: string;
  studioSlug: string;
}) {
  const router = useRouter();
  const condiciones = getCondicionesComerciales(cotizacion);
  const contrato = getContrato(cotizacion);

  return (
    <ZenCard>
      <ZenCardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Cotización Autorizada
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Evento creado exitosamente
            </p>
          </div>
        </div>
      </ZenCardHeader>

      <ZenCardContent>
        <div className="space-y-4">
          {/* Resumen de Cotización */}
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              Resumen de Cotización
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Total:</dt>
                <dd className="text-white font-semibold">
                  ${cotizacion.price.toLocaleString('es-MX')} MXN
                </dd>
              </div>
              {condiciones && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">Condiciones:</dt>
                    <dd className="text-zinc-300">{condiciones.name}</dd>
                  </div>
                  {condiciones.discount_percentage && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-400">Descuento:</dt>
                      <dd className="text-emerald-400">
                        {condiciones.discount_percentage}%
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          {/* Contrato Firmado */}
          {contrato && contrato.signed_at && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-300">
                  Contrato Firmado
                </h3>
              </div>
              <p className="text-xs text-emerald-400">
                Firmado el {new Date(contrato.signed_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}

          {/* Botón para ir al evento */}
          <ZenButton
            variant="primary"
            onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventoId}`)}
            className="w-full"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Gestionar Evento
          </ZenButton>

          <p className="text-xs text-zinc-500 text-center mt-2">
            Este evento ya fue creado y está en gestión
          </p>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
```

### 3. Ocultar Cotización Autorizada del Panel

**Archivo:** `PromiseQuotesPanel.tsx` ✅ **YA IMPLEMENTADO**

**Lógica actual (líneas 288-290):**

- Ya filtra cotizaciones para el listado excluyendo `aprobada`, `autorizada`, `approved`, `en_cierre` (a menos que estén archivadas o canceladas)
- Ya maneja el filtro de archivadas (líneas 148-156, 242-248)
- La cotización en cierre/aprobada/autorizada se muestra en `PromiseClosingProcessCard` (no en el panel)

**No requiere cambios adicionales** - El filtro ya está implementado correctamente.

---

## ✅ Checklist de Implementación

### Fase 1: Base de Datos

- [ ] Crear migración SQL manualmente en `/supabase/migrations/`
- [ ] Ejecutar migración en desarrollo
- [ ] Actualizar Prisma schema con campos snapshot
- [ ] Generar tipos de Prisma (`npx prisma generate`)

### Fase 2: Server Actions

- [ ] Crear `autorizarYCrearEvento` en `cotizaciones-cierre.actions.ts`
- [ ] Crear helpers `getCondicionesComerciales` y `getContrato`
- [ ] Implementar validaciones pre-autorización: contrato firmado SOLO si `selected_by_prospect === true`
- [ ] Implementar transacción atómica completa
- [ ] Agregar manejo de errores y rollback

### Fase 3: UI - Botón de Autorización

- [ ] Agregar botón "Autorizar y Crear Evento" en `PromiseClosingProcessCard`
- [ ] Implementar validación de requisitos (`puedeAutorizar`) con lógica: contrato firmado SOLO si `selected_by_prospect === true`
- [ ] Crear modal de confirmación con resumen
- [ ] Implementar lógica de autorización
- [ ] Agregar toast de éxito/error
- [ ] Implementar redirección al evento

### Fase 4: UI - Vista Post-Autorización

- [ ] Implementar redirección automática al evento después de autorizar
- [ ] Crear `CotizacionAutorizadaCard` con botón "Gestionar Evento"
- [ ] Actualizar `PromiseClosingProcessSection` para mostrar `CotizacionAutorizadaCard` cuando `status === 'autorizada' && evento_id !== null`
- [ ] Botón "Gestionar Evento" redirige a `/events/[eventoId]`
- [x] Filtrar panel de cotizaciones: ✅ **YA IMPLEMENTADO** en `PromiseQuotesPanel.tsx`

### Fase 5: Actualizar Queries Existentes

- [ ] Identificar componentes que leen condiciones comerciales
- [ ] Actualizar para usar helper `getCondicionesComerciales`
- [ ] Identificar componentes que leen contratos
- [ ] Actualizar para usar helper `getContrato`
- [ ] Actualizar reportes y vistas

### Fase 6: Testing

- [ ] Probar autorización con todos los datos completos
- [ ] Verificar snapshots guardados correctamente
- [ ] Verificar evento creado con datos correctos
- [ ] Verificar promesa cambia a etapa "aprobado"
- [ ] Verificar registro temporal eliminado
- [ ] Verificar otras cotizaciones archivadas
- [ ] Verificar redirección al evento
- [ ] Probar validaciones (contrato sin firmar, datos incompletos)
- [ ] Verificar que cambios en tablas maestras no afectan cotizaciones autorizadas
- [ ] Probar autorización con cotización seleccionada por prospecto (requiere contrato firmado)
- [ ] Probar autorización con cotización NO seleccionada por prospecto (no requiere contrato firmado)

### Fase 7: Migración de Datos Existentes (Opcional)

- [ ] Crear script de migración para cotizaciones autorizadas legacy
- [ ] Ejecutar migración en desarrollo
- [ ] Validar integridad de datos migrados
- [ ] Ejecutar en producción

---

## 🎯 Decisión de UI: Implementación Completa

**Flujo después de autorizar:**

1. **Redirigir al evento** (para continuar gestión)
2. **Mostrar card de resumen en Promise** (para consulta posterior)

**Razones para mantener card en Promise:**

- ✅ Estudio puede consultar qué se autorizó
- ✅ Antecedente visible del cierre
- ✅ Acceso rápido al evento desde promise
- ✅ Resumen de cotización, condiciones y contrato

**Implementación:**

```typescript
// 1. Después de autorización exitosa
toast.success('¡Cotización autorizada y evento creado!');
router.push(`/${studioSlug}/studio/business/events/${eventoId}`);

// 2. En Promise: Reemplazar PromiseClosingProcessCard con CotizacionAutorizadaCard
{cotizacion.status === 'autorizada' && cotizacion.evento_id ? (
  <CotizacionAutorizadaCard
    cotizacion={cotizacion}
    eventoId={cotizacion.evento_id}
    studioSlug={studioSlug}
  />
) : (
  <PromiseClosingProcessCard {...props} />
)}
```

**En el panel de cotizaciones:**

- Solo mostrar cotizaciones: `pendiente`, `en_cierre`
- NO mostrar: `autorizada` (ya está en card de evento autorizado)
- NO mostrar: `archivada` (histórico)

---

## 📝 Notas Importantes

1. **Inmutabilidad:** Los snapshots NO deben modificarse después de autorizar
2. **Linealidad:** No hay vuelta atrás después de autorizar
3. **Validación estricta:** Contrato DEBE estar firmado antes de autorizar **SOLO si `selected_by_prospect === true`** (cotización seleccionada por prospecto)
4. **Transacción atómica:** Todo o nada (rollback automático en caso de error)
5. **Trazabilidad:** Log completo de la autorización
6. **Limpieza:** Eliminar registro temporal después de autorizar

---

## 🔄 Flujo Visual Completo

```
┌─────────────────────────────────────────┐
│  PROMISE: En Negociación                │
│  ─────────────────────────────────────  │
│  • Cotización en cierre                 │
│  • Condiciones definidas ✅             │
│  • Contrato firmado ✅                  │
│  • Datos completos ✅                   │
│                                          │
│  [Autorizar y Crear Evento]             │
└─────────────────────────────────────────┘
              │
              │ Click
              ▼
┌─────────────────────────────────────────┐
│  MODAL: Confirmación                    │
│  ─────────────────────────────────────  │
│  Resumen:                                │
│  ✅ Condiciones: Pago de contado        │
│  ✅ Contrato: Firmado v1                │
│  ✅ Datos: Completos                    │
│                                          │
│  ⚠️  Acción irreversible                │
│                                          │
│  [Cancelar] [Confirmar Autorización]    │
└─────────────────────────────────────────┘
              │
              │ Confirmar
              ▼
┌─────────────────────────────────────────┐
│  PROCESANDO...                          │
│  ─────────────────────────────────────  │
│  • Creando snapshots                    │
│  • Creando evento                       │
│  • Actualizando cotización              │
│  • Cambiando etapa de promesa           │
│  • Limpiando datos temporales           │
└─────────────────────────────────────────┘
              │
              │ Éxito
              ▼
┌─────────────────────────────────────────┐
│  TOAST: ¡Cotización autorizada!         │
│  REDIRECT: /events/[eventoId]           │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  EVENTO: Vista de Gestión               │
│  ─────────────────────────────────────  │
│  • Información del evento               │
│  • Cotización autorizada (snapshot)     │
│  • Tareas y entregables                 │
│  • Pagos y finanzas                     │
│  • Timeline del proyecto                │
└─────────────────────────────────────────┘
```

---

---

## 📌 Resumen Ejecutivo

### Flujo Completo

1. Usuario en Promise → Cotización en cierre
2. Click "Autorizar y Crear Evento" → Validaciones
3. Transacción atómica → Crear snapshots + Evento
4. Redirigir a `/events/[eventoId]`
5. Promise muestra `CotizacionAutorizadaCard` con botón "Gestionar Evento"

### Panel de Cotizaciones

- ✅ Mostrar: `pendiente`, `en_cierre`
- ❌ NO mostrar: `autorizada`, `archivada`

### Card de Evento Autorizado (en Promise)

- Resumen de cotización
- Condiciones comerciales (snapshot)
- Contrato firmado (snapshot)
- Botón "Gestionar Evento" → `/events/[eventoId]`

### Migraciones

- Crear manualmente en `/supabase/migrations/`
- Campos snapshot en `studio_cotizaciones`
- Actualizar Prisma schema

---

**Documento creado:** 2026-01-04  
**Última actualización:** 2026-01-04  
**Estado:** Listo para implementación  
**Prioridad:** Alta
