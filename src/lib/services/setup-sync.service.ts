// src/lib/services/setup-sync.service.ts

import { SetupValidationService } from '@/lib/services/setup-validation.service';
import { revalidatePath } from 'next/cache';

export async function withSetupSync<T>(
    operation: () => Promise<T>,
    projectId: string,
    source: 'manual' | 'ai' | 'system' = 'manual',
    sectionId?: string
): Promise<T> {
    const validationService = SetupValidationService.getInstance();

    try {
        // Ejecutar la operación principal
        const result = await operation();

        // Sincronizar después de operación exitosa
        await validationService.validateStudioSetup(projectId);

        // Log del cambio exitoso
        await validationService.logSetupChange(
            projectId,
            'updated',
            source,
            sectionId,
            { success: true }
        );

        // Revalidar cache del frontend
        revalidatePath(`/studio/*/configuracion`);

        return result;
    } catch (error) {
        // Log del error
        await validationService.logSetupChange(
            projectId,
            'error',
            source,
            sectionId,
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            }
        );

        throw error;
    }
}

// Hook para usar en Server Actions
export function useSetupSync() {
    return {
        withSync: withSetupSync
    };
}
