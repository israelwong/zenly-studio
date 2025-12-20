// ZEN Design System - Color Tokens
// Paleta de colores unificada para tema oscuro

export const ZEN_COLORS = {
    // =============================================================================
    // FONDOS
    // =============================================================================
    background: {
        primary: 'bg-zinc-950',      // Fondo principal de páginas
        secondary: 'bg-zinc-900',    // Cards y contenedores
        tertiary: 'bg-zinc-800',     // Bordes y separadores
        input: 'bg-zinc-900',        // Fondo de inputs
        hover: 'hover:bg-zinc-800',  // Estados hover
        focus: 'focus:bg-zinc-850',  // Estados focus (custom)
    },

    // =============================================================================
    // TEXTO
    // =============================================================================
    text: {
        primary: 'text-white',       // Texto principal
        secondary: 'text-zinc-300',  // Texto secundario
        muted: 'text-zinc-500',      // Placeholders y texto deshabilitado
        inverse: 'text-zinc-950',    // Texto sobre fondos claros
    },

    // =============================================================================
    // BORDES
    // =============================================================================
    border: {
        default: 'border-zinc-700',  // Bordes por defecto
        focus: 'border-zinc-600',    // Bordes en focus
        hover: 'hover:border-zinc-600', // Bordes en hover
        error: 'border-red-500',     // Bordes de error
        success: 'border-green-500', // Bordes de éxito
    },

    // =============================================================================
    // ESTADOS SEMÁNTICOS
    // =============================================================================
    semantic: {
        // Éxito
        success: {
            bg: 'bg-green-600',
            hover: 'hover:bg-green-700',
            text: 'text-green-400',
            border: 'border-green-500',
            light: 'bg-green-900/20',
        },

        // Error/Destructivo
        error: {
            bg: 'bg-red-600',
            hover: 'hover:bg-red-700',
            text: 'text-red-400',
            border: 'border-red-500',
            light: 'bg-red-900/20',
        },

        // Advertencia
        warning: {
            bg: 'bg-yellow-600',
            hover: 'hover:bg-yellow-700',
            text: 'text-yellow-400',
            border: 'border-yellow-500',
            light: 'bg-yellow-900/20',
        },

        // Información
        info: {
            bg: 'bg-blue-600',
            hover: 'hover:bg-blue-700',
            text: 'text-blue-400',
            border: 'border-blue-500',
            light: 'bg-blue-900/20',
        },
    },

    // =============================================================================
    // BOTONES PRIMARIOS
    // =============================================================================
    button: {
        // Botón principal (Studio theme)
        primary: {
            bg: 'bg-blue-600',
            hover: 'hover:bg-blue-700',
            focus: 'focus:bg-blue-700',
            text: 'text-white',
            ring: 'focus:ring-blue-500/20',
        },

        // Botón secundario
        secondary: {
            bg: 'bg-zinc-700',
            hover: 'hover:bg-zinc-600',
            focus: 'focus:bg-zinc-600',
            text: 'text-white',
            ring: 'focus:ring-zinc-500/20',
        },

        // Botón outline
        outline: {
            bg: 'bg-transparent',
            hover: 'hover:bg-zinc-800',
            focus: 'focus:bg-zinc-800',
            text: 'text-zinc-300',
            border: 'border-zinc-600',
            ring: 'focus:ring-zinc-500/20',
        },

        // Botón ghost
        ghost: {
            bg: 'bg-transparent',
            hover: 'hover:bg-zinc-800',
            focus: 'focus:bg-zinc-800',
            text: 'text-zinc-300',
            ring: 'focus:ring-zinc-500/20',
        },
    },

    // =============================================================================
    // INPUTS Y FORMULARIOS
    // =============================================================================
    input: {
        bg: 'bg-zinc-900',
        border: 'border-zinc-700',
        focusBorder: 'focus:border-zinc-600',
        focusRing: 'focus:ring-zinc-500/20',
        text: 'text-white',
        placeholder: 'placeholder:text-zinc-500',
        disabled: 'disabled:bg-zinc-800 disabled:text-zinc-500',
    },

    // =============================================================================
    // SIDEBAR Y NAVEGACIÓN
    // =============================================================================
    sidebar: {
        bg: 'bg-zinc-950',
        border: 'border-zinc-700',
        itemHover: 'hover:bg-zinc-800',
        itemActive: 'bg-zinc-800',
        itemText: 'text-zinc-300',
        itemActiveText: 'text-white',
    },

    // =============================================================================
    // CARDS Y CONTENEDORES
    // =============================================================================
    card: {
        bg: 'bg-zinc-900',
        border: 'border-zinc-800',
        shadow: 'shadow-lg shadow-black/20',
        hover: 'hover:bg-zinc-900/80',
    },

    // =============================================================================
    // BADGES Y ETIQUETAS
    // =============================================================================
    badge: {
        default: {
            bg: 'bg-zinc-700',
            text: 'text-zinc-300',
        },
        success: {
            bg: 'bg-green-900/30',
            text: 'text-green-400',
            border: 'border-green-700',
        },
        error: {
            bg: 'bg-red-900/30',
            text: 'text-red-400',
            border: 'border-red-700',
        },
        warning: {
            bg: 'bg-yellow-900/30',
            text: 'text-yellow-400',
            border: 'border-yellow-700',
        },
        info: {
            bg: 'bg-blue-900/30',
            text: 'text-blue-400',
            border: 'border-blue-700',
        },
    },
} as const;

// =============================================================================
// HELPERS PARA USAR CON CN()
// =============================================================================
export const zenColors = {
    // Función helper para obtener colores de botón
    button: (variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive') => {
        switch (variant) {
            case 'primary':
                return `${ZEN_COLORS.button.primary.bg} ${ZEN_COLORS.button.primary.hover} ${ZEN_COLORS.button.primary.text}`;
            case 'secondary':
                return `${ZEN_COLORS.button.secondary.bg} ${ZEN_COLORS.button.secondary.hover} ${ZEN_COLORS.button.secondary.text}`;
            case 'outline':
                return `${ZEN_COLORS.button.outline.bg} ${ZEN_COLORS.button.outline.hover} ${ZEN_COLORS.button.outline.text} ${ZEN_COLORS.button.outline.border}`;
            case 'ghost':
                return `${ZEN_COLORS.button.ghost.bg} ${ZEN_COLORS.button.ghost.hover} ${ZEN_COLORS.button.ghost.text}`;
            case 'destructive':
                return `${ZEN_COLORS.semantic.error.bg} ${ZEN_COLORS.semantic.error.hover} ${ZEN_COLORS.button.primary.text}`;
            default:
                return `${ZEN_COLORS.button.primary.bg} ${ZEN_COLORS.button.primary.hover} ${ZEN_COLORS.button.primary.text}`;
        }
    },

    // Función helper para obtener colores de badge
    badge: (variant: 'default' | 'success' | 'error' | 'warning' | 'info') => {
        const colors = ZEN_COLORS.badge[variant];
        return `${colors.bg} ${colors.text} ${'border' in colors ? colors.border : ''}`;
    },
};
