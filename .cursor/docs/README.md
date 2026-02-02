# 📚 Documentación Técnica - ZEN Platform

**Centro de conocimiento técnico para desarrollo en ZEN**

Última actualización: 2 de febrero de 2026

---

## 🎯 Guías Principales por Tema

### 🔐 Autenticación y Seguridad

| Documento | Descripción | Cuándo usarlo |
|-----------|-------------|---------------|
| **[auth/AUTENTICACION_MASTER.md](auth/AUTENTICACION_MASTER.md)** ⭐ | Sistema completo de autenticación | Login, OAuth, sesiones, troubleshooting |
| **[auth/ONBOARDING.md](auth/ONBOARDING.md)** ⭐ | Registro y estructura multi-usuario | Onboarding, roles, permisos |
| [PATRON_VALIDACION_USUARIO.md](PATRON_VALIDACION_USUARIO.md) | Validar usuario en Server Actions | Implementar validaciones de auth |
| [google-oauth-implementation.md](google-oauth-implementation.md) | OAuth para Calendar y Drive | Conectar servicios de Google |

📖 **Índice completo:** [auth/README.md](auth/README.md)

---

### 🏗️ Arquitectura

| Documento | Descripción |
|-----------|-------------|
| [architecture/README.md](architecture/README.md) | Índice de arquitectura |
| [architecture/tenant.md](architecture/tenant.md) | Sistema multi-tenant |
| [architecture/promises-kanban-system.md](architecture/promises-kanban-system.md) | Sistema de promesas y pipeline |
| [architecture/contracts-flow.md](architecture/contracts-flow.md) | Flujo de contratos |

---

### 💰 Financiero

| Documento | Descripción |
|-----------|-------------|
| [MASTER_FINANCIAL_SSOT_GUIDE.md](MASTER_FINANCIAL_SSOT_GUIDE.md) | Guía maestra financiera |
| [RESUMEN_CONTRATACION_DESCUENTO_SSoT.md](RESUMEN_CONTRATACION_DESCUENTO_SSoT.md) | Contratación y descuentos |
| [BUSINESS_PLANS_AND_TRIAL.md](BUSINESS_PLANS_AND_TRIAL.md) | Planes y trial |

---

### 📅 Fechas y Agenda

| Documento | Descripción |
|-----------|-------------|
| [MASTER_DATE_SSOT_GUIDE.md](MASTER_DATE_SSOT_GUIDE.md) | Guía maestra de manejo de fechas |
| [SCHEDULING_SYSTEM.md](SCHEDULING_SYSTEM.md) | Sistema de agendamiento |
| [MANEJO_FECHAS.md](MANEJO_FECHAS.md) | Convenciones de fechas |

---

### 🔔 Notificaciones y Comunicación

| Documento | Descripción |
|-----------|-------------|
| [sistema-notificaciones.md](sistema-notificaciones.md) | Sistema de notificaciones |
| [WHATSAPP_SMART_COMPOSER.md](WHATSAPP_SMART_COMPOSER.md) | Composer inteligente de WhatsApp |

---

### 🗄️ Base de Datos

| Documento | Descripción |
|-----------|-------------|
| [FIX_CONEXIONES_DB.md](FIX_CONEXIONES_DB.md) | Solución a problemas de conexión |
| [SCHEMA_STUDIOS_EXTRACTO.md](SCHEMA_STUDIOS_EXTRACTO.md) | Extracto del schema de studios |
| [solucion-storage-rls-autenticacion.md](solucion-storage-rls-autenticacion.md) | RLS y storage |

---

### 📊 Auditorías

| Documento | Descripción |
|-----------|-------------|
| [AUDITORIA_SEGURIDAD_AUTH.md](AUDITORIA_SEGURIDAD_AUTH.md) | Auditoría de seguridad |
| [AUDITORIA_CUENTA_PERFIL_SEGURIDAD.md](AUDITORIA_CUENTA_PERFIL_SEGURIDAD.md) | Auditoría de cuenta y perfil |
| [AUDITORIA_SCOPES_Y_IDENTIDAD_OAUTH.md](AUDITORIA_SCOPES_Y_IDENTIDAD_OAUTH.md) | Auditoría OAuth |
| [PRISMA_AUTH_ESTUDIOS_AUDIT.md](PRISMA_AUTH_ESTUDIOS_AUDIT.md) | Auditoría Prisma Auth |

