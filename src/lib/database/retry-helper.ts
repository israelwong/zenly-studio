/**
 * Helper para manejar reintentos en operaciones de base de datos
 * Implementa estrategia robusta con backoff exponencial y detección inteligente de errores
 */

export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    jitter?: boolean; // Agregar aleatoriedad para evitar thundering herd
}

/**
 * Ejecuta una función con reintentos automáticos para errores de conectividad
 * Implementa backoff exponencial con jitter para evitar thundering herd
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { 
        maxRetries = 3, 
        baseDelay = 1000, 
        maxDelay = 10000,
        jitter = true 
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            
            // Log exitoso en desarrollo
            if (process.env.NODE_ENV === 'development' && attempt > 1) {
                console.log(`✅ Operación exitosa en intento ${attempt}`);
            }
            
            return result;
        } catch (error: unknown) {
            lastError = error;
            const prismaError = error as { code?: string; message?: string };
            
            // Verificar si es un error recuperable
            if (isRecoverableError(error) && attempt < maxRetries) {
                const delay = calculateDelay(attempt, baseDelay, maxDelay, jitter);
                
                if (process.env.NODE_ENV === 'development') {
                console.warn(
                    `⚠️ Error recuperable en intento ${attempt}/${maxRetries}: ${prismaError.code || 'Unknown'}. ` +
                    `Reintentando en ${delay}ms...`
                );
            }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // Si no es recuperable o se agotaron los intentos, lanzar error
            break;
        }
    }
    
    // Log final de error (incluir causa para diagnóstico)
    console.error(
      `❌ Operación falló después de ${maxRetries} intentos`,
      lastError instanceof Error ? lastError.message : lastError
    );
    throw lastError;
}

/**
 * Calcula el delay con backoff exponencial y jitter opcional
 */
function calculateDelay(
    attempt: number, 
    baseDelay: number, 
    maxDelay: number, 
    jitter: boolean
): number {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    if (jitter) {
        // Agregar jitter del ±25% para evitar thundering herd
        const jitterAmount = exponentialDelay * 0.25;
        const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
        return Math.max(100, exponentialDelay + randomJitter); // Mínimo 100ms
    }
    
    return exponentialDelay;
}

/**
 * Verifica si un error es recuperable (debe reintentarse)
 */
function isRecoverableError(error: unknown): boolean {
    const prismaError = error as { code?: string; message?: string };
    
    // Errores de conectividad que deben reintentarse
    const recoverableCodes = ['P1001', 'P1008', 'P1017'];
    const recoverableMessages = [
        'Can\'t reach database server',
        'Connection timeout',
        'timeout exceeded when trying to connect',
        'Connection refused',
        'Network error',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'terminating connection',
        'database system is shutting down',
        'DriverAdapterError',
        'connection terminated',
        'the database system is shutting down'
    ];
    
    return (
        recoverableCodes.includes(prismaError.code || '') ||
        recoverableMessages.some(msg => 
            prismaError.message?.toLowerCase().includes(msg.toLowerCase())
        )
    );
}

/**
 * Verifica si un error es de conectividad P1001
 */
export function isConnectionError(error: unknown): boolean {
    const prismaError = error as { code?: string; message?: string };
    return prismaError.code === 'P1001' || 
           prismaError.message?.includes('Can\'t reach database server') ||
           prismaError.message?.includes('connection');
}

/**
 * Obtiene un mensaje de error amigable para el usuario
 */
export function getFriendlyErrorMessage(error: unknown): string {
    if (isConnectionError(error)) {
        return 'Error de conectividad con la base de datos. Verifica tu conexión a internet e intenta nuevamente.';
    }
    
    const prismaError = error as { code?: string; message?: string };
    
    switch (prismaError.code) {
        case 'P2002':
            return 'Ya existe un registro con estos datos. Verifica la información e intenta nuevamente.';
        case 'P2025':
            return 'El registro solicitado no existe o ha sido eliminado.';
        case 'P2003':
            return 'Error de referencia: el registro relacionado no existe.';
        case 'P2014':
            return 'Error de relación: no se puede crear la conexión entre registros.';
        default:
            return prismaError.message || 'Error desconocido de base de datos.';
    }
}
