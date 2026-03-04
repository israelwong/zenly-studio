# 📚 Documentación Técnica - ZEN Platform

**Centro de conocimiento técnico para desarrollo en ZEN**

Última actualización: 2 de febrero de 2026

---

## 📂 Estructura de Documentación

La documentación está organizada en **8 carpetas temáticas** para facilitar navegación y mantenimiento:

```
.cursor/docs/
├── 🎯 masters/        → Fuentes únicas de verdad (SSOT)
├── 🏗️  architecture/   → Diseño y arquitectura del sistema
├── 🔐 auth/           → Autenticación y autorización
├── 📊 audits/         → Auditorías técnicas del sistema
├── 🔍 analysis/       → Análisis y propuestas técnicas
├── 📐 patterns/       → Patrones de código y estándares
├── 🚀 features/       → Implementación de funcionalidades
├── 💼 business/       → Reglas de negocio y planes
├── 🔧 solutions/      → Soluciones a problemas específicos
└── ⚙️  config/         → Configuraciones y schemas
```

---

## 🎯 Masters - Fuentes Únicas de Verdad (SSOT)

**📁 [masters/](masters/)**

| Documento | Dominio |
|-----------|---------|
| [sistema-sincronizacion-maestro.md](masters/sistema-sincronizacion-maestro.md) | Sistema de snapshots y sincronización Catálogo → Cotizaciones |
| [MASTER_FINANCIAL_SSOT_GUIDE.md](masters/MASTER_FINANCIAL_SSOT_GUIDE.md) | Sistema financiero: cálculo de precios, gastos, utilidades |
| [ISRAEL-ALGORITHM-TASK-REORDER-MASTER.md](masters/ISRAEL-ALGORITHM-TASK-REORDER-MASTER.md) | Algoritmo de reordenamiento drag & drop en Scheduler |
| [MASTER_DATE_SSOT_GUIDE.md](masters/MASTER_DATE_SSOT_GUIDE.md) | Manejo de fechas y zonas horarias |

**Úsalos primero:** Estos son las referencias definitivas para sus dominios.

---

## 🏗️ Architecture - Arquitectura del Sistema

**📁 [architecture/](architecture/)**

| Documento | Descripción |
|-----------|-------------|
| [README.md](architecture/README.md) | Índice de arquitectura |
| [ARCHITECTURE_QUOTATION.md](architecture/ARCHITECTURE_QUOTATION.md) | Arquitectura completa de cotizaciones y refactor semántico |
| [cotizacion-a-paquete.md](architecture/cotizacion-a-paquete.md) | Flujo de conversión cotización → paquete con persistencia de custom items |
| [snapshot-field-mapping.md](architecture/snapshot-field-mapping.md) | Mapeo bidireccional operational_category ↔ task_type (snapshots) |
| [precios-resiliencia.md](architecture/precios-resiliencia.md) | Motor de precios de paquetes y resiliencia DB |
| [tenant.md](architecture/tenant.md) | Sistema multi-tenant |
| [promises-kanban-system.md](architecture/promises-kanban-system.md) | Sistema de promesas y pipeline |
| [contracts-flow.md](architecture/contracts-flow.md) | Flujo de contratos |
| [direct-navigator.md](architecture/direct-navigator.md) | Navegación directa |
| [promise-detalle.md](architecture/promise-detalle.md) | Detalle de promesas |
| [redireccionamiento-promesas.md](architecture/redireccionamiento-promesas.md) | Redirects de promesas (incl. post-firma y stayOnCierreRef) |
| [arquitectura-contratos-y-condiciones.md](architecture/arquitectura-contratos-y-condiciones.md) | **SSOT** contratos y condiciones (persistencia, visualización, fixes) |

---

## 🔐 Auth - Autenticación y Autorización

**📁 [auth/](auth/)** ⭐