---

### 🎨 Frontend y UX

| Documento | Descripción |
|-----------|-------------|
| [ESTANDAR_NAVEGACION_Y_PERFORMANCE_COMERCIAL.md](ESTANDAR_NAVEGACION_Y_PERFORMANCE_COMERCIAL.md) | Navegación y performance |
| [SMART_ITEM_LINKS.md](SMART_ITEM_LINKS.md) | Sistema de enlaces inteligentes |

---

### 📈 Análisis y Optimización

| Documento | Descripción |
|-----------|-------------|
| [protocolo-optimizacion-zenly.md](protocolo-optimizacion-zenly.md) | Protocolo de optimización |
| [ANALISIS_GOOGLE_APIS_ESCALABILIDAD.md](ANALISIS_GOOGLE_APIS_ESCALABILIDAD.md) | Escalabilidad Google APIs |
| [analisis-refactorizacion-cotizaciones-items-custom.md](analisis-refactorizacion-cotizaciones-items-custom.md) | Refactor cotizaciones |
| [analisis-studio-event-types-refactor.md](analisis-studio-event-types-refactor.md) | Refactor tipos de evento |
| [analisis-visibilidad-condiciones-comerciales.md](analisis-visibilidad-condiciones-comerciales.md) | Visibilidad condiciones |
| [analisis-ruta-cierre.md](analisis-ruta-cierre.md) | Análisis ruta de cierre |

---

### 🎯 Sistemas Específicos

| Documento | Descripción |
|-----------|-------------|
| [KANBAN_PROMISES.md](KANBAN_PROMISES.md) | Sistema Kanban de promesas |
| [sistema-permisos-equipo-studio.md](sistema-permisos-equipo-studio.md) | Permisos de equipo |
| [refactor-posts-cuid-short-urls.md](refactor-posts-cuid-short-urls.md) | Refactor posts y URLs |
| [verificacion-cotizacion-guardar-actualizar.md](verificacion-cotizacion-guardar-actualizar.md) | Verificación cotizaciones |

---

## 🚀 Quick Start

### Nuevo en el Proyecto

1. **Autenticación:** [auth/AUTENTICACION_MASTER.md](auth/AUTENTICACION_MASTER.md)
2. **Onboarding:** [auth/ONBOARDING.md](auth/ONBOARDING.md)
3. **Arquitectura:** [architecture/README.md](architecture/README.md)
4. **Financiero:** [MASTER_FINANCIAL_SSOT_GUIDE.md](MASTER_FINANCIAL_SSOT_GUIDE.md)

### Debugging

| Problema | Documento |
|----------|-----------|
| Error en login/OAuth | [auth/AUTENTICACION_MASTER.md](auth/AUTENTICACION_MASTER.md) → Sección "Problemas Comunes" |
| Problema con Google Calendar/Drive | [google-oauth-implementation.md](google-oauth-implementation.md) |
| Error de conexión a BD | [FIX_CONEXIONES_DB.md](FIX_CONEXIONES_DB.md) |
| Problema con fechas | [MASTER_DATE_SSOT_GUIDE.md](MASTER_DATE_SSOT_GUIDE.md) |

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

### Por Tema

Usa el índice de arriba para encontrar el documento principal de cada tema.

### Por Palabra Clave

Usa grep/búsqueda en tu editor:

```bash
# Buscar en todos los docs
rg "keyword" .cursor/docs/

# Buscar solo en auth
rg "keyword" .cursor/docs/auth/
```

### Por Fecha

Documentos ordenados por última actualización:
- **2 feb 2026:** AUTENTICACION_MASTER.md, ONBOARDING.md, README.md
- **31 ene 2026:** (otros documentos legacy)

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

## 📦 Mantenimiento

### Limpieza Regular

Cada trimestre, revisar:
- ❓ Documentos desactualizados (>6 meses sin revisión)
- ❓ Información duplicada entre docs
- ❓ Docs que ya no reflejan el código actual

### Versión de Documentos

Todos los docs en `.cursor/docs/` están versionados en git.

```bash
# Ver historial de un documento
git log --follow .cursor/docs/auth/AUTENTICACION_MASTER.md
```

---

**¿Preguntas o mejoras?** Contacta al equipo de desarrollo.
