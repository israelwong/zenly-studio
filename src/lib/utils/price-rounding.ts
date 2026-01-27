/**
 * Redondeo psicológico de precios
 * 
 * Estrategias:
 * 1. Terminaciones atractivas (199, 299, 399, 699, 999) para precios < 10,000
 * 2. Redondeo a centenas para precios 10,000 - 100,000
 * 3. Redondeo a miles para precios > 100,000
 */

export type RoundingStrategy = 'charm' | 'hundred' | 'thousand' | 'auto';

/**
 * Redondea un precio usando terminaciones "charm" (199, 299, 399, 699, 999)
 * Busca la terminación más cercana (arriba o abajo según proximidad)
 */
function roundToCharmEnding(price: number): number {
  if (price < 1000) {
    // Para precios < 1000, redondear a decenas más cercanas con terminación charm
    const decenas = Math.floor(price / 10);
    
    // Terminaciones charm: 9, 19, 29, 39, 69, 99
    const charmEndings = [9, 19, 29, 39, 69, 99];
    const base = decenas * 10;
    
    // Buscar en la decena actual y la siguiente
    let closest = base + charmEndings[0];
    let minDiff = Math.abs(price - closest);
    
    for (const ending of charmEndings) {
      const candidate = base + ending;
      const diff = Math.abs(price - candidate);
      if (diff < minDiff) {
        minDiff = diff;
        closest = candidate;
      }
    }
    
    // También revisar la siguiente decena
    const nextBase = (decenas + 1) * 10;
    for (const ending of charmEndings) {
      const candidate = nextBase + ending;
      const diff = Math.abs(price - candidate);
      if (diff < minDiff) {
        minDiff = diff;
        closest = candidate;
      }
    }
    
    // Si el más cercano es menor, usar el siguiente mayor
    if (closest < price) {
      for (const ending of charmEndings) {
        const candidate = nextBase + ending;
        if (candidate >= price) {
          return candidate;
        }
      }
    }
    
    return closest;
  }
  
  // Para precios >= 1000, trabajar con centenas
  const centenas = Math.floor(price / 100);
  
  // Terminaciones charm en centenas: 199, 299, 399, 699, 999
  const charmEndings = [199, 299, 399, 699, 999];
  const base = centenas * 100;
  const nextBase = (centenas + 1) * 100;
  const prevBase = centenas > 0 ? (centenas - 1) * 100 : 0;
  
  // Buscar la terminación charm más cercana (arriba o abajo)
  let closest = base + charmEndings[0];
  let minDiff = Math.abs(price - closest);
  
  // Revisar en la centena actual
  for (const ending of charmEndings) {
    const candidate = base + ending;
    const diff = Math.abs(price - candidate);
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidate;
    }
  }
  
  // Revisar en la centena anterior (si existe)
  if (prevBase >= 0) {
    for (const ending of charmEndings) {
      const candidate = prevBase + ending;
      if (candidate >= 0) {
        const diff = Math.abs(price - candidate);
        if (diff < minDiff) {
          minDiff = diff;
          closest = candidate;
        }
      }
    }
  }
  
  // Revisar en la siguiente centena
  for (const ending of charmEndings) {
    const candidate = nextBase + ending;
    const diff = Math.abs(price - candidate);
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidate;
    }
  }
  
  return closest;
}

/**
 * Redondea a la centena más cercana (hacia arriba)
 */
function roundToHundred(price: number): number {
  return Math.ceil(price / 100) * 100;
}

/**
 * Redondea al millar más cercano (hacia arriba)
 */
function roundToThousand(price: number): number {
  return Math.ceil(price / 1000) * 1000;
}

/**
 * Redondeo automático según el rango del precio
 * - < 50,000: Usa terminaciones charm (199, 299, 399, 699, 999)
 * - 50,000 - 100,000: Redondea a centenas
 * - > 100,000: Redondea a miles
 */
function roundAuto(price: number): number {
  if (price < 50000) {
    return roundToCharmEnding(price);
  } else if (price < 100000) {
    return roundToHundred(price);
  } else {
    return roundToThousand(price);
  }
}

/**
 * Redondea un precio usando la estrategia especificada
 * 
 * @param price - Precio a redondear
 * @param strategy - Estrategia de redondeo ('charm', 'hundred', 'thousand', 'auto')
 * @returns Precio redondeado
 * 
 * @example
 * roundPrice(20171, 'charm') // 20199
 * roundPrice(38661, 'hundred') // 38700
 * roundPrice(64419, 'thousand') // 65000
 * roundPrice(20171, 'auto') // 20199 (usa charm para < 10k)
 */
export function roundPrice(price: number, strategy: RoundingStrategy = 'auto'): number {
  if (price <= 0) return price;
  
  switch (strategy) {
    case 'charm':
      return roundToCharmEnding(price);
    case 'hundred':
      return roundToHundred(price);
    case 'thousand':
      return roundToThousand(price);
    case 'auto':
    default:
      return roundAuto(price);
  }
}

/**
 * Formatea un precio con redondeo psicológico aplicado
 * 
 * @param price - Precio a formatear
 * @param strategy - Estrategia de redondeo
 * @param locale - Locale para formateo (default: 'es-MX')
 * @returns Precio formateado como string
 */
export function formatRoundedPrice(
  price: number,
  strategy: RoundingStrategy = 'auto',
  locale: string = 'es-MX'
): string {
  const rounded = roundPrice(price, strategy);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}