| Documento | Descripción |
|-----------|-------------|
| **[AUTENTICACION_MASTER.md](auth/AUTENTICACION_MASTER.md)** | Sistema completo de autenticación (login, OAuth, sesiones) |
| **[ONBOARDING.md](auth/ONBOARDING.md)** | Registro, roles y estructura multi-usuario |
| [README.md](auth/README.md) | Índice de documentación de auth |
| **[admin-waitlist-strategy.md](admin-waitlist-strategy.md)** | Estrategia Admin: usuarios en waitlist (query, panel futuro, notificaciones) |

**Start here:** Para todo lo relacionado con login, sesiones y permisos.

---

## 📊 Audits - Auditorías Técnicas

**📁 [audits/](audits/)**

| Documento | Alcance |
|-----------|---------|
| [AUDITORIA_SEGURIDAD_AUTH.md](audits/AUDITORIA_SEGURIDAD_AUTH.md) | Seguridad de autenticación |
| [AUDITORIA_CUENTA_PERFIL_SEGURIDAD.md](audits/AUDITORIA_CUENTA_PERFIL_SEGURIDAD.md) | Gestión de cuentas y perfiles |
| [AUDITORIA_SCOPES_Y_IDENTIDAD_OAUTH.md](audits/AUDITORIA_SCOPES_Y_IDENTIDAD_OAUTH.md) | OAuth y permisos de Google |
| [PRISMA_AUTH_ESTUDIOS_AUDIT.md](audits/PRISMA_AUTH_ESTUDIOS_AUDIT.md) | Base de datos de autenticación |

**Nota:** Verificar fecha de auditoría (< 3 meses = confiable).

---

## 🔍 Analysis - Análisis y Propuestas

**📁 [analysis/](analysis/)**

| Documento | Tema |
|-----------|------|
| [ANALISIS_GOOGLE_APIS_ESCALABILIDAD.md](analysis/ANALISIS_GOOGLE_APIS_ESCALABILIDAD.md) | Escalabilidad Google APIs |
| [analisis-refactorizacion-cotizaciones-items-custom.md](analysis/analisis-refactorizacion-cotizaciones-items-custom.md) | Refactor cotizaciones |
| [analisis-ruta-cierre.md](analysis/analisis-ruta-cierre.md) | Flujo de cierre de ventas |
| [analisis-studio-event-types-refactor.md](analysis/analisis-studio-event-types-refactor.md) | Refactor tipos de eventos |
| [analisis-visibilidad-condiciones-comerciales.md](analysis/analisis-visibilidad-condiciones-comerciales.md) | UX condiciones comerciales |

---

## 📐 Patterns - Patrones y Estándares

**📁 [patterns/](patterns/)**

| Documento | Patrón |
|-----------|--------|
| **[PATRON_VALIDACION_USUARIO.md](patterns/PATRON_VALIDACION_USUARIO.md)** ⭐ | Validar usuario en Server Actions |
| [ESTANDAR_NAVEGACION_Y_PERFORMANCE_COMERCIAL.md](patterns/ESTANDAR_NAVEGACION_Y_PERFORMANCE_COMERCIAL.md) | UX y navegación comercial |
| [protocolo-optimizacion-zenly.md](patterns/protocolo-optimizacion-zenly.md) | Optimización general |

**Sigue estos patrones:** Mantiene consistencia en el código.

---

## 🚀 Features - Funcionalidades Implementadas

**📁 [features/](features/)**

