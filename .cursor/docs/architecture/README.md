# Documentación de Arquitectura - ZENPro

Esta carpeta contiene la documentación arquitectónica definitiva del sistema.

---

## 📚 Documentos Disponibles

### 1. Arquitectura de Cotizaciones
**Archivo:** `ARCHITECTURE_QUOTATION.md`  
**Versión:** 2.0 (Post-Refactor Semántico)  
**Estado:** ✅ Producción

**Contenido:**
- Modelo de datos completo (cotizaciones, items, snapshots)
- Refactor semántico: event_duration → "Horas de servicio" / "Tiempo de cobertura"
- Cálculo de precios dinámico por billing_type (HOUR, SERVICE, UNIT)
- Prioridad de horas de cobertura (cotización > promesa > null)
- Sincronización: Ley de Actualización Atómica
- Estados de cotización y permisos
- Integración con Scheduler (task_type, delivery_days)
- Negociación y precio personalizado
- Componentes UI y Server Actions

**Cuándo consultar:**
- Crear/editar cotizaciones
- Entender cálculo de subtotales dinámicos
- Depurar precios incorrectos
- Entender snapshots y sincronización
- Onboarding en sistema de cotizaciones

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

### 4. Mapeo de Campos Snapshot
**Archivo:** `snapshot-field-mapping.md`  
**Versión:** 1.0 (Fase 8.1)  
**Estado:** ✅ Producción

**Contenido:**
- Diferencia entre `operational_category` (catálogo) y `task_type` (snapshot)
- Funciones de mapeo bidireccional (`operationalCategoryToTaskType`, `taskTypeToOperationalCategory`)
- Casos de uso: crear cotización, convertir a paquete, scheduler sync
- Reglas de oro para queries a `studio_items` vs `studio_cotizacion_items`
- Frontend: ItemFormData y tipos correctos
- Archivos críticos del sistema

**Cuándo consultar:**
- Error "Unknown field operational_category" en snapshots
- Implementar conversión entre catálogo y cotización
- Queries que involucren task_type o operational_category
- Sincronización con scheduler
- Onboarding: entender arquitectura de snapshots

---

### 5. Arquitectura de Precios y Resiliencia
**Archivo:** `precios-resiliencia.md`  
**Versión:** 1.0  
**Estado:** ✅ Producción

**Contenido:**
- Single Source of Truth (SSoT) financiero
- Motor de precios de paquetes (`package-price-engine.ts`)
- Formateador visual (`package-price-formatter.ts`)
- Lógica de charm rounding
- Puntos de salida y congruencia (4 nodos críticos)
- Capa de resiliencia y retry con DB
- Testing unitarios

**Cuándo consultar:**
- Entender motor de pricing de paquetes
- Depurar precios inconsistentes entre vitrina/comparador/detalle
- Revisar lógica de charm rounding (.99)
- Solucionar errores de conexión a BD

---

### 5. Flows (flujos paso a paso)
**Carpeta:** [flows/](flows/)

Documentos de flujos operativos explícitos (UI → componentes → Server Actions → servidor) para cierre, autorización, etc. Índice en `flows/README.md`.

| Documento | Descripción |
|-----------|-------------|
| [flujo-cierre-cotizacion.md](flows/flujo-cierre-cotizacion.md) | Cierre de cotización: pasar a cierre (público y estudio), pantalla de cierre, cancelar/autorizar; componentes y actions con rutas. |
| [contracts-flow.md](flows/contracts-flow.md) | Flujo de contratos: generación, firma, regeneración (público + Studio); persistencia post-autorización y visualización. |
| [flujo-autorizar-y-crear-evento.md](flows/flujo-autorizar-y-crear-evento.md) | Autorizar y crear evento: transacción, snapshots financieros, inyección de resumen en contract_content_snapshot. |

**Cuándo consultar:** Entender secuencia exacta de un flujo; homologar comportamiento entre rutas (ej. público vs estudio). Índice en [flows/README.md](flows/README.md).

---

### 5b. Contratos y condiciones comerciales (SSOT)
**Archivo principal:** [arquitectura-contratos-y-condiciones.md](arquitectura-contratos-y-condiciones.md)  
**Estado:** ✅ SSOT (2026-03-02)

