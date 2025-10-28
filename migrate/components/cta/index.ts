// CTA System - Sistema Unificado de Call-to-Action
// Exportaciones principales para todos los componentes CTA

// Componentes principales
export { default as CTASection } from './CTASection'
export { default as CTACard } from './CTACard'
export { default as CTAInline } from './CTAInline'
export { default as CTAPaquetes } from './CTAPaquetes'

// Base y tipos
export { CTAButtons, CTABadge, defaultCTAProps } from './CTABase'
export type { CTABaseProps, CTAVariant, CTASize } from './CTABase'

// Configuraciones específicas por página
export const ctaConfigs = {
    // Configuración para página de bodas
    weddings: {
        badge: "💒 Especialistas en Bodas",
        title: "Tu Boda Perfecta Te Espera",
        description: "Creamos momentos únicos con atención personalizada y profesional para el día más importante de tu vida.",
        variant: 'purple' as const,
        size: 'lg' as const
    },

    // Configuración para página de XV años
    fifteens: {
        badge: "👑 Expertos en XV Años",
        title: "Celebremos Tus XV Años",
        description: "Hacemos realidad la fiesta de tus sueños con todos los detalles que imaginas para tu día especial.",
        variant: 'purple' as const,
        size: 'lg' as const
    },

    // Configuración para página de inicio
    home: {
        badge: "🎉 Eventos Únicos",
        title: "Estamos Aquí Para Ti",
        description: "Especializados en crear eventos únicos y memorables. Contáctanos para una cotización personalizada.",
        variant: 'purple' as const,
        size: 'lg' as const
    },

    // Configuración compacta para garantías
    guarantees: {
        badge: "✨ Calidad Garantizada",
        title: "¿Listo para tu evento perfecto?",
        description: "Agenda tu cita y descubre cómo podemos hacer realidad el evento de tus sueños.",
        variant: 'zinc' as const,
        size: 'md' as const,
        showBadge: false
    }
}
