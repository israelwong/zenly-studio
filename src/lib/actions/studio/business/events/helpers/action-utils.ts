'use server';

/**
 * Wrapper genérico para agregar timeout a cualquier promesa
 * Previene bloqueos del pool de conexiones de Prisma
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || `Timeout de ${timeoutMs}ms excedido`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Timeout por defecto para queries de eventos (25 segundos)
 */
export const EVENTO_DETALLE_TIMEOUT_MS = 25_000;

/**
 * Timeout por defecto para queries ligeras (10 segundos)
 */
export const QUERY_TIMEOUT_MS = 10_000;

/**
 * Timeout por defecto para mutaciones (15 segundos)
 */
export const MUTATION_TIMEOUT_MS = 15_000;
