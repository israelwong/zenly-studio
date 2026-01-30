/**
 * Tests del Motor de Cálculo de Cotización (SSoT).
 * Verifica 0 centavos de diferencia con la lógica de renderer.actions.ts.
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateCotizacionTotals,
  runInternalRendererParityTest,
} from '../cotizacion-calculation-engine';

describe('cotizacion-calculation-engine', () => {
  it('debe coincidir con la lógica del renderer en todos los casos (0 centavos diferencia)', () => {
    const result = runInternalRendererParityTest();
    expect(result.ok).toBe(true);
    expect(result.message).toContain('coinciden');
  });

  it('modo negociado: totalAPagar = negociacion_precio_personalizado, descuento = 0', () => {
    const out = calculateCotizacionTotals({
      price: 25000,
      discount: 0,
      negociacion_precio_original: 25000,
      negociacion_precio_personalizado: 22000,
      condiciones_comerciales_discount_percentage_snapshot: 10,
      condiciones_comerciales_advance_percentage_snapshot: 50,
      condiciones_comerciales_advance_type_snapshot: 'percentage',
      condiciones_comerciales_advance_amount_snapshot: null,
      condiciones_comerciales: null,
    });
    expect(out.totalAPagar).toBe(22000);
    expect(out.descuentoAplicado).toBe(0);
    expect(out.source).toBe('negociado');
    expect(out.ahorroTotal).toBe(3000);
    expect(out.anticipo).toBe(11000);
    expect(out.diferido).toBe(11000);
  });

  it('descuento porcentaje: totalAPagar = precioBaseReal - descuento%', () => {
    const out = calculateCotizacionTotals({
      price: 20000,
      discount: 0,
      negociacion_precio_original: null,
      negociacion_precio_personalizado: null,
      condiciones_comerciales_discount_percentage_snapshot: 15,
      condiciones_comerciales_advance_percentage_snapshot: 30,
      condiciones_comerciales_advance_type_snapshot: 'percentage',
      condiciones_comerciales_advance_amount_snapshot: null,
      condiciones_comerciales: null,
    });
    expect(out.precioBaseReal).toBe(20000);
    expect(out.descuentoAplicado).toBe(3000);
    expect(out.totalAPagar).toBe(17000);
    expect(out.source).toBe('descuento_porcentaje');
    expect(out.anticipo).toBe(5100);
    expect(out.diferido).toBe(11900);
  });

  it('certificación: precio base 30k, descuento 10%, negociado 25k (manda), anticipo 20%', () => {
    const out = calculateCotizacionTotals({
      price: 30000,
      discount: 0,
      negociacion_precio_original: 30000,
      negociacion_precio_personalizado: 25000,
      condiciones_comerciales_discount_percentage_snapshot: 10,
      condiciones_comerciales_advance_percentage_snapshot: 20,
      condiciones_comerciales_advance_type_snapshot: 'percentage',
      condiciones_comerciales_advance_amount_snapshot: null,
      condiciones_comerciales: {
        discount_percentage: 10,
        advance_percentage: 20,
        advance_type: 'percentage',
        advance_amount: null,
      },
    });
    expect(out.totalAPagar).toBe(25000);
    expect(out.descuentoAplicado).toBe(0);
    expect(out.source).toBe('negociado');
    expect(out.anticipo).toBe(5000);
    expect(out.diferido).toBe(20000);
  });

  it('sin condiciones: totalAPagar = price, descuentoAplicado = discount (monto)', () => {
    const out = calculateCotizacionTotals({
      price: 12000,
      discount: 2000,
      negociacion_precio_original: null,
      negociacion_precio_personalizado: null,
      condiciones_comerciales_discount_percentage_snapshot: null,
      condiciones_comerciales_advance_percentage_snapshot: null,
      condiciones_comerciales_advance_type_snapshot: null,
      condiciones_comerciales_advance_amount_snapshot: null,
      condiciones_comerciales: null,
    });
    expect(out.totalAPagar).toBe(12000);
    expect(out.descuentoAplicado).toBe(2000);
    expect(out.source).toBe('descuento_monto');
    expect(out.anticipo).toBe(0);
    expect(out.diferido).toBe(12000);
  });
});