| Documento | Feature |
|-----------|---------|
| **[google-oauth-implementation.md](features/google-oauth-implementation.md)** | OAuth con Google (Calendar/Drive) |
| [Google_Drive_implementacion.md](features/Google_Drive_implementacion.md) | Integración con Drive |
| [KANBAN_PROMISES.md](features/KANBAN_PROMISES.md) | Sistema Kanban de promesas |
| [SCHEDULING_SYSTEM.md](features/SCHEDULING_SYSTEM.md) | Sistema de agendamiento |
| [sistema-notificaciones.md](features/sistema-notificaciones.md) | Notificaciones |
| [sistema-permisos-equipo-studio.md](features/sistema-permisos-equipo-studio.md) | Permisos y roles |
| [SMART_ITEM_LINKS.md](features/SMART_ITEM_LINKS.md) | Enlaces inteligentes |
| [WHATSAPP_SMART_COMPOSER.md](features/WHATSAPP_SMART_COMPOSER.md) | Composer de WhatsApp |
| [cotizacion-a-paquete-modal.md](features/cotizacion-a-paquete-modal.md) | Modal de conversión Cotización → Paquete |
| [FASE_8_3_MODAL_ARMONICO.md](features/FASE_8_3_MODAL_ARMONICO.md) | Refactor estético modal paquetes |
| [FASE_8_3_BOTON_HEADER.md](features/FASE_8_3_BOTON_HEADER.md) | Reubicación botón "Guardar como paquete" |
| [FASE_8_5_FIX_BOTON_CERRAR.md](features/FASE_8_5_FIX_BOTON_CERRAR.md) | Fix botón X del modal |
| [FASE_9_0_AUDITORIA_PERSISTENCIA.md](features/FASE_9_0_AUDITORIA_PERSISTENCIA.md) | Auditoría persistencia bono y cortesías |

---

## 💼 Business - Reglas de Negocio

**📁 [business/](business/)**

| Documento | Dominio |
|-----------|---------|
| [BUSINESS_PLANS_AND_TRIAL.md](business/BUSINESS_PLANS_AND_TRIAL.md) | Planes y trial |
| [RESUMEN_CONTRATACION_DESCUENTO_SSoT.md](business/RESUMEN_CONTRATACION_DESCUENTO_SSoT.md) | Contratación y descuentos |
| [MANEJO_FECHAS.md](business/MANEJO_FECHAS.md) | Convenciones de fechas |

---

## 🔧 Solutions - Soluciones a Problemas

**📁 [solutions/](solutions/)**

| Documento | Problema Resuelto |
|-----------|-------------------|
| [solucion-storage-rls-autenticacion.md](solutions/solucion-storage-rls-autenticacion.md) | RLS de Storage bloqueaba auth |
| [OAUTH_PKCE_PROBLEM.md](solutions/OAUTH_PKCE_PROBLEM.md) | Error de code_verifier vacío |
| [FIX_CONEXIONES_DB.md](solutions/FIX_CONEXIONES_DB.md) | Too many connections |
| [refactor-posts-cuid-short-urls.md](solutions/refactor-posts-cuid-short-urls.md) | URLs largas con UUID |
| [verificacion-cotizacion-guardar-actualizar.md](solutions/verificacion-cotizacion-guardar-actualizar.md) | Lógica save vs update |

**Revisa primero:** Antes de resolver un problema similar.

---

## ⚙️ Config - Configuraciones y Schemas

**📁 [config/](config/)**

| Documento | Contenido |
|-----------|-----------|
| [CONFIG_GOOGLE_OAUTH_Y_REDIRECT.md](config/CONFIG_GOOGLE_OAUTH_Y_REDIRECT.md) | Config de Google OAuth |
| [SCHEMA_STUDIOS_EXTRACTO.md](config/SCHEMA_STUDIOS_EXTRACTO.md) | Extracto del schema de studios |

---

## 🚀 Quick Start

### Nuevo en el Proyecto

1. **Autenticación:** [auth/AUTENTICACION_MASTER.md](auth/AUTENTICACION_MASTER.md)
2. **Onboarding:** [auth/ONBOARDING.md](auth/ONBOARDING.md)
3. **Arquitectura:** [architecture/README.md](architecture/README.md)
4. **Patrones básicos:** [patterns/PATRON_VALIDACION_USUARIO.md](patterns/PATRON_VALIDACION_USUARIO.md)
5. **Reglas de negocio:** [business/](business/)

### Debugging por Categoría

