/**
 * Tests SSoT de fechas legales (date-formatter + date-only).
 * Certifica que una fecha ISO de medianoche UTC devuelve siempre el mismo día
 * calendario formateado, sin importar la zona horaria del entorno.
 */

import { describe, it, expect } from '@jest/globals';
import {
  formatDisplayDateLong,
  runDateOnlyLegalDisplayTest,
} from '../date-formatter';
import { toUtcDateOnly } from '../date-only';

describe('date-formatter (SSoT fechas legales)', () => {
  it('certificación: ISO medianoche UTC → siempre "sábado, 25 de abril de 2025"', () => {
    const result = runDateOnlyLegalDisplayTest();
    expect(result.ok).toBe(true);
    expect(result.message).toContain('sábado, 25 de abril de 2025');
  });

  it('2025-04-25T00:00:00.000Z → sábado, 25 de abril de 2025 (pipeline toUtcDateOnly + formatDisplayDateLong)', () => {
    const normalized = toUtcDateOnly('2025-04-25T00:00:00.000Z');
    expect(normalized).not.toBeNull();
    const formatted = formatDisplayDateLong(normalized!);
    expect(formatted).toBe('sábado, 25 de abril de 2025');
  });

  it('string YYYY-MM-DD "2025-04-25" → sábado, 25 de abril de 2025', () => {
    const formatted = formatDisplayDateLong(toUtcDateOnly('2025-04-25'));
    expect(formatted).toBe('sábado, 25 de abril de 2025');
  });
});
