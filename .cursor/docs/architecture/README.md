# Documentación de Arquitectura - ZENPro

Esta carpeta contiene la documentación arquitectónica definitiva del sistema.

---

## 📚 Documentos Disponibles

### 1. Flujo de Autorización de Promesas Públicas
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

### 2. Flows (flujos paso a paso)
**Carpeta:** [flows/](flows/)

Documentos de flujos operativos explícitos (UI → componentes → Server Actions → servidor) para cierre, autorización, etc. Índice en `flows/README.md`.

| Documento | Descripción |
|-----------|-------------|
| [flujo-cierre-cotizacion.md](flows/flujo-cierre-cotizacion.md) | Cierre de cotización: pasar a cierre (público y estudio), pantalla de cierre, cancelar/autorizar; componentes y actions con rutas. |
| [contracts-flow.md](contracts-flow.md) | Flujo de contratos: generación, firma, regeneración (público + Studio). |

**Cuándo consultar:** Entender secuencia exacta de un flujo; homologar comportamiento entre rutas (ej. público vs estudio). Índice en [flows/README.md](flows/README.md).

---

### 3. Arquitectura Promesa Cierre
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

### 4. Arquitectura Promesa Pendiente
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

### 5. Panel de Gestión Logística (Scheduler)
**Archivo:** `panel-gestion-logistica.md`  
**Estado:** ✅ Producción

**Contenido (fuente única):**
- Resumen ejecutivo, arquitectura de componentes (PublicationBar, PublicationSummarySheet, LogisticsTaskCard)
- Obtención de datos (obtenerMetricasLogisticasEvento, obtenerEstructuraCompletaLogistica)
- Cálculo de presupuesto por tarea (esquema, función maestra, duración evento, sync cotización→scheduler)
- Nómina (entidades, estados pendiente/pagado, montos, integridad)
- Flujo de usuario, archivos del sistema, otros docs del ecosistema Scheduler, mantenimiento

**Cuándo consultar:**
- Iterar sobre el panel logístico, barra del scheduler, presupuestos o nómina
- Onboarding en Scheduler / gestión logística

---

### 6. Componentes compartidos (precio / cierre)
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

**Última actualización:** 2026-02-17  
**Mantenedor:** Equipo de Desarrollo ZENPro
