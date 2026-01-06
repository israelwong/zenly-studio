# Análisis: Campos Bancarios en `studios`

## Situación Actual

### Campos en `studios` (líneas 760-763):
- `account_holder` (String?)
- `account_number` (String?)
- `bank_name` (String?)
- `clabe_number` (String?)

### Campos en `studio_metodos_pago`:
- `banco` (String?)
- `beneficiario` (String?)
- `cuenta_clabe` (String?)

### Campos Stripe Connect en `studios`:
- `stripe_account_id` (String? @unique)
- `stripe_onboarding_complete` (Boolean @default(false))

## Problema Identificado

**Redundancia y confusión:**
1. Los campos bancarios en `studios` se usan actualmente en comprobantes de pago (receipts)
2. Pero `studio_metodos_pago` ya tiene campos similares para transferencias manuales
3. Para Stripe Connect, Stripe maneja toda la información bancaria internamente

## Uso Actual

Los campos en `studios` se usan en:
- `payments-receipt.actions.ts` - Comprobantes de pagos de eventos
- `recurrente-receipt.actions.ts` - Comprobantes de gastos recurrentes
- `nomina-receipt.actions.ts` - Comprobantes de nómina

## Recomendación

### Opción 1: Eliminar campos de `studios` (Recomendada)
**Razón:** 
- Para transferencias manuales → usar `studio_metodos_pago` (ya implementado)
- Para Stripe Connect → obtener info bancaria desde Stripe API cuando sea necesario
- Evita duplicación y confusión

**Acciones:**
1. Migrar comprobantes para usar `studio_metodos_pago` cuando el método de pago sea transferencia
2. Para Stripe Connect, obtener información bancaria desde Stripe API (si es necesario mostrar en comprobantes)
3. Crear migración para eliminar campos de `studios`

### Opción 2: Mantener como "información de respaldo"
**Razón:**
- Útil para mostrar información bancaria genérica en comprobantes
- Independiente del método de pago específico usado

**Problema:**
- Duplicación con `studio_metodos_pago`
- Confusión sobre cuál usar

## Conclusión

**Los campos bancarios NO deberían estar en `studios`** porque:
1. ✅ Transferencias manuales → `studio_metodos_pago` (ya implementado)
2. ✅ Stripe Connect → Stripe maneja la info bancaria
3. ✅ Evita duplicación y confusión

**Próximos pasos:**
1. Migrar comprobantes para usar `studio_metodos_pago`
2. Para Stripe Connect, usar Stripe API si necesitamos mostrar info bancaria
3. Crear migración para eliminar campos de `studios`