| Problema | Documento |
|----------|-----------|
| Error en login/OAuth | [auth/AUTENTICACION_MASTER.md](auth/AUTENTICACION_MASTER.md) → Problemas Comunes |
| Problema con Google APIs | [features/google-oauth-implementation.md](features/google-oauth-implementation.md) |
| Error de conexión a BD | [solutions/FIX_CONEXIONES_DB.md](solutions/FIX_CONEXIONES_DB.md) |
| Problema con fechas | [masters/MASTER_DATE_SSOT_GUIDE.md](masters/MASTER_DATE_SSOT_GUIDE.md) |
| Precios incorrectos/inconsistentes | [masters/MASTER_FINANCIAL_SSOT_GUIDE.md](masters/MASTER_FINANCIAL_SSOT_GUIDE.md) |
| Problema con snapshots | [masters/sistema-sincronizacion-maestro.md](masters/sistema-sincronizacion-maestro.md) |
| Problema drag & drop Scheduler | [masters/ISRAEL-ALGORITHM-TASK-REORDER-MASTER.md](masters/ISRAEL-ALGORITHM-TASK-REORDER-MASTER.md) |
| Error de OAuth PKCE | [solutions/OAUTH_PKCE_PROBLEM.md](solutions/OAUTH_PKCE_PROBLEM.md) |
| Problema con Storage/RLS | [solutions/solucion-storage-rls-autenticacion.md](solutions/solucion-storage-rls-autenticacion.md) |

### Por Carpeta

| Necesidad | Carpeta |
|-----------|---------|
| Entender cómo funciona algo | [architecture/](architecture/) o [features/](features/) |
| Saber cómo hacer algo | [patterns/](patterns/) |
| Resolver un problema | [solutions/](solutions/) |
| Configurar un servicio | [config/](config/) |
| Validar estado del sistema | [audits/](audits/) |
| Evaluar opciones técnicas | [analysis/](analysis/) |
| Entender reglas de negocio | [business/](business/) |
| Fuente única de verdad | [masters/](masters/) |

---

## 📝 Convenciones de Documentación

### Formato de Documentos

- **Título H1:** Nombre descriptivo del tema
- **Emoji:** Usar emoji relevante en títulos para facilitar navegación
- **Índice:** Todos los docs largos deben tener índice
- **Fecha:** Incluir última actualización
- **Estado:** Indicar si está completo, parcial o pendiente

### Tipos de Documentos

- **MASTER:** Fuente única de verdad (ej: AUTENTICACION_MASTER.md)
- **AUDITORIA:** Análisis de estado actual
- **ANALISIS:** Propuestas y decisiones técnicas
- **README:** Índices y guías de navegación
- **Sin prefijo:** Documentación específica de componente/sistema

### Actualización

Cuando actualices un documento:
1. Cambiar fecha en el encabezado
2. Agregar entrada en "Historial de Cambios" (si existe)
3. Actualizar referencias cruzadas si cambia la estructura

---

## 🔍 Buscar Información

### Por Carpeta

```bash
# Ver docs por categoría
ls .cursor/docs/masters/      # Fuentes únicas de verdad
ls .cursor/docs/auth/         # Todo sobre autenticación
ls .cursor/docs/features/     # Features implementadas
ls .cursor/docs/patterns/     # Patrones de código
ls .cursor/docs/solutions/    # Soluciones a problemas
ls .cursor/docs/business/     # Reglas de negocio
ls .cursor/docs/config/       # Configuraciones
ls .cursor/docs/audits/       # Auditorías técnicas
ls .cursor/docs/analysis/     # Análisis y propuestas
```

### Por Palabra Clave

```bash
# Buscar en todos los docs
rg "keyword" .cursor/docs/

# Buscar en carpeta específica
rg "keyword" .cursor/docs/auth/
rg "keyword" .cursor/docs/features/

# Buscar archivos por nombre
find .cursor/docs -name "*oauth*"
```

