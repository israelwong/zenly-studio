'use client'
import React from 'react'
import Link from 'next/link'

/**
 * Kit de Botones - Componente UI centralizado siguiendo ESTILO_MAESTRO_MAIN.md
 * 
 * Botones sofisticados con gradientes avanzados y efectos visuales
 * 
 * Características aplicadas:
 * - Gradientes diagonales multi-color para mayor sofisticación
 * - Efectos de superposición antes/después para brillos sutiles
 * - Sistema de variantes completo (primary, secondary, outline, ghost, gradient)
 * - Tamaños consistentes con el sistema de diseño
 * - Animaciones y transiciones suaves
 * - Focus states y accessibility compliance
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'translucent'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps {
    children: React.ReactNode
    variant?: ButtonVariant
    size?: ButtonSize
    href?: string
    target?: '_blank' | '_self'
    onClick?: () => void
    disabled?: boolean
    fullWidth?: boolean
    withBorder?: boolean
    className?: string
    type?: 'button' | 'submit' | 'reset'
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    href,
    target = '_self',
    onClick,
    disabled = false,
    fullWidth = false,
    withBorder = false,
    className = '',
    type = 'button'
}: ButtonProps) {

    const getButtonStyles = () => {
        const baseStyles = 'relative group inline-flex items-center justify-center gap-3 font-medium transition-all duration-300 transform hover:scale-[1.01] focus:outline-none overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'

        const variants = {
            primary: `
                relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl
                bg-transparent text-white focus:ring-purple-400/50
                before:absolute before:inset-0 before:rounded-xl before:p-[1px]
                before:bg-[conic-gradient(from_0deg,#8b5cf6_0deg,#ec4899_120deg,#8b5cf6_240deg)] 
                before:animate-rotate before:-z-10
                after:absolute after:inset-[1px] after:rounded-[11px] 
                after:bg-gradient-to-br after:from-zinc-800 after:via-zinc-850 after:to-zinc-900
                hover:after:from-zinc-700 hover:after:via-zinc-750 hover:after:to-zinc-800
                after:-z-5 after:transition-all after:duration-300
                ${fullWidth ? 'w-full' : 'min-w-fit px-1'}
            `,
            secondary: `
                bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 
                hover:from-zinc-600 hover:via-zinc-700 hover:to-zinc-800 
                text-white focus:ring-zinc-400/50 border border-zinc-600/30 rounded-xl 
                shadow-lg hover:shadow-xl backdrop-blur-sm
                before:absolute before:inset-0 before:bg-gradient-to-br 
                before:from-white/15 before:via-transparent before:to-transparent 
                before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-300
                ${fullWidth ? 'w-full' : 'min-w-fit px-1'}
            `,
            outline: `
                border-2 border-white/70 dark:border-white/70 
                text-zinc-700 dark:text-white 
                hover:bg-gradient-to-br hover:from-purple-50/20 hover:via-pink-50/10 hover:to-purple-50/20 
                dark:hover:from-white/15 dark:hover:via-white/8 dark:hover:to-white/15 
                hover:border-purple-400/80 dark:hover:border-white/90 
                focus:ring-purple-400/50 dark:focus:ring-white/50 backdrop-blur-sm rounded-xl 
                shadow-md hover:shadow-lg transition-all duration-300
                before:absolute before:inset-0 before:bg-gradient-to-br 
                before:from-purple-500/8 before:via-transparent before:to-pink-500/8 
                before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-300
                ${fullWidth ? 'w-full' : 'min-w-fit px-1'}
            `,
            ghost: `
                text-zinc-700 dark:text-white 
                hover:bg-gradient-to-br hover:from-purple-100/30 hover:via-pink-100/15 hover:to-purple-100/30 
                dark:hover:from-white/20 dark:hover:via-white/10 dark:hover:to-white/20 
                focus:ring-purple-400/50 dark:focus:ring-white/50 backdrop-blur-sm rounded-xl
                before:absolute before:inset-0 before:bg-gradient-to-br 
                before:from-purple-500/5 before:via-transparent before:to-pink-500/5 
                before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-300
                ${fullWidth ? 'w-full' : 'min-w-fit px-1'}
            `,
            gradient: `
                bg-gradient-to-br from-purple-400 via-fuchsia-500 to-pink-400 
                hover:from-purple-500 hover:via-fuchsia-600 hover:to-pink-500 
                text-white focus:ring-fuchsia-400/50 rounded-xl shadow-xl hover:shadow-2xl
                before:absolute before:inset-0 before:bg-gradient-to-br 
                before:from-white/25 before:via-yellow-300/15 before:to-transparent 
                before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-500
                ${fullWidth ? 'w-full' : 'min-w-fit px-1'}
            `,
            translucent: `
                relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl
                bg-transparent text-white focus:ring-purple-400/50
                before:absolute before:inset-0 before:rounded-xl before:p-[1px]
                before:bg-[conic-gradient(from_0deg,#8b5cf6_0deg,#ec4899_120deg,#8b5cf6_240deg)] 
                before:animate-rotate before:-z-10
                after:absolute after:inset-[1px] after:rounded-[11px] 
                after:bg-gradient-to-br after:from-black/15 after:via-black/25 after:to-black/40
                hover:after:from-black/20 hover:after:via-black/30 hover:after:to-black/45
                after:-z-5 after:transition-all after:duration-300 after:backdrop-blur-md
                ${fullWidth ? 'w-full' : 'min-w-fit px-1'}
            `
        }

        const sizes = {
            sm: `py-2.5 px-5 text-sm font-medium tracking-normal ${fullWidth ? '' : 'min-w-[110px]'}`,
            md: `py-3 px-6 text-base font-medium tracking-normal ${fullWidth ? '' : 'min-w-[130px]'}`,
            lg: `py-3.5 px-8 text-base font-semibold tracking-wide ${fullWidth ? '' : 'min-w-[160px]'}`,
            xl: `py-4 px-10 text-lg font-semibold tracking-wide ${fullWidth ? '' : 'min-w-[200px]'}`
        }

        const borderStyles = withBorder ? 'ring-2 ring-white/20' : ''

        // Limpiar clases CSS para evitar conflictos
        const cleanVariantStyles = variants[variant].replace(/\s+/g, ' ').trim()

        return `${baseStyles} ${cleanVariantStyles} ${sizes[size]} ${borderStyles} ${className}`
    }

    const buttonContent = (
        <span className="relative z-30 flex items-center justify-center gap-3 transition-all duration-200 group-hover:scale-[1.02]">
            {/* Efectos radiales en capas para efecto cristal */}
            {variant === 'primary' && (
                <>
                    {/* Capa radial externa */}
                    <span className="absolute inset-0 rounded-[8px] bg-gradient-radial from-white/10 via-transparent to-transparent opacity-60 z-10" />

                    {/* Capa radial media */}
                    <span className="absolute inset-2 rounded-[6px] bg-gradient-radial from-purple-400/15 via-pink-400/8 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300 z-11" />

                    {/* Efecto de reflejo cristal lateral */}
                    <span className="absolute top-2 left-1 w-6 h-6 rounded-full bg-gradient-radial from-white/15 to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-300 z-14" />
                </>
            )}

            {/* Efectos radiales específicos para translucent - equilibrio entre contraste y elegancia */}
            {variant === 'translucent' && (
                <>
                    {/* Capa radial externa - menos oscura */}
                    <span className="absolute inset-0 rounded-[8px] bg-gradient-radial from-black/12 via-black/6 to-transparent opacity-70 z-10" />

                    {/* Capa radial media - con toque de color pero más sutil */}
                    <span className="absolute inset-2 rounded-[6px] bg-gradient-radial from-purple-900/20 via-black/8 to-transparent opacity-65 group-hover:opacity-80 transition-opacity duration-300 z-11" />

                    {/* Efecto de reflejo cristal lateral - más sutil */}
                    <span className="absolute top-2 left-1 w-6 h-6 rounded-full bg-gradient-radial from-white/10 to-transparent opacity-35 group-hover:opacity-55 transition-opacity duration-300 z-14" />
                </>
            )}

            <span className="relative z-30 flex items-center gap-3 font-medium text-white bg-transparent">
                {children}
            </span>
        </span>
    )

    if (href && !disabled) {
        return (
            <Link
                href={href}
                target={target}
                className={getButtonStyles()}
                onClick={onClick}
            >
                {buttonContent}
            </Link>
        )
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={getButtonStyles()}
        >
            {buttonContent}
        </button>
    )
}
