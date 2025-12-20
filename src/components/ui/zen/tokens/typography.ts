// ZEN Design System - Typography Tokens
// Sistema de tipografía unificado

export const ZEN_TYPOGRAPHY = {
    // =============================================================================
    // TAMAÑOS DE FUENTE
    // =============================================================================
    fontSize: {
        xs: 'text-xs',     // 12px
        sm: 'text-sm',     // 14px
        base: 'text-base', // 16px
        lg: 'text-lg',     // 18px
        xl: 'text-xl',     // 20px
        '2xl': 'text-2xl', // 24px
        '3xl': 'text-3xl', // 30px
        '4xl': 'text-4xl', // 36px
    },

    // =============================================================================
    // PESO DE FUENTE
    // =============================================================================
    fontWeight: {
        normal: 'font-normal',     // 400
        medium: 'font-medium',     // 500
        semibold: 'font-semibold', // 600
        bold: 'font-bold',         // 700
    },

    // =============================================================================
    // ALTURA DE LÍNEA
    // =============================================================================
    lineHeight: {
        tight: 'leading-tight',   // 1.25
        normal: 'leading-normal', // 1.5
        relaxed: 'leading-relaxed', // 1.625
        loose: 'leading-loose',   // 2
    },

    // =============================================================================
    // TIPOGRAFÍA POR COMPONENTE
    // =============================================================================
    component: {
        // Títulos de página
        pageTitle: 'text-2xl font-bold leading-tight text-white',
        pageSubtitle: 'text-lg font-medium leading-normal text-zinc-300',

        // Títulos de sección
        sectionTitle: 'text-xl font-semibold leading-tight text-white',
        sectionSubtitle: 'text-base font-normal leading-normal text-zinc-400',

        // Cards
        cardTitle: 'text-lg font-semibold leading-tight text-white',
        cardDescription: 'text-sm font-normal leading-normal text-zinc-400',

        // Formularios
        formLabel: 'text-sm font-medium leading-normal text-zinc-300',
        formHint: 'text-xs font-normal leading-normal text-zinc-500',
        formError: 'text-xs font-normal leading-normal text-red-400',

        // Inputs
        inputText: 'text-base font-normal leading-normal text-white',
        inputPlaceholder: 'text-base font-normal leading-normal text-zinc-500',

        // Botones
        buttonText: {
            sm: 'text-sm font-medium leading-normal',
            md: 'text-base font-medium leading-normal',
            lg: 'text-lg font-medium leading-normal',
        },

        // Navegación
        navLink: 'text-sm font-medium leading-normal text-zinc-300 hover:text-white',
        navLinkActive: 'text-sm font-medium leading-normal text-white',

        // Sidebar
        sidebarSection: 'text-xs font-semibold leading-normal text-zinc-500 uppercase tracking-wider',
        sidebarItem: 'text-sm font-medium leading-normal text-zinc-300 hover:text-white',
        sidebarItemActive: 'text-sm font-medium leading-normal text-white',

        // Badges
        badgeText: 'text-xs font-medium leading-normal',

        // Tablas
        tableHeader: 'text-sm font-semibold leading-normal text-zinc-300',
        tableCell: 'text-sm font-normal leading-normal text-white',

        // Estados y mensajes
        successMessage: 'text-sm font-medium leading-normal text-green-400',
        errorMessage: 'text-sm font-medium leading-normal text-red-400',
        warningMessage: 'text-sm font-medium leading-normal text-yellow-400',
        infoMessage: 'text-sm font-medium leading-normal text-blue-400',

        // Código y monospace
        code: 'font-mono text-sm leading-normal text-zinc-300 bg-zinc-800 px-2 py-1 rounded',

        // Links
        link: 'text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline',
        linkExternal: 'text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline inline-flex items-center gap-1',
    },

    // =============================================================================
    // JERARQUÍA TIPOGRÁFICA
    // =============================================================================
    hierarchy: {
        h1: 'text-3xl font-bold leading-tight text-white',
        h2: 'text-2xl font-bold leading-tight text-white',
        h3: 'text-xl font-semibold leading-tight text-white',
        h4: 'text-lg font-semibold leading-tight text-white',
        h5: 'text-base font-semibold leading-normal text-white',
        h6: 'text-sm font-semibold leading-normal text-white',

        // Párrafos
        p: 'text-base font-normal leading-relaxed text-zinc-300',
        pSmall: 'text-sm font-normal leading-normal text-zinc-400',
        pLarge: 'text-lg font-normal leading-relaxed text-zinc-300',

        // Listas
        listItem: 'text-base font-normal leading-normal text-zinc-300',
        listItemSmall: 'text-sm font-normal leading-normal text-zinc-400',
    },

    // =============================================================================
    // RESPONSIVE TYPOGRAPHY
    // =============================================================================
    responsive: {
        // Títulos responsivos
        heroTitle: 'text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-white',
        pageTitle: 'text-xl sm:text-2xl lg:text-3xl font-bold leading-tight text-white',
        sectionTitle: 'text-lg sm:text-xl lg:text-2xl font-semibold leading-tight text-white',

        // Texto responsivo
        bodyText: 'text-sm sm:text-base leading-relaxed text-zinc-300',
        smallText: 'text-xs sm:text-sm leading-normal text-zinc-400',
    },

    // =============================================================================
    // UTILIDADES DE TEXTO
    // =============================================================================
    utilities: {
        // Truncate
        truncate: 'truncate',
        truncate2Lines: 'line-clamp-2',
        truncate3Lines: 'line-clamp-3',

        // Alineación
        textLeft: 'text-left',
        textCenter: 'text-center',
        textRight: 'text-right',
        textJustify: 'text-justify',

        // Transformación
        uppercase: 'uppercase',
        lowercase: 'lowercase',
        capitalize: 'capitalize',

        // Decoración
        underline: 'underline',
        noUnderline: 'no-underline',
        lineThrough: 'line-through',

        // Espaciado de letras
        trackingTight: 'tracking-tight',
        trackingNormal: 'tracking-normal',
        trackingWide: 'tracking-wide',
        trackingWider: 'tracking-wider',

        // Selección de texto
        selectNone: 'select-none',
        selectText: 'select-text',
        selectAll: 'select-all',
    },
} as const;

// =============================================================================
// HELPERS PARA TIPOGRAFÍA DINÁMICA
// =============================================================================
export const zenTypography = {
    // Función para obtener tipografía de componente
    getComponent: (component: keyof typeof ZEN_TYPOGRAPHY.component) => {
        return ZEN_TYPOGRAPHY.component[component];
    },

    // Función para obtener jerarquía
    getHeading: (level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') => {
        return ZEN_TYPOGRAPHY.hierarchy[level];
    },

    // Función para obtener texto de botón por tamaño
    getButtonText: (size: 'sm' | 'md' | 'lg') => {
        return ZEN_TYPOGRAPHY.component.buttonText[size];
    },

    // Función para combinar estilos
    combine: (...styles: string[]) => {
        return styles.join(' ');
    },
};
