import { z } from 'zod';

// Schema para validar la configuración de precios
export const ConfiguracionPreciosSchema = z.object({
    id: z.string().cuid().optional(),

    // Valores decimales de utilidad (0.0 a 1.0) - opcionales
    utilidad_servicio: z.string()
        .refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 1), {
            message: "Debe ser un número válido entre 0.0 y 1.0 (ej: 0.30 = 30%)."
        })
        .optional(),

    utilidad_producto: z.string()
        .refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 1), {
            message: "Debe ser un número válido entre 0.0 y 1.0 (ej: 0.40 = 40%)."
        })
        .optional(),

    // utilidad_paquete eliminada - no está en la base de datos

    // Comisiones y sobreprecios (valores decimales 0.0 a 1.0) - opcionales
    comision_venta: z.string()
        .refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 1), {
            message: "Debe ser un número válido entre 0.0 y 1.0 (ej: 0.10 = 10%)."
        })
        .optional(),

    // Sobreprecio: Porcentaje adicional que permite aplicar descuentos sin comprometer la utilidad
    // Regla: No se podrá aplicar un descuento mayor al sobreprecio para asegurar la utilidad
    sobreprecio: z.string()
        .refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 1), {
            message: "Debe ser un número válido entre 0.0 y 1.0 (ej: 0.05 = 5%)."
        })
        .optional(),

    // Configuraciones adicionales (simplificadas)
    // incluir_iva: z.boolean().optional(),
    // redondear_precios: z.boolean().optional(),
    // aplicar_descuentos_automaticos: z.boolean().optional(),

    // Límites (eliminado)
    // numero_maximo_servicios_por_dia: z.string()
    //   .refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, { 
    //     message: "Debe ser un número entero mayor a 0." 
    //   }).optional(),
});

export type ConfiguracionPreciosForm = z.infer<typeof ConfiguracionPreciosSchema>;

// Schema para la respuesta de servicios existentes
export const ServiciosExistentesSchema = z.object({
    total_servicios: z.number(),
    servicios_por_tipo: z.object({
        servicios: z.number(),
        productos: z.number(),
        paquetes: z.number(),
    }),
    requiere_actualizacion_masiva: z.boolean(),
});

export type ServiciosExistentes = z.infer<typeof ServiciosExistentesSchema>;
