# Documentación de Arquitectura - ZENPro

Esta carpeta contiene la documentación arquitectónica definitiva del sistema.

---

## 📚 Documentos Disponibles

### 1. Arquitectura de Cotizaciones
**Migrado a SSOT:** [20.20-studio-promises-arquitectura-master](../ssot/20.20-studio-promises-arquitectura-master.md)

**Contenido:** Modelo datos, event_duration, billing_type, Ley Actualización Atómica, integración scheduler.

**Cuándo consultar:** Crear/editar cotizaciones; cálculo subtotales; snapshots; onboarding.

---

### 2. Flujo de Autorización de Promesas Públicas
**Archivo:** `public-promise-authorization-flow.md`  
**Versión:** 2.0 (Post-Authorization Lock)  
**Estado:** ✅ Producción

**Contenido:**
- Resumen ejecutivo del problema y solución
- Arquitectura completa del sistema
- Flujo de autorización paso a paso
- Authorization Lock (6 puntos de control)
- Componentes clave y sus responsabilidades
- Optimizaciones implementadas
- Testing y verificación
- Métricas de impacto

**Cuándo consultar:**
- Entender el flujo de autorización cliente
- Depurar problemas con el Progress Overlay
- Entender el sistema de locks de navegación
- Revisar optimizaciones de performance
- Onboarding de nuevos desarrolladores

---

### 3. Flujo: Cotización a Paquete
**Archivo:** `cotizacion-a-paquete.md`  
**Versión:** 2.0 (Post-Fix Persistencia)  
**Estado:** ✅ Producción

**Contenido:**
- Conversión de cotización exitosa a paquete reutilizable
- Persistencia automática de custom items al catálogo global
- Validación de items_cortesia (filtrado de IDs inválidos)
- Modal de confirmación con aviso preventivo
- Transacción atómica (6 fases)
- Casos de uso (con/sin custom items, con bonos/cortesías)
- Testing y validación

**Cuándo consultar:**
- Implementar/mantener flujo "Guardar como paquete"
- Depurar errores FK en paquete_items
- Entender persistencia de custom items
- Validar integridad de items_cortesia

---

### 4. Mapeo de Campos Snapshot y Persistencia
**Migrado a SSOT:** [20.22-shared-promises-snapshots-persistence](../ssot/20.22-shared-promises-snapshots-persistence.md)

**Contenido:** operational_category↔task_type, persistencia al autorizar, generateFinancialSummaryHtml, getSnapTotalFinalForEvento.

**Cuándo consultar:** Error "Unknown field operational_category"; conversión catálogo↔cotización; sincronización scheduler.

---

### 5. Arquitectura de Precios y Resiliencia (Paquetes)
**Migrado a SSOT:** [30.10-shared-finanzas-pricing-resilience](../ssot/30.10-shared-finanzas-pricing-resilience.md)

**Contenido:** Motor precios, formateador, charm rounding, 4 nodos congruencia.

**Cuándo consultar:** Motor pricing paquetes; precios inconsistentes vitrina/comparador; charm .99.

---

### 5. Flows (flujos paso a paso)
**Migrados a SSOT:** [ssot/](ssot/) — Dominio 20

| Documento | Descripción |
|-----------|-------------|
| [20.11-studio-promises-flow-autorizar-evento](../ssot/20.11-studio-promises-flow-autorizar-evento.md) | Autorizar y crear evento: transacción, snapshots, overlay, redirect |
| [20.12-studio-promises-flow-cierre](../ssot/20.12-studio-promises-flow-cierre.md) | SSOT cierre: Pasar a cierre (público + manual), pantalla cierre, SSOT financiero |
| [20.13-studio-promises-flow-contratos](../ssot/20.13-studio-promises-flow-contratos.md) | Contratos: generación, firma, regeneración (público + Studio) |
| [20.14-studio-promise-flow-autorizacion-publica](../ssot/20.14-studio-promise-flow-autorizacion-publica.md) | Autorización pública: Provider, Lock, overlay |

**Cuándo consultar:** Entender secuencia exacta de un flujo; homologar comportamiento entre rutas (ej. público vs estudio).

---

