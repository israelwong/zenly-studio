# 📋 Implementación: Herramienta de Negociación de Cotizaciones

**Fecha de inicio:** 2025-01-16  
**Estado:** En progreso

---

## ✅ Checklist de Implementación

### Fase 1: Migraciones DB
- [x] Crear migraciones SQL (`20260116_add_negotiation_system.sql`)
- [x] Actualizar Prisma schema (`prisma/schema.prisma`)
- [ ] Ejecutar migraciones en desarrollo
- [ ] Verificar que los cambios se aplicaron correctamente

### Fase 2: Utilidades y Cálculos
- [x] Implementar `src/lib/utils/negociacion-calc.ts`
- [ ] Crear hook `useCalculoNegociacion` (en componente)
- [ ] Tests unitarios de cálculos (opcional por ahora)

### Fase 3: Server Actions
- [x] Implementar `src/lib/actions/studio/commercial/promises/negociacion.actions.ts`
- [x] Función `loadCotizacionParaNegociacion`
- [x] Función `crearVersionNegociada`
- [x] Función `aplicarCambiosNegociacion`
- [x] Agregar schemas a `cotizaciones-schemas.ts`
- [ ] Tests de integración (opcional por ahora)

### Fase 4: Componentes UI
- [x] Crear página `negociacion/page.tsx`
- [x] Componente `NegociacionHeader.tsx`
- [x] Componente `ComparacionView.tsx`
- [x] Componente `PrecioSimulador.tsx`
- [x] Componente `CondicionesSimulador.tsx`
- [x] Componente `ItemsCortesiaSelector.tsx`
- [x] Componente `ImpactoUtilidad.tsx`
- [x] Componente `FinalizarNegociacion.tsx`
- [x] Integrar con ZEN Design System
- [x] Implementar cálculos en tiempo real

### Fase 5: Integración
- [ ] Agregar botón "Negociar" en `PromiseQuotesPanelCard.tsx`
- [ ] Conectar con página de negociación
- [ ] Testing end-to-end básico

### Fase 6: Refinamiento
- [ ] Mejorar UX basado en feedback
- [ ] Optimizaciones de performance
- [ ] Documentación de usuario

---

## 📝 Notas de Implementación

### Cambios en Base de Datos

**Tabla `studio_cotizaciones`:**
- `negociacion_precio_personalizado` DECIMAL(10, 2) NULL
- `negociacion_descuento_adicional` DECIMAL(10, 2) NULL
- `negociacion_notas` TEXT NULL
- `negociacion_created_at` TIMESTAMP NULL

**Tabla `studio_cotizacion_items`:**
- `is_courtesy` BOOLEAN NOT NULL DEFAULT FALSE

**Nueva tabla `studio_condiciones_comerciales_negociacion`:**
- Tabla completa para condiciones comerciales temporales

---

## 🐛 Issues Conocidos

(Ninguno por ahora)

---

## 📚 Referencias

- Reporte Técnico: `.cursor/analysis/reporte-tecnico-negociacion-cotizaciones.md`
- Documentación Original: `.cursor/analysis/herramienta-negociacion-cotizaciones.md`
