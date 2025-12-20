// src/lib/services/setup-validation.service.ts

import { prisma } from '@/lib/prisma';
import {
    SetupSectionConfig,
    SetupSectionProgress,
    StudioSetupStatus,
    SETUP_SECTIONS_CONFIG,
    SetupProgressLog
} from '@/types/setup-validation';
import {
    IdentidadValidator,
    ContactoValidator,
    RedesSocialesValidator,
    PreciosValidator,
    CondicionesValidator,
    ServiciosValidator,
    BaseValidator
} from '@/lib/validators';

export class SetupValidationService {
    private static instance: SetupValidationService;

    static getInstance(): SetupValidationService {
        if (!SetupValidationService.instance) {
            SetupValidationService.instance = new SetupValidationService();
        }
        return SetupValidationService.instance;
    }

    async validateStudioSetup(studioId: string): Promise<StudioSetupStatus> {
        try {
            // 1. Obtener datos del proyecto
            const studioData = await this.getStudioData(studioId);

            if (!studioData) {
                throw new Error(`Studio no encontrado: ${studioId}`);
            }

            // 2. Obtener configuración de secciones
            const sectionsConfig = await this.getSectionsConfig();

            // 3. Validar cada sección
            const sections = await Promise.all(
                sectionsConfig.map(config =>
                    this.validateSection(studioId, config, studioData)
                )
            );

            // 4. Calcular progreso general
            const overallProgress = this.calculateOverallProgress(sections, sectionsConfig);
            const isFullyConfigured = overallProgress >= 90; // 90% o más se considera completo

            // 5. Actualizar o crear registro
            const setupStatus = await this.updateSetupStatus(studioId, {
                overallProgress,
                isFullyConfigured,
                sections
            });

            return setupStatus;
        } catch (error) {
            console.error('Error validating studio setup:', error);
            throw error;
        }
    }

    private async getStudioData(studioId: string): Promise<any> {
        return await prisma.studios.findUnique({
            where: { id: studioId },
            include: {
                redes_sociales: {
                    include: {
                        plataforma: true
                    }
                },
                configuraciones: true,
                condiciones_comerciales: true,
                metodos_pago: true,
                servicios: true,
                paquetes: true,
                horarios_atencion: true,
                studio_users: true
            }
        });
    }

    private async getSectionsConfig(): Promise<SetupSectionConfig[]> {
        // Por ahora usamos la configuración estática
        // En el futuro se puede hacer configurable desde la base de datos
        return SETUP_SECTIONS_CONFIG.filter(config => config.isActive);
    }

    private async validateSection(
        studioId: string,
        config: SetupSectionConfig,
        studioData: any
    ): Promise<SetupSectionProgress> {
        try {
            const validator = this.getSectionValidator(config.sectionId);
            const result = await validator.validate(studioData);

            // Lógica de estado más clara y consistente
            let status: 'pending' | 'in_progress' | 'completed' | 'error';

            if (result.errors && result.errors.length > 0) {
                status = 'error';
            } else if (result.completionPercentage === 100) {
                status = 'completed';
            } else if (result.completionPercentage > 0) {
                status = 'in_progress';
            } else {
                status = 'pending';
            }

            return {
                sectionId: config.sectionId,
                sectionName: config.sectionName,
                status,
                completionPercentage: result.completionPercentage,
                completedFields: result.completedFields,
                missingFields: result.missingFields,
                errors: result.errors,
                completedAt: status === 'completed' ? new Date() : undefined,
                lastUpdatedAt: new Date()
            };
        } catch (error) {
            console.error(`Error validating section ${config.sectionId}:`, error);

            return {
                sectionId: config.sectionId,
                sectionName: config.sectionName,
                status: 'error',
                completionPercentage: 0,
                completedFields: [],
                missingFields: config.requiredFields,
                errors: [`Error validating section: ${error instanceof Error ? error.message : 'Unknown error'}`],
                lastUpdatedAt: new Date()
            };
        }
    }

