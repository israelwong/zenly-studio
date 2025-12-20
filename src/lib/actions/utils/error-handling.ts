import { ZodError } from "zod";

// Tipos de errores personalizados
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public details?: unknown;

    constructor(message: string, details?: unknown) {
        super(message, 400);
        this.name = "ValidationError";
        if (details) {
            this.details = details;
        }
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = "No autenticado") {
        super(message, 401);
        this.name = "AuthenticationError";
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = "Sin permisos") {
        super(message, 403);
        this.name = "AuthorizationError";
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Recurso no encontrado") {
        super(message, 404);
        this.name = "NotFoundError";
    }
}

export class ConflictError extends AppError {
    constructor(message: string = "Conflicto de recursos") {
        super(message, 409);
        this.name = "ConflictError";
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = "Límite de solicitudes excedido") {
        super(message, 429);
        this.name = "RateLimitError";
    }
}

// Función para manejar errores de Zod
export function handleZodError(error: ZodError): string {
    const errorMessages = error.issues.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
    });

    return `Errores de validación: ${errorMessages.join(", ")}`;
}

// Función para manejar errores de Prisma
export function handlePrismaError(error: unknown): AppError {
    // Type guard para verificar si es un error de Prisma
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const prismaError = error as { code: string; meta?: { target?: string[] } };

        // Error de registro único duplicado
        if (prismaError.code === "P2002") {
            const field = prismaError.meta?.target?.[0] || "campo";
            return new ConflictError(`El ${field} ya existe`);
        }

        // Error de registro no encontrado
        if (prismaError.code === "P2025") {
            return new NotFoundError("Registro no encontrado");
        }

        // Error de relación no encontrada
        if (prismaError.code === "P2003") {
            return new ValidationError("Referencia a registro inexistente");
        }

        // Error de conexión
        if (prismaError.code === "P1001") {
            return new AppError("Error de conexión a la base de datos", 503);
        }

        // Error de timeout
        if (prismaError.code === "P1008") {
            return new AppError("Timeout de operación", 408);
        }
    }

    // Error genérico de Prisma
    return new AppError("Error de base de datos", 500);
}

// Función para manejar errores de Supabase
export function handleSupabaseError(error: unknown): AppError {
    // Type guard para verificar si tiene message
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const errorMessage = (error as { message: string }).message;

        if (errorMessage.includes("Invalid login credentials")) {
            return new AuthenticationError("Credenciales inválidas");
        }

        if (errorMessage.includes("Email not confirmed")) {
            return new AuthenticationError("Email no confirmado");
        }

        if (errorMessage.includes("User not found")) {
            return new NotFoundError("Usuario no encontrado");
        }

        if (errorMessage.includes("Email already registered")) {
            return new ConflictError("Email ya registrado");
        }
    }

    return new AppError("Error de autenticación", 500);
}

// Función para manejar errores de Stripe
export function handleStripeError(error: unknown): AppError {
    // Type guard para verificar si tiene type
    if (typeof error === 'object' && error !== null && 'type' in error) {
        const errorType = (error as { type: string }).type;

        if (errorType === "StripeCardError") {
            return new ValidationError("Error en la tarjeta de crédito");
        }

        if (errorType === "StripeRateLimitError") {
            return new RateLimitError("Demasiadas solicitudes a Stripe");
        }

        if (errorType === "StripeInvalidRequestError") {
            return new ValidationError("Solicitud inválida a Stripe");
        }

        if (errorType === "StripeAPIError") {
            return new AppError("Error del servicio de pagos", 502);
        }
    }

    return new AppError("Error de procesamiento de pago", 500);
}

// Función para manejar errores genéricos
export function handleGenericError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof ZodError) {
        return new ValidationError(handleZodError(error));
    }

    if (error instanceof Error) {
        return new AppError(error.message, 500);
    }

    return new AppError("Error interno del servidor", 500);
}

// Función para logging de errores
export function logError(error: AppError, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : "";

    console.error(`[${timestamp}]${contextStr} ${error.name}: ${error.message}`, {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        stack: error.stack,
    });
}

// Función para crear respuesta de error
export function createErrorResponse(error: AppError) {
    return {
        success: false,
        error: {
            message: error.message,
            statusCode: error.statusCode,
            name: error.name,
        },
    };
}

// Función para crear respuesta de éxito
export function createSuccessResponse<T>(data: T, message?: string) {
    return {
        success: true,
        data,
        message,
    };
}

// Función para validar y manejar errores en Server Actions
export async function handleServerAction<T>(
    operation: () => Promise<T>,
    context?: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
        const data = await operation();
        return { success: true, data };
    } catch (error) {
        const appError = handleGenericError(error);
        logError(appError, context);

        return {
            success: false,
            error: appError.message,
        };
    }
}

// Función para retry con backoff exponencial
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
                throw lastError;
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}
