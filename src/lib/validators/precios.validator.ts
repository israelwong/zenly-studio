// src/lib/validators/precios.validator.ts

import { BaseValidator } from './base-validator';
import { ValidationResult } from '@/types/setup-validation';

export class PreciosValidator extends BaseValidator {
    async validate(projectData: any): Promise<ValidationResult> {
        const requiredFields: string[] = []; // No hay campos requeridos estrictos
        const optionalFields = ['configuraciones'];

        const completedFields: string[] = [];
        const missingFields: string[] = [];
        const errors: string[] = [];

        let completionPercentage = 0;

        // Validar configuraciones de precios
        if (projectData.configuraciones && Array.isArray(projectData.configuraciones)) {
            const preciosConfig = projectData.configuraciones.find((config: any) =>
                config.tipo === 'precios' || config.tipo === 'precios_utilidad'
            );

            if (preciosConfig) {
                completedFields.push('configuraciones');

                // Validar campos específicos de precios
                const configData = preciosConfig.configuracion || {};
                let fieldsValidated = 0;
                const totalFields = 3; // utilidad_base, sobreprecio, descuento_maximo

                if (configData.utilidad_base !== undefined && configData.utilidad_base > 0) {
                    fieldsValidated++;
                } else {
                    errors.push('La utilidad base debe ser mayor a 0');
                }

                if (configData.sobreprecio !== undefined && configData.sobreprecio >= 0) {
                    fieldsValidated++;
                }

                if (configData.descuento_maximo !== undefined && configData.descuento_maximo >= 0) {
                    fieldsValidated++;
                }

                completionPercentage = Math.round((fieldsValidated / totalFields) * 100);
            } else {
                missingFields.push('configuracion_precios');
                completionPercentage = 0;
            }
        } else {
            missingFields.push('configuraciones');
            completionPercentage = 0;
        }

        return {
            isValid: errors.length === 0 && completionPercentage >= 80,
            completionPercentage,
            completedFields,
            missingFields,
            errors
        };
    }
}
