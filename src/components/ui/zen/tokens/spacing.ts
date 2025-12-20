// ZEN Design System - Spacing Tokens
// Sistema de espaciado unificado

export const ZEN_SPACING = {
    // =============================================================================
    // ESPACIADO BASE
    // =============================================================================
    xs: 'space-y-1',     // 4px
    sm: 'space-y-2',     // 8px  
    md: 'space-y-4',     // 16px
    lg: 'space-y-6',     // 24px
    xl: 'space-y-8',     // 32px
    '2xl': 'space-y-12', // 48px
    '3xl': 'space-y-16', // 64px

    // =============================================================================
    // PADDING POR COMPONENTE
    // =============================================================================
    padding: {
        // Cards
        card: {
            sm: 'p-4',   // 16px
            md: 'p-6',   // 24px
            lg: 'p-8',   // 32px
        },

        // Inputs
        input: {
            sm: 'px-2 py-1',   // 8px 4px
            md: 'px-3 py-2',   // 12px 8px
            lg: 'px-4 py-3',   // 16px 12px
        },

        // Botones
        button: {
            sm: 'px-3 py-1.5', // 12px 6px
            md: 'px-4 py-2',   // 16px 8px
            lg: 'px-6 py-3',   // 24px 12px
        },

        // Modales
        modal: {
            sm: 'p-4',   // 16px
            md: 'p-6',   // 24px
            lg: 'p-8',   // 32px
        },

        // Secciones de página
        section: {
            sm: 'p-4',   // 16px
            md: 'p-6',   // 24px
            lg: 'p-8',   // 32px
        },

        // Sidebar
        sidebar: {
            item: 'px-3 py-2',     // 12px 8px
            section: 'px-3 py-4',  // 12px 16px
        },
    },

    // =============================================================================
    // MARGIN POR COMPONENTE
    // =============================================================================
    margin: {
        // Entre elementos de formulario
        formField: 'mb-4',     // 16px
        formSection: 'mb-6',   // 24px
        formGroup: 'mb-8',     // 32px

        // Entre secciones de página
        pageSection: 'mb-8',   // 32px
        pageGroup: 'mb-12',    // 48px

        // Entre elementos de lista
        listItem: 'mb-2',      // 8px
        listSection: 'mb-4',   // 16px
    },

    // =============================================================================
    // GAP PARA LAYOUTS
    // =============================================================================
    gap: {
        // Grids
        grid: {
            sm: 'gap-2',   // 8px
            md: 'gap-4',   // 16px
            lg: 'gap-6',   // 24px
            xl: 'gap-8',   // 32px
        },

        // Flex
        flex: {
            xs: 'gap-1',   // 4px
            sm: 'gap-2',   // 8px
            md: 'gap-4',   // 16px
            lg: 'gap-6',   // 24px
        },

        // Elementos inline (iconos + texto)
        inline: {
            xs: 'gap-1',   // 4px
            sm: 'gap-2',   // 8px
            md: 'gap-3',   // 12px
        },
    },

    // =============================================================================
    // ESPACIADO RESPONSIVO
    // =============================================================================
    responsive: {
        // Padding responsivo para contenedores principales
        container: 'px-4 sm:px-6 lg:px-8',

        // Espaciado vertical responsivo
        section: 'py-8 sm:py-12 lg:py-16',

        // Márgenes responsivos
        margin: 'mx-4 sm:mx-6 lg:mx-8',
    },

    // =============================================================================
    // ESPACIADO ESPECÍFICO DE COMPONENTES ZEN
    // =============================================================================
    zen: {
        // Sidebar
        sidebarWidth: 'w-64',           // 256px
        sidebarPadding: 'px-3 py-2',    // 12px 8px
        sidebarGap: 'space-y-1',        // 4px

        // Navbar
        navbarHeight: 'h-16',           // 64px
        navbarPadding: 'px-4 sm:px-6',  // 16px sm:24px

        // Form sections
        formSectionGap: 'space-y-6',    // 24px
        formFieldGap: 'space-y-2',      // 8px

        // Cards
        cardSpacing: 'space-y-4',       // 16px
        cardPadding: 'p-6',             // 24px

        // Modal
        modalSpacing: 'space-y-4',      // 16px
        modalPadding: 'p-6',            // 24px

        // Progress header
        progressPadding: 'p-6',         // 24px
        progressGap: 'space-y-4',       // 16px
    },
} as const;

// =============================================================================
// HELPERS PARA ESPACIADO DINÁMICO
// =============================================================================
export const zenSpacing = {
    // Función para obtener padding por tamaño
    getPadding: (component: 'card' | 'input' | 'button' | 'modal' | 'section', size: 'sm' | 'md' | 'lg') => {
        return ZEN_SPACING.padding[component][size];
    },

    // Función para obtener gap por contexto
    getGap: (context: 'grid' | 'flex' | 'inline', size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
        const gapConfig = ZEN_SPACING.gap[context];
        return gapConfig[size as keyof typeof gapConfig] || gapConfig.md;
    },

    // Función para espaciado de formularios
    getFormSpacing: (element: 'field' | 'section' | 'group') => {
        switch (element) {
            case 'field':
                return ZEN_SPACING.margin.formField;
            case 'section':
                return ZEN_SPACING.margin.formSection;
            case 'group':
                return ZEN_SPACING.margin.formGroup;
            default:
                return ZEN_SPACING.margin.formField;
        }
    },
};