### 5a. Rutas de promesa (por scope)
**Documentación activa:** `promesa-cierre.md`, `promesa-pendiente.md` + [20.12-studio-promises-flow-cierre](../ssot/20.12-studio-promises-flow-cierre.md)

| Documento | Descripción |
|-----------|-------------|
| [promesa-cierre.md](promesa-cierre.md) | Ruta **cierre**: page, layout, 3 columnas, CotizacionCard, ContratoDigitalCard, ActivacionOperativaCard, CierreActionButtons, flujos Autorizar/Cancelar. |
| [promesa-pendiente.md](promesa-pendiente.md) | Ruta **pendiente**: cadenero, carga datos (Protocolo Zenly), layout 3 columnas, PromiseQuotesPanel, modales. |

**Criterio redirección:** `determinePromiseState`, `getPromisePathFromState` en `src/lib/utils/promise-navigation.ts` y `promise-state.actions.ts`.

**Cuándo consultar:** Mantener o extender una pantalla de detalle de promesa; entender qué muestra cada ruta y con qué componentes.

---

### 5b. Contratos y condiciones comerciales (SSOT)
**Migrado a SSOT:** [20.24-studio-promises-contratos-legal-base](../ssot/20.24-studio-promises-contratos-legal-base.md)

**Contenido:** Modelo datos, ContractPreview, bloques @cotizacion_autorizada/@condiciones_comerciales, getEventContractData/getPromiseContractData, fixes.

Stubs: [visualizacion-contrato.md](visualizacion-contrato.md), [renderizado-contratos.md](renderizado-contratos.md). Snapshots: [20.22](../ssot/20.22-shared-promises-snapshots-persistence.md). Flow: [20.13](../ssot/20.13-studio-promises-flow-contratos.md).

**Cuándo consultar:** Visualizar contrato en nueva pantalla; depurar bloque duplicado/incompleto; error Decimal.

---

### 6. Arquitectura Promesa Cierre
**Archivo:** [promesa-cierre.md](promesa-cierre.md)  
**Estado:** ✅ Referencia

**Contenido:**
- Resumen del flujo de cierre (entrada, salida normal, cancelar cierre)
- Rutas y cadenero de la página cierre
- Modelo de datos: `studio_cotizaciones_cierre`, versiones de contrato
- Flujo de datos: `obtenerRegistroCierre`, `usePromiseCierreLogic`, desglose y auditoría
- Componentes principales (CotizacionCard, columnas, CierreActionButtons)
- Server Actions en cotizaciones-cierre.actions y cotizaciones.actions
- Coherencia financiera (Resumen de Cierre, calcularRentabilidadGlobal)
- Realtime y actualización local
- Referencia rápida de archivos

**Cuándo consultar:**
- Mantener o extender la página de cierre
- Depurar condiciones, contrato, pago o desglose
- Recuperar comportamiento tras cambios
- Onboarding en el flujo estudio → cierre → autorización

---

### 7. Arquitectura Promesa Pendiente
**Archivo:** [promesa-pendiente.md](promesa-pendiente.md)  
**Estado:** ✅ Referencia

**Contenido:**
- Resumen del estado pendiente (entrada, pasar a cierre, autorizar)
- Cadenero y criterio `determinePromiseState` para pendiente
- Carga de datos en servidor (Protocolo Zenly): condiciones, cotizaciones, share, logs, agendamiento, recordatorio
- Layout 3 columnas: EventInfoCard, PromiseQuotesPanel (cotizaciones + Pasar a cierre), Seguimiento/Cita/Bitácora
- Modales: EventFormModal, AuthorizeCotizacionModal, ConfirmarCierreModal
- Flujos Pasar a cierre y Autorizar desde pendiente
- Server Actions y referencia de archivos

**Cuándo consultar:**
- Mantener o extender la página pendiente
- Entender lista de cotizaciones, DnD, archivar, pasar a cierre
- Depurar redirecciones entre pendiente / cierre / autorizada
- Onboarding en el flujo promesa detalle

---

### 8. Panel de Gestión Logística (Scheduler)
**Migrado a SSOT:** [40.06-studio-operaciones-logistica-panel](../ssot/40.06-studio-operaciones-logistica-panel.md)

