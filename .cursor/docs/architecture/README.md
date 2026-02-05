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

## 🏗️ Estructura de Carpetas

```
.cursor/docs/
├── architecture/           # ← ESTÁS AQUÍ
│   ├── README.md          # Este archivo
│   └── public-promise-authorization-flow.md
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

**Última actualización:** 2026-02-05  
**Mantenedor:** Equipo de Desarrollo ZENPro
