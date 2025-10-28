'use client'
import React from 'react'
import { LucideIcon } from 'lucide-react'
import { CircleCheck, Clock8, Calendar, User, Camera, Award } from 'lucide-react'

/**
 * Componente PorqueNosotros - Refactorizado siguiendo el sistema de diseño
 * 
 * Sección de beneficios con diseño premium y efectos sofisticados
 * 
 * Características aplicadas:
 * - Sistema de colores zinc como estándar con acentos purple-pink
 * - Gradientes purple-pink para elementos destacados
 * - Efectos de profundidad y separación visual
 * - Cards con bordes animados y efectos cristal
 * - Tipografía mejorada con jerarquía clara
 */

// Interfaz para los items
interface PorqueNosotrosItemProps {
    icon: LucideIcon
    title: string
    description: string
}

// Componente item interno con efectos premium
function PorqueNosotrosItem({ icon: Icon, title, description }: PorqueNosotrosItemProps) {
    return (
        <div className="relative group py-6 px-5 rounded-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
            {/* Borde animado sutil */}
            <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Fondo con efecto cristal */}
            <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-br from-zinc-800/80 via-zinc-850 to-zinc-900/90 backdrop-blur-sm" />

            {/* Efectos radiales decorativos */}
            <div className="absolute inset-0 rounded-xl bg-gradient-radial from-purple-500/5 via-transparent to-transparent opacity-60" />
            <div className="absolute inset-2 rounded-lg bg-gradient-radial from-pink-500/3 via-transparent to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300" />

            {/* Contenido */}
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
                        <Icon className="w-5 h-5 text-purple-300" />
                    </div>
                    <h5 className="font-semibold text-lg text-white">
                        {title}
                    </h5>
                </div>
                <p className="text-zinc-300 font-light leading-relaxed">{description}</p>
            </div>
        </div>
    )
}

// Componente principal
function PorqueNosotros() {
    return (
        <section className="py-16 lg:py-20">
            {/* Elementos decorativos de fondo */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-pink-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-12 lg:mb-16">
                    <p className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-sm text-purple-300 font-medium mb-6">
                        ¿Por qué nosotros?
                    </p>

                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                        Más de <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">10 años de experiencia</span>
                    </h2>

                    <p className="text-xl sm:text-2xl lg:text-3xl text-zinc-300 font-light max-w-4xl mx-auto leading-relaxed">
                        Servicio personalizado y profesional en todo momento.
                    </p>
                </div>

                {/* Grid de beneficios */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    <PorqueNosotrosItem
                        icon={CircleCheck}
                        title="Compromiso"
                        description="Resolvemos cualquier eventualidad y te apoyamos en todo momento."
                    />

                    <PorqueNosotrosItem
                        icon={Clock8}
                        title="Puntualidad"
                        description="Nos anticipamos a llegar 40min antes de que inicie tu servicio."
                    />

                    <PorqueNosotrosItem
                        icon={Calendar}
                        title="Planeación y logística"
                        description="Trabajamos contigo la planificación de sesiones previas y cobertura de evento."
                    />

                    <PorqueNosotrosItem
                        icon={User}
                        title="Personal calificado"
                        description="Personal con experiencia garantizada para cubrir tu evento."
                    />

                    <PorqueNosotrosItem
                        icon={Camera}
                        title="Producción profesional"
                        description="Utilizamos equipos de gama alta para garantizar resultados de calidad."
                    />

                    <PorqueNosotrosItem
                        icon={Award}
                        title="Seguimiento post-entrega"
                        description="Te ofrecemos garantías de post-entrega para garantizar tu satisfacción."
                    />
                </div>
            </div>
        </section>
    )
}

export default PorqueNosotros