**Contenido:** Modelo de datos y tablas (studio_cotizaciones_cierre, snapshots en studio_cotizaciones), persistencia al autorizar (autorizarYCrearEvento, generateFinancialSummaryHtml, injectFinancialSummaryIntoContractContent, getSnapTotalFinalForEvento), componentes (ContractPreview, useContractRenderer), bloques especiales (@cotizacion_autorizada, @condiciones_comerciales), obtención de datos (getEventContractData, getPromiseContractData), guía para visualizar el contrato en otra vista, formatItemQuantity y ducto de datos, uso por contexto (Studio cierre, público, portal), fixes documentados (bloque duplicado, incompleto, Decimal, bienvenido), casos de uso y archivos clave.

Los archivos [persistencia-snapshots-cotizacion.md](persistencia-snapshots-cotizacion.md), [visualizacion-contrato.md](visualizacion-contrato.md) y [renderizado-contratos.md](renderizado-contratos.md) son **stubs de redirección** al SSOT. Detalle de props de ContratoSection, ContratoGestionCard, modales y portal: [components/contract-rendering-system.md](components/contract-rendering-system.md).

**Cuándo consultar:**
- Implementar o reutilizar la visualización del contrato en una nueva pantalla o modal.
- Entender qué se persiste al autorizar y por qué no hay relación a condiciones_comerciales tras la firma.
- Depurar bloque de condiciones duplicado o incompleto; error de Decimal en layout evento.

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
**Archivo:** `panel-gestion-logistica.md`  
**Estado:** ✅ Producción

**Contenido (fuente única):**
- Resumen ejecutivo, arquitectura de componentes (PublicationBar, PublicationSummarySheet, LogisticsTaskCard)
- Obtención de datos (obtenerMetricasLogisticasEvento, obtenerEstructuraCompletaLogistica)
- Cálculo de presupuesto por tarea (esquema, función maestra, horas de cobertura, sync cotización→scheduler)
- Nómina (entidades, estados pendiente/pagado, montos, integridad)
- Flujo de usuario, archivos del sistema, otros docs del ecosistema Scheduler, mantenimiento

**Cuándo consultar:**
- Iterar sobre el panel logístico, barra del scheduler, presupuestos o nómina
- Onboarding en Scheduler / gestión logística
- **Ver también:** `masters/ISRAEL-ALGORITHM-TASK-REORDER-MASTER.md` para drag & drop

---

### 9. Componentes compartidos (precio / cierre)
**Carpeta:** [components/](components/)

| Documento | Descripción |
|-----------|-------------|
| [resumen-pago.md](components/resumen-pago.md) | ResumenPago: props, estados (compact / editable / solo lectura), flujo de datos, uso de snapshots en vista Autorizada, fórmula de anticipo % sobre Total a pagar. |

**Cuándo consultar:** Mantener o extender el bloque "Resumen de Cierre/Pago"; asegurar paridad Cierre vs Autorizada; no romper cálculo de anticipo ni precisión de centavos (ver también Master [calculo-utilidad-financiera.md](../masters/calculo-utilidad-financiera.md) §8).

---

## 🏗️ Estructura de Carpetas

```
.cursor/docs/
├── architecture/           # ← ESTÁS AQUÍ
│   ├── README.md          # Este archivo
│   ├── components/       # Componentes compartidos (ResumenPago, etc.)
│   ├── flows/            # Flujos paso a paso (cierre, autorización, etc.)
│   │   ├── README.md
│   │   └── flujo-cierre-cotizacion.md
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

**Curación 2026-03-02:** Flujo cierre unificado en [flujo-cierre-cotizacion.md](flows/flujo-cierre-cotizacion.md); SSOT contratos en [arquitectura-contratos-y-condiciones.md](arquitectura-contratos-y-condiciones.md); auditoría post-firma integrada en [redireccionamiento-promesas.md](redireccionamiento-promesas.md) §4. Stubs de redirección: pasar-a-cierre-modal-flow, renderizado-contratos, visualizacion-contrato, persistencia-snapshots-cotizacion, auditoria-redireccion-post-firma.
