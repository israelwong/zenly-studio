// ============================================
// CATALOGO TYPES
// ============================================
// Types para la sección de catálogo del builder
// Basado en el patrón de contacto y portafolio

import type {
    SeccionData,
    CategoriaData,
    ServicioData,
} from "@/lib/actions/schemas/catalogo-schemas";

import type {
    PaqueteFromDB,
    PaqueteData,
} from "@/lib/actions/schemas/paquete-schemas";

import type {
    ConfiguracionPreciosForm,
    ServiciosExistentes,
} from "@/lib/actions/schemas/configuracion-precios-schemas";

import type { ConfiguracionPrecios } from "@/lib/actions/studio/catalogo/calcular-precio";

// ============================================
// TABS ARCHITECTURE TYPES
// ============================================

// Re-export para facilitar imports
export type {
    SeccionData,
    CategoriaData,
    ServicioData,
    PaqueteFromDB,
    PaqueteData,
    ConfiguracionPreciosForm,
    ServiciosExistentes,
    PricingConfig,
};

// Types específicos del Builder
export interface CatalogoTabsData {
    items: {
        catalogo: SeccionData[];
        studioConfig: PricingConfig | null;
    };
    paquetes: {
        paquetes: PaqueteFromDB[];
    };
    utilidad: {
        config: ConfiguracionPreciosForm;
        estadisticas: ServiciosExistentes | null;
    };
}

export type TabValue = "items" | "utilidad";