**Contenido:** PublicationSummarySheet (trigger en cabecera), LogisticsTaskCard, presupuestos, nómina.

**Cuándo consultar:** Panel logístico, barra scheduler, presupuestos o nómina. Ver también: [40.03](../ssot/40.03-israel-algorithm-task-reorder.md) (DnD).

---

### 9. Componentes compartidos (precio / cierre)
**Migrados a SSOT:** [ssot/](../ssot/) — Dominio 20

| Documento | Descripción |
|-----------|-------------|
| [20.15-studio-component-cotizacion-detail-sheet](../ssot/20.15-studio-component-cotizacion-detail-sheet.md) | CotizacionDetailSheet: vista previa, props, Realtime, persistencia |
| [20.16-studio-component-resumen-pago](../ssot/20.16-studio-component-resumen-pago.md) | ResumenPago: props, estados, fórmulas anticipo, paridad Cierre/Autorizada |

**Cuándo consultar:** Mantener o extender el bloque "Resumen de Cierre/Pago"; asegurar paridad Cierre vs Autorizada; no romper cálculo de anticipo ni precisión de centavos (ver también Master [30.02-calculo-utilidad-financiera.md](../ssot/30.02-calculo-utilidad-financiera.md) §8).

---

## 🏗️ Estructura de Carpetas

```
.cursor/docs/
├── architecture/           # ← ESTÁS AQUÍ
│   ├── README.md          # Este archivo
│   ├── flows/             # (Migrado a ssot/) Flujos paso a paso (cierre, contratos, autorización)
│   ├── promises/         # Rutas de promesa por scope (pendiente, cierre, autorizada)
│   │   ├── README.md     # Índice y criterio de redirección
│   │   ├── cierre.md     # Doc detallada ruta cierre
│   │   └── ...
│   └── ... (contracts-flow, promise-detalle, etc.)
│
├── analysis/              # Análisis técnicos específicos
│   └── ... (análisis puntuales)
│
├── blueprints/            # Diseños de features futuras
│   └── ... (specs de features)
│
└── audits/                # Auditorías y debugging
    └── ... (forensic logs)
```

---

## 🎯 Principios de Documentación en Architecture

### Cuándo agregar un documento aquí:

✅ **SÍ agregar si:**
- Es documentación de sistema (no temporal)
- Describe arquitectura fundamental
- Es referencia para múltiples features
- Debe perdurar en el tiempo
- Es "single source of truth"

❌ **NO agregar si:**
- Es análisis puntual (va en `/analysis/`)
- Es diseño de feature futura (va en `/blueprints/`)
- Es debugging temporal (va en `/audits/`)
- Es nota de desarrollo (va en código como comentario)

---

## 📝 Formato Recomendado

Cada documento en `architecture/` debe seguir esta estructura:

```markdown
# Título: Nombre del Sistema/Feature

**Última actualización:** YYYY-MM-DD
**Estado:** [✅ Producción | 🔄 En Desarrollo | 🚧 Deprecado]
**Versión:** X.Y

---

## Resumen Ejecutivo
(Problema, solución, resultado en < 200 palabras)

## Arquitectura del Sistema
(Componentes, jerarquía, diagrams)

## Flujo Completo
(Step-by-step con código)

## Componentes Clave
(Detalle de cada componente)

## Testing y Verificación
(Casos de prueba)

## Métricas
(Before/after, performance)

## Archivos del Sistema
(Lista de archivos relevantes)

## Mantenimiento Futuro
(Guías para modificaciones)
```

---

## 🔗 Enlaces Relacionados

- **Análisis técnicos:** `../analysis/`
- **Blueprints de features:** `../blueprints/`
- **Auditorías:** `../audits/`
- **Código fuente:** `../../src/`

---

**Última actualización:** 2026-03-02  
**Mantenedor:** Equipo de Desarrollo ZENPro  

**Curación 2026-03-10:** Migración a SSOT: cotizaciones (20.20), kanban (20.21), contratos (20.24), perfil (20.26), precios (30.10), panel logístico (40.06). Stubs: renderizado-contratos, visualizacion-contrato → 20.24.