### Por Tipo de Contenido

| Necesitas | Busca en |
|-----------|----------|
| Definición canónica | `masters/` |
| Cómo se autentica | `auth/` |
| Cómo funciona X | `architecture/` o `features/` |
| Cómo escribir código | `patterns/` |
| Resolver problema Y | `solutions/` |
| Estado actual | `audits/` |
| Opciones para decidir | `analysis/` |
| Configurar servicio | `config/` |
| Regla de negocio | `business/` |

---

## 🤝 Contribuir a la Documentación

### Antes de Documentar

1. **Verificar si ya existe:** Revisar este índice y buscar el tema
2. **Consolidar, no duplicar:** Si existe, actualizar en lugar de crear nuevo
3. **Referencias cruzadas:** Enlazar a otros documentos relacionados

### Guía de Estilo

- ✅ Claro y conciso
- ✅ Código de ejemplo funcional
- ✅ Diagramas cuando sea útil
- ✅ Sección de "Problemas Comunes"
- ❌ No duplicar información
- ❌ No dejar documentos desactualizados

---

## 📦 Mantenimiento y Organización

### Estructura de Carpetas

La documentación está organizada en **8 carpetas temáticas**:

```
masters/      → Documentos SSOT (4 docs)
architecture/ → Arquitectura (11 docs)
auth/         → Autenticación (3 docs)
audits/       → Auditorías (4 docs)
analysis/     → Análisis (5 docs)
patterns/     → Patrones (3 docs)
features/     → Features (8 docs)
business/     → Negocio (3 docs)
solutions/    → Soluciones (5 docs)
config/       → Config (2 docs)
```

**Total:** 48 documentos organizados

### Reglas de Organización

| Tipo de Documento | Carpeta | Ejemplo |
|-------------------|---------|---------|
| Fuente única de verdad | `masters/` | MASTER_DATE_SSOT_GUIDE.md |
| Diseño del sistema | `architecture/` | tenant.md |
| Login/OAuth/Sesiones | `auth/` | AUTENTICACION_MASTER.md |
| Análisis del estado | `audits/` | AUDITORIA_SEGURIDAD_AUTH.md |
| Evaluación de opciones | `analysis/` | ANALISIS_GOOGLE_APIS.md |
| Cómo escribir código | `patterns/` | PATRON_VALIDACION_USUARIO.md |
| Implementación completa | `features/` | google-oauth-implementation.md |
| Reglas de negocio | `business/` | BUSINESS_PLANS_AND_TRIAL.md |
| Fix de problema | `solutions/` | OAUTH_PKCE_PROBLEM.md |
| Setup de servicio | `config/` | CONFIG_GOOGLE_OAUTH.md |

### Limpieza Regular

Cada trimestre, revisar:
- ❓ Documentos desactualizados (>6 meses sin revisión)
- ❓ Información duplicada entre docs
- ❓ Docs que ya no reflejan el código actual
- ❓ Auditorías que necesitan actualización
- ❓ Soluciones que ya no son relevantes

### Versión de Documentos

Todos los docs están versionados en git.

```bash
# Ver historial de un documento
git log --follow .cursor/docs/auth/AUTENTICACION_MASTER.md

# Ver cambios recientes en docs
git log --since="1 month ago" -- .cursor/docs/
```

---

## 📅 Historial de Cambios

### 27 de febrero de 2026 (Fase 9.0)
- ✅ Creado `FASE_9_0_AUDITORIA_PERSISTENCIA.md` - Auditoría completa de persistencia bono/cortesías
- ✅ **FIX CRÍTICO:** Cortesías ahora usan IDs de catálogo global (no temporales de cotización)
- ✅ Transformación segura de `Decimal` → `number` y `Json` → `string[]`
- ✅ Actualizado tipo `PaqueteFromDB` con `bono_especial` e `items_cortesia`
- ✅ Agregados campos en `duplicarPaquete()`
- ✅ Verificada hidratación correcta en el editor de paquetes

