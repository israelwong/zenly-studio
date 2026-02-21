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

### 2. Flujos (paso a paso)
**Carpeta:** [flujos/](flujos/)

Documentos de flujos operativos (UI → acciones → servidor) para cierre, autorización, etc. Índice en `flujos/README.md`.

| Documento | Descripción |
|-----------|-------------|
| [flujo-cierre-cotizacion.md](flujos/flujo-cierre-cotizacion.md) | Pasar a cierre (público y estudio), archivado, cancelar cierre. |
| [contracts-flow.md](contracts-flow.md) | Flujo de contratos: generación, firma, regeneración (público + Studio). |

**Cuándo consultar:** Entender secuencia exacta de un flujo; homologar comportamiento entre rutas (ej. público vs estudio). Índice completo y referencias a analysis en [flujos/README.md](flujos/README.md).

---

### 3. Panel de Gestión Logística (Scheduler)
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

## 🏗️ Estructura de Carpetas

```
.cursor/docs/
├── architecture/           # ← ESTÁS AQUÍ
│   ├── README.md          # Este archivo
│   ├── flujos/            # Flujos paso a paso (cierre, autorización, etc.)
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
