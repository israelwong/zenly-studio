'use server';

import { prisma } from '@/lib/prisma';
import { retryDatabaseOperation } from '@/lib/actions/utils/database-retry';
import { revalidatePath } from 'next/cache';
import {
    ConfiguracionPreciosSchema,
    type ConfiguracionPreciosForm,
    type ServiciosExistentes
} from '@/lib/actions/schemas/configuracion-precios-schemas';

// =====================================================
// CONSTANTES DE CONFIGURACIÓN POR DEFECTO
// =====================================================

/**
 * NOTA: Los márgenes y comisiones NO tienen valores por defecto hardcodeados.
 * El usuario DEBE configurar estos valores a través de la UI.
 * Si no existen, retornamos null para que el frontend maneje esto.
 */

// Tipos específicos para los servicios
type ServicioItem = {
    id: string;
    utility_type: string;
};

type ServicioConGastos = {
    id: string;
    updated_at: Date;
    item_expenses?: Array<{
        id: string;
        name: string;
        cost: number;
    }>;
};

type ServicioEstadistica = {
    id: string;
    name: string;
    utility_type: string;
    cost: number;
    expense: number;
};

// Obtener configuración de precios del studio
export async function obtenerConfiguracionPrecios(studioSlug: string) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                studio_name: true,
                slug: true,
                configuraciones: {
                    where: { status: 'active' },
                    orderBy: { updated_at: 'desc' },
                    take: 1,
                    select: {
                        service_margin: true,
                        product_margin: true,
                        sales_commission: true,
                        markup: true,
                        referral_reward_type: true,
                        referral_reward_value: true,
                    },
                },
            },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Obtener la configuración activa
        const configuracion = studio.configuraciones[0];

        // Si no existe configuración, retornar null
        // El usuario DEBE configurar estos valores a través de la UI
        if (!configuracion) {
            console.log(`[obtenerConfiguracionPrecios] No hay configuración para studio: ${studioSlug}`);
            return null;
        }

        // Convertir referral_reward_value según el tipo
        let referralRewardValueDisplay = '';
        if (configuracion.referral_reward_type === 'PERCENTAGE') {
            // Si es porcentaje, convertir a entero para mostrar (0.5 -> 50)
            referralRewardValueDisplay = String((configuracion.referral_reward_value ?? 0.5) * 100);
        } else {
            // Si es monto fijo, mostrar directamente
            referralRewardValueDisplay = String(configuracion.referral_reward_value ?? 1000);
        }

        return {
            id: studio.id,
            nombre: studio.studio_name,
            slug: studio.slug,
            utilidad_servicio: String((configuracion.service_margin ?? 0) * 100), // Convertir a porcentaje
            utilidad_producto: String((configuracion.product_margin ?? 0) * 100),
            comision_venta: String((configuracion.sales_commission ?? 0) * 100),
            sobreprecio: String((configuracion.markup ?? 0) * 100),
            referral_reward_type: configuracion.referral_reward_type ?? 'PERCENTAGE',
            referral_reward_value: referralRewardValueDisplay,
        };
    });
}

// Verificar si hay servicios existentes que requieran actualización masiva
export async function verificarServiciosExistentes(studioSlug: string): Promise<ServiciosExistentes> {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                configuraciones: {
                    where: { status: 'active' },
                    orderBy: { updated_at: 'desc' },
                    take: 1,
                    select: {
                        service_margin: true,
                        product_margin: true,
                        sales_commission: true,
                        markup: true,
                    }
                }
            },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Contar servicios existentes
        const servicios = await prisma.studio_items.findMany({
            where: { studio_id: studio.id },
            select: {
                id: true,
                utility_type: true,
            },
        });

        const total_servicios = servicios.length;
        const servicios_por_tipo = {
            servicios: servicios.filter((s: ServicioItem) => s.utility_type === 'service').length,
            productos: servicios.filter((s: ServicioItem) => s.utility_type === 'product').length,
            paquetes: servicios.filter((s: ServicioItem) => s.utility_type === 'package').length,
        };

        // Verificar si hay cambios en los porcentajes
        const configuracionActual = studio.configuraciones[0];

        // Se requiere actualización si hay servicios pero no hay configuración
        const requiere_actualizacion_masiva = total_servicios > 0 && !configuracionActual;

        return {
            total_servicios,
            servicios_por_tipo,
            requiere_actualizacion_masiva,
        };
    });
}