### 27 de febrero de 2026 (Fase 8.5)
- ✅ Creado `FASE_8_5_FIX_BOTON_CERRAR.md` - Fix botón X del modal "Crear Paquete"
- ✅ Reemplazado `DialogClose` por `<button>` normal para evitar conflictos con Radix UI
- ✅ Mejorado `onEscapeKeyDown` con `preventDefault` explícito durante guardado

### 27 de febrero de 2026 (Fase 8.3)
- ✅ Creado `FASE_8_3_MODAL_ARMONICO.md` - Refactor estético del modal "Crear Paquete"
- ✅ Creado `FASE_8_3_BOTON_HEADER.md` - Reubicación de "Guardar como paquete" al header
- ✅ Reorganizado modal en 5 bloques lógicos con `space-y-6`
- ✅ Estandarizado spacing de campos con `space-y-1.5`
- ✅ Prevenido cierre accidental por click en overlay (`onPointerDownOutside`, `onInteractOutside`)
- ✅ Movido botón "Guardar como paquete" desde sidebar a header de edición
- ✅ Implementado patrón de refs para exponer handlers entre componentes
- ✅ Eliminado `Separator` redundante entre advertencias

### 27 de febrero de 2026 (Fase 8.2)
- ✅ Creado `cotizacion-a-paquete-modal.md` - Modal de configuración completo para "Guardar como Paquete"
- ✅ Actualizada `guardarCotizacionComoPaquete()` - Agregado parámetro `options` para metadatos
- ✅ Implementado modal en `CotizacionForm.tsx` - Campos: nombre, descripción, carátula (DnD), negociación, precio, horas, visibilidad
- ✅ Header y footer sticky - Mejor UX con prevención de cierre accidental
- ✅ Actualizado `cotizacion-a-paquete.md` a versión 3.0

### 27 de febrero de 2026 (Fase 8.1)
- ✅ Creado `snapshot-field-mapping.md` - Mapeo bidireccional operational_category ↔ task_type
- ✅ Fix queries a `studio_cotizacion_items` - Corregido uso de task_type en snapshots
- ✅ Agregado `taskTypeToOperationalCategory()` en cotizaciones.actions.ts
- ✅ Fix conversión snapshot → catálogo en guardarCotizacionComoPaquete

### 27 de febrero de 2026 (PM - Fase 8.0)
- ✅ Creado `cotizacion-a-paquete.md` - Flujo de conversión con persistencia automática de custom items
- ✅ Fix `guardarCotizacionComoPaquete()` - Persistencia de custom items, validación items_cortesia
- ✅ Actualizado modal de confirmación con aviso preventivo

### 27 de febrero de 2026 (AM)
- ✅ Creado `sistema-sincronizacion-maestro.md` - Documenta Ley de Actualización Atómica
- ✅ Actualizado `MASTER_FINANCIAL_SSOT_GUIDE.md` - Documenta fix de `obtenerCatalogo()`
- ✅ Creado `ARCHITECTURE_QUOTATION.md` - Documenta refactor semántico event_duration
- ✅ Creado `masters/README.md` - Índice de documentos maestros
- ✅ Actualizado referencias cruzadas entre documentos

### 2 de febrero de 2026
- ✅ **Reorganización completa** de documentación en 8 carpetas temáticas
- ✅ Creado README.md para cada carpeta
- ✅ Actualizado README.md principal con nueva estructura
- ✅ 44 documentos reorganizados y categorizados

### 2 de febrero de 2026 (AM)
- ✅ Creado AUTENTICACION_MASTER.md (943 líneas)
- ✅ Creado ONBOARDING.md (363 líneas)
- ✅ Eliminados documentos redundantes (AUTH_AND_ONBOARDING, SESSION_MANAGEMENT)
- ✅ Consolidada documentación de autenticación

---

**¿Preguntas o mejoras?** Contacta al equipo de desarrollo.
