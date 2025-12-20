import { useState, useMemo } from 'react';

/**
 * Hook para generar y mantener un CUID temporal
 * Útil para posts en creación antes de guardar en BD
 */
export function useTempCuid() {
    const [tempCuid] = useState(() => {
        // Generar un CUID temporal válido
        return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    });

    return tempCuid;
}