// Actualizar configuración de precios
export async function actualizarConfiguracionPrecios(
    studioSlug: string,
    data: ConfiguracionPreciosForm
) {
    return await retryDatabaseOperation(async () => {
        // Validar datos
        const validationResult = ConfiguracionPreciosSchema.safeParse(data);

        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.flatten().fieldErrors,
            };
        }

        const { id: _, ...validatedData } = validationResult.data;

        // El schema ya valida que los valores estén entre 0.0 y 1.0 (decimales)
        // UtilidadForm convierte de enteros (10) a decimales (0.10) antes de enviar
        // Usar directamente los valores del schema sin dividir por 100
        const rewardType = validatedData.referral_reward_type || 'PERCENTAGE';
        let rewardValue: number;
        
        if (rewardType === 'PERCENTAGE') {
            // Si es porcentaje, convertir de entero (50) a decimal (0.5)
            rewardValue = validatedData.referral_reward_value
                ? parseFloat(parseFloat(validatedData.referral_reward_value).toFixed(4)) / 100
                : 0.5; // Default 50%
        } else {
            // Si es monto fijo, usar directamente
            rewardValue = validatedData.referral_reward_value
                ? parseFloat(parseFloat(validatedData.referral_reward_value).toFixed(2))
                : 1000; // Default 1000 MXN
        }

        const dataToSave = {
            service_margin: parseFloat(parseFloat(validatedData.utilidad_servicio || '0').toFixed(4)),
            product_margin: parseFloat(parseFloat(validatedData.utilidad_producto || '0').toFixed(4)),
            sales_commission: parseFloat(parseFloat(validatedData.comision_venta || '0').toFixed(4)),
            markup: parseFloat(parseFloat(validatedData.sobreprecio || '0').toFixed(4)),
            referral_reward_type: rewardType,
            referral_reward_value: rewardValue,
        };

        // Obtener el studio
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // 1. Buscar configuración existente
        const configuracionExistente = await prisma.studio_configuraciones.findFirst({
            where: {
                studio_id: studio.id,
                status: 'active',
            },
        });

        // 2. Actualizar o crear la configuración del studio
        if (configuracionExistente) {
            await prisma.studio_configuraciones.update({
                where: {
                    id: configuracionExistente.id,
                },
                data: {
                    service_margin: dataToSave.service_margin,
                    product_margin: dataToSave.product_margin,
                    sales_commission: dataToSave.sales_commission,
                    markup: dataToSave.markup,
                    referral_reward_type: dataToSave.referral_reward_type,
                    referral_reward_value: dataToSave.referral_reward_value,
                    status: 'active',
                    updated_at: new Date(),
                },
            });
        } else {
            await prisma.studio_configuraciones.create({
                data: {
                    studio_id: studio.id,
                    name: 'Configuración de Precios',
                    service_margin: dataToSave.service_margin,
                    product_margin: dataToSave.product_margin,
                    sales_commission: dataToSave.sales_commission,
                    markup: dataToSave.markup,
                    referral_reward_type: dataToSave.referral_reward_type,
                    referral_reward_value: dataToSave.referral_reward_value,
                    status: 'active',
                    updated_at: new Date(),
                },
            });
        }

        // 3. Verificar si hay servicios existentes para actualización masiva
        const serviciosExistentes = await verificarServiciosExistentes(studioSlug);

        if (serviciosExistentes.requiere_actualizacion_masiva) {
            // 4. Obtener todos los servicios existentes para el recálculo masivo
            const todosLosServicios = await prisma.studio_items.findMany({
                where: { studio_id: studio.id },
                include: {
                    // Incluir gastos si existen
                    item_expenses: true,
                },
            });

            // NOTA: Ya no actualizamos precio_publico ni utilidad en studio_servicios
            // Estos campos se eliminaron del modelo y ahora se calculan al vuelo
            // usando studio_configuraciones. Solo actualizamos updatedAt para
            // indicar que hubo un cambio en la configuración.

            const updatePromises = todosLosServicios.map((servicio: ServicioConGastos) => {
                return prisma.studio_items.update({
                    where: { id: servicio.id },
                    data: {
                        updated_at: new Date(),
                    },
                });
            });

            // 5. Ejecutar todas las actualizaciones de timestamp
            await Promise.all(updatePromises);
        }

        // 6. Revalidar las rutas (componente compartido usado en múltiples lugares)
        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/configuracion-precios`);
        revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
        revalidatePath(`/${studioSlug}/studio/commercial/promises`);
        revalidatePath(`/${studioSlug}/studio/commercial/ofertas`);

        return {
            success: true,
            servicios_actualizados: serviciosExistentes.total_servicios,
            requiere_actualizacion_masiva: serviciosExistentes.requiere_actualizacion_masiva,
        };

    });
}

// Obtener estadísticas de servicios para mostrar en la UI
export async function obtenerEstadisticasServicios(studioSlug: string) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const servicios = await prisma.studio_items.findMany({
            where: { studio_id: studio.id },
            select: {
                id: true,
                name: true,
                utility_type: true,
                cost: true,
                expense: true,
            },
        });

        // NOTA: precio_publico y utilidad ya no se almacenan, se calculan al vuelo
        const estadisticas = {
            total_servicios: servicios.length,
            servicios_por_tipo: {
                servicios: servicios.filter((s: ServicioEstadistica) => s.utility_type === 'service').length,
                productos: servicios.filter((s: ServicioEstadistica) => s.utility_type === 'product').length,
                paquetes: servicios.filter((s: ServicioEstadistica) => s.utility_type === 'package').length,
            },
            costo_promedio: servicios.length > 0
                ? servicios.reduce((acc: number, s: ServicioEstadistica) => acc + (s.cost || 0), 0) / servicios.length
                : 0,
            gasto_promedio: servicios.length > 0
                ? servicios.reduce((acc: number, s: ServicioEstadistica) => acc + (s.expense || 0), 0) / servicios.length
                : 0,
        };

        return estadisticas;
    });
}