    private getSectionValidator(sectionId: string): BaseValidator {
        const validators: Record<string, BaseValidator> = {
            'estudio_identidad': new IdentidadValidator(),
            'estudio_contacto': new ContactoValidator(),
            'estudio_redes_sociales': new RedesSocialesValidator(),
            'estudio_horarios': new RedesSocialesValidator(), // Placeholder, se puede crear un validador específico
            'negocio_precios': new PreciosValidator(),
            'negocio_condiciones': new CondicionesValidator(),
            'negocio_metodos_pago': new RedesSocialesValidator(), // Placeholder
            'negocio_cuentas_bancarias': new RedesSocialesValidator(), // Placeholder
            'catalogo_servicios': new ServiciosValidator(),
            'catalogo_paquetes': new RedesSocialesValidator(), // Placeholder
            'catalogo_especialidades': new RedesSocialesValidator(), // Placeholder
            'equipo_empleados': new RedesSocialesValidator(), // Placeholder
        };

        return validators[sectionId] || new RedesSocialesValidator(); // Fallback
    }

    private calculateOverallProgress(
        sections: SetupSectionProgress[],
        sectionsConfig: SetupSectionConfig[]
    ): number {
        if (sections.length === 0) return 0;

        let totalWeight = 0;
        let completedWeight = 0;

        for (const section of sections) {
            const config = sectionsConfig.find(c => c.sectionId === section.sectionId);
            const weight = config?.weight || 10;

            totalWeight += weight;
            completedWeight += (section.completionPercentage / 100) * weight;
        }

        return Math.round((completedWeight / totalWeight) * 100);
    }

    private async updateSetupStatus(
        studioId: string,
        data: {
            overallProgress: number;
            isFullyConfigured: boolean;
            sections: SetupSectionProgress[];
        }
    ): Promise<StudioSetupStatus> {
        // Buscar estado existente
        const existingStatus = await prisma.studio_setup_status.findUnique({
            where: { studio_id: studioId },
            include: { sections: true }
        });

        if (existingStatus) {
            // Actualizar estado existente
            const updatedStatus = await prisma.studio_setup_status.update({
                where: { studio_id: studioId },
                data: {
                    overallProgress: data.overallProgress,
                    isFullyConfigured: data.isFullyConfigured,
                    lastValidatedAt: new Date(),
                    updatedAt: new Date()
                },
                include: { sections: true }
            });

            // Actualizar secciones
            await this.updateSectionProgress(updatedStatus.id, data.sections);

            return {
                id: updatedStatus.id,
                studio_id: updatedStatus.studio_id,
                overallProgress: updatedStatus.overallProgress,
                isFullyConfigured: updatedStatus.isFullyConfigured,
                lastValidatedAt: updatedStatus.lastValidatedAt,
                sections: data.sections
            };
        } else {
            // Crear nuevo estado
            const newStatus = await prisma.studio_setup_status.create({
                data: {
                    studio_id: studioId,
                    overallProgress: data.overallProgress,
                    isFullyConfigured: data.isFullyConfigured,
                    lastValidatedAt: new Date()
                }
            });

            // Crear secciones
            await this.updateSectionProgress(newStatus.id, data.sections);

            return {
                id: newStatus.id,
                studio_id: newStatus.studio_id,
                overallProgress: newStatus.overallProgress,
                isFullyConfigured: newStatus.isFullyConfigured,
                lastValidatedAt: newStatus.lastValidatedAt,
                sections: data.sections
            };
        }
    }

    private async updateSectionProgress(
        setupStatusId: string,
        sections: SetupSectionProgress[]
    ): Promise<void> {
        // Eliminar secciones existentes
        await prisma.setup_section_progress.deleteMany({
            where: { setupStatusId }
        });

        // Crear nuevas secciones
        await prisma.setup_section_progress.createMany({
            data: sections.map(section => ({
                setupStatusId,
                sectionId: section.sectionId,
                sectionName: section.sectionName,
                status: section.status,
                completionPercentage: section.completionPercentage,
                completedFields: section.completedFields,
                missingFields: section.missingFields,
                errors: section.errors || [],
                completedAt: section.completedAt,
                lastUpdatedAt: section.lastUpdatedAt
            }))
        });
    }

    async logSetupChange(
        studioId: string,
        action: 'created' | 'updated' | 'completed' | 'error',
        source: 'manual' | 'ai' | 'system' = 'system',
        sectionId?: string,
        details?: Record<string, any>
    ): Promise<void> {
        try {
            await prisma.setup_progress_log.create({
                data: {
                    studio_id: studioId,
                    sectionId,
                    action,
                    details: details || {},
                    source,
                    createdAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error logging setup change:', error);
            // No lanzar error para no interrumpir el flujo principal
        }
    }
}
