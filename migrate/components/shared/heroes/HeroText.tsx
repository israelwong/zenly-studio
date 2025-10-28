'use client'
import React from 'react'
import Link from 'next/link'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'
export type TextAlignment = 'left' | 'center' | 'right'

interface ButtonConfig {
    text: string
    href?: string
    onClick?: () => void
    variant?: ButtonVariant
    size?: ButtonSize
    target?: '_blank' | '_self'
    fullWidth?: boolean
    withBorder?: boolean
    className?: string
}

interface HeroTextProps {
    title?: string
    subtitle?: string
    description?: string
    buttons?: ButtonConfig[]
    backgroundVariant?: 'solid' | 'gradient' | 'pattern'
    backgroundColor?: string
    backgroundGradient?: string
    textAlignment?: TextAlignment
    className?: string
    contentMaxWidth?: string
    minHeight?: string
    pattern?: 'dots' | 'grid' | 'waves' | 'none'
    patternOpacity?: number
    textColor?: string
}

export default function HeroText({
    title,
    subtitle,
    description,
    buttons = [],
    backgroundVariant = 'gradient',
    backgroundGradient = 'from-zinc-900 via-zinc-800 to-zinc-900',
    backgroundColor = 'bg-zinc-900',
    textColor = 'text-white',
    textAlignment = 'center',
    className = '',
    contentMaxWidth = 'max-w-4xl',
    minHeight = 'min-h-screen',
    pattern = 'none',
    patternOpacity = 10
}: HeroTextProps) {

    const getButtonStyles = (button: ButtonConfig) => {
        const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2'

        const variants = {
            primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105 focus:ring-purple-500',
            secondary: 'bg-zinc-700 text-white hover:bg-zinc-600 focus:ring-zinc-500',
            outline: 'border-2 border-zinc-300 text-zinc-300 hover:bg-zinc-300 hover:text-zinc-900 focus:ring-zinc-300',
            ghost: 'text-zinc-300 hover:bg-zinc-700 focus:ring-zinc-300',
            gradient: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:scale-105 focus:ring-blue-500'
        }

        const sizes = {
            sm: 'px-4 py-2 text-sm',
            md: 'px-6 py-3 text-base',
            lg: 'px-8 py-4 text-lg',
            xl: 'px-10 py-5 text-xl'
        }

        const borderStyles = button.withBorder ? 'border border-zinc-300/30 backdrop-blur-sm' : ''
        const widthStyles = button.fullWidth ? 'w-full' : ''

        return `${baseStyles} ${variants[button.variant || 'primary']} ${sizes[button.size || 'md']} ${borderStyles} ${widthStyles} ${button.className || ''}`
    }

    const textAlignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    }

    const getBackgroundClasses = () => {
        switch (backgroundVariant) {
            case 'gradient':
                return `bg-gradient-to-br ${backgroundGradient}`
            case 'solid':
                return backgroundColor
            case 'pattern':
                return `${backgroundColor} relative`
            default:
                return backgroundColor
        }
    }

    const getPatternSvg = () => {
        switch (pattern) {
            case 'dots':
                return (
                    <svg className={`absolute inset-0 w-full h-full opacity-${patternOpacity}`} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                <circle cx="20" cy="20" r="2" fill="currentColor" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#dots)" className="text-white" />
                    </svg>
                )
            case 'grid':
                return (
                    <svg className={`absolute inset-0 w-full h-full opacity-${patternOpacity}`} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" className="text-white" />
                    </svg>
                )
            case 'waves':
                return (
                    <svg className={`absolute inset-0 w-full h-full opacity-${patternOpacity}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="text-white fill-current"></path>
                    </svg>
                )
            default:
                return null
        }
    }

    return (
        <div className={`relative ${minHeight} flex items-center justify-center overflow-hidden ${getBackgroundClasses()} ${className}`}>
            {/* Pattern Background */}
            {pattern !== 'none' && getPatternSvg()}

            {/* Content */}
            <div className={`relative z-10 px-4 sm:px-6 lg:px-8 ${contentMaxWidth} mx-auto w-full`}>
                <div className={textAlignmentClasses[textAlignment]}>
                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-lg sm:text-xl md:text-2xl text-pink-400 font-medium mb-4">
                            {subtitle}
                        </p>
                    )}

                    {/* Title */}
                    {title && (
                        <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold ${textColor} mb-6 leading-tight`}>
                            {title}
                        </h1>
                    )}

                    {/* Description */}
                    {description && (
                        <p className={`text-xl sm:text-2xl md:text-3xl ${textColor} opacity-80 mb-8 leading-relaxed max-w-3xl mx-auto`}>
                            {description}
                        </p>
                    )}

                    {/* Buttons */}
                    {buttons.length > 0 && (
                        <div className={`flex flex-col sm:flex-row gap-4 ${textAlignment === 'center' ? 'justify-center' : textAlignment === 'right' ? 'justify-end' : 'justify-start'}`}>
                            {buttons.map((button, index) => (
                                button.href ? (
                                    <Link
                                        key={index}
                                        href={button.href}
                                        target={button.target || '_self'}
                                        className={getButtonStyles(button)}
                                        onClick={button.onClick}
                                    >
                                        {button.text}
                                    </Link>
                                ) : (
                                    <button
                                        key={index}
                                        onClick={button.onClick}
                                        className={getButtonStyles(button)}
                                    >
                                        {button.text}
                                    </button>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
