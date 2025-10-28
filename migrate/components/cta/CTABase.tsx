'use client'
import React from 'react'
import { WhatsAppIcon } from '@/app/components/ui/WhatsAppIcon'
import { Phone } from 'lucide-react'

// Types
export type CTAVariant = 'purple' | 'blue' | 'green' | 'zinc'
export type CTASize = 'sm' | 'md' | 'lg'

export interface CTABaseProps {
    badge?: string
    title?: string
    description?: string
    whatsappNumber?: string
    phoneNumber?: string
    whatsappText?: string
    phoneText?: string
    additionalInfo?: string
    variant?: 'purple' | 'blue' | 'green' | 'zinc'
    size?: 'sm' | 'md' | 'lg'
    showBadge?: boolean
    showAdditionalInfo?: boolean
    className?: string
}

interface CTAButtonsProps {
    whatsappNumber: string
    phoneNumber: string
    whatsappText: string
    phoneText: string
    size: 'sm' | 'md' | 'lg'
}

export function CTAButtons({
    whatsappNumber,
    phoneNumber,
    whatsappText,
    phoneText,
    size
}: CTAButtonsProps) {
    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return {
                    button: 'px-4 py-2 text-sm',
                    icon: 'w-4 h-4'
                }
            case 'lg':
                return {
                    button: 'px-8 py-4 text-lg',
                    icon: 'w-6 h-6'
                }
            default: // md
                return {
                    button: 'px-6 py-3 text-base',
                    icon: 'w-5 h-5'
                }
        }
    }

    const sizeClasses = getSizeClasses()

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center justify-center ${sizeClasses.button} bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-green-600/25 hover:scale-105`}
            >
                <WhatsAppIcon className={`${sizeClasses.icon} mr-3`} />
                {whatsappText}
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    →
                </div>
            </a>
            <a
                href={`tel:${phoneNumber}`}
                className={`group flex items-center justify-center ${sizeClasses.button} bg-transparent border-2 border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold rounded-xl transition-all duration-300`}
            >
                <Phone className={`${sizeClasses.icon} mr-3`} />
                {phoneText}
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    →
                </div>
            </a>
        </div>
    )
}

export function CTABadge({
    text,
    variant
}: {
    text: string
    variant: 'purple' | 'blue' | 'green' | 'zinc'
}) {
    const getVariantClasses = () => {
        switch (variant) {
            case 'blue':
                return 'bg-blue-500/20 border-blue-500/30 text-blue-300'
            case 'green':
                return 'bg-green-500/20 border-green-500/30 text-green-300'
            case 'zinc':
                return 'bg-zinc-500/20 border-zinc-500/30 text-zinc-300'
            default: // purple
                return 'bg-purple-500/20 border-purple-500/30 text-purple-300'
        }
    }

    return (
        <span className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-medium ${getVariantClasses()}`}>
            {text}
        </span>
    )
}

export const defaultCTAProps: CTABaseProps = {
    badge: "✨ Listo para Comenzar",
    title: "Contáctanos Hoy Mismo",
    description: "No esperes más para crear recuerdos únicos. Contáctanos ahora y comencemos a planificar la cobertura perfecta para tu evento.",
    whatsappNumber: "5215512345678",
    phoneNumber: "+525512345678",
    whatsappText: "WhatsApp Directo",
    phoneText: "Llamar Ahora",
    additionalInfo: "Respuesta inmediata • Disponibilidad en tiempo real • Paquetes personalizados",
    variant: 'purple',
    size: 'md',
    showBadge: true,
    showAdditionalInfo: true
}
