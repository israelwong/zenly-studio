'use client'
import React from 'react'
import { GuaranteeVariant } from './types'

interface TrustBadgesProps {
    variant?: GuaranteeVariant
    className?: string
}

const trustItems = [
    {
        id: 'experience',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
        ),
        label: '+10 años',
        description: 'De experiencia'
    },
    {
        id: 'events',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
        label: '+500',
        description: 'Eventos realizados'
    },
    {
        id: 'satisfaction',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        ),
        label: '100%',
        description: 'Satisfacción'
    },
    {
        id: 'referrals',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
        label: '85%',
        description: 'Clientes nos refieren'
    }
]

const certifications = [
    {
        id: 'ssl',
        label: 'SSL Seguro',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        )
    },
    {
        id: 'verified',
        label: 'Verificado',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        )
    },
    {
        id: 'insurance',
        label: 'Asegurado',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        )
    }
]

export default function TrustBadges({
    variant = 'full',
    className = ''
}: TrustBadgesProps) {

    const getVariantStyles = () => {
        switch (variant) {
            case 'compact':
                return {
                    showStats: false,
                    showCertifications: true,
                    statsGrid: 'grid-cols-2',
                    certGrid: 'flex-wrap justify-center'
                }
            case 'inline':
                return {
                    showStats: true,
                    showCertifications: true,
                    statsGrid: 'grid-cols-2 md:grid-cols-4',
                    certGrid: 'flex-wrap justify-center'
                }
            default: // full
                return {
                    showStats: true,
                    showCertifications: true,
                    statsGrid: 'grid-cols-2 md:grid-cols-4',
                    certGrid: 'flex-wrap justify-center'
                }
        }
    }

    const variantStyles = getVariantStyles()

    return (
        <div className={`space-y-12 ${className}`}>
            {/* Trust Statistics */}
            {variantStyles.showStats && (
                <div>
                    <h3 className="text-lg font-semibold text-zinc-100 text-center mb-8">
                        Confianza respaldada por resultados
                    </h3>
                    <div className={`grid ${variantStyles.statsGrid} gap-8`}>
                        {trustItems.map((item) => (
                            <div key={item.id} className="text-center group">
                                <div className="flex items-center justify-center w-12 h-12 bg-zinc-700 text-zinc-100 rounded-lg mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                                    {item.icon}
                                </div>
                                <div className="text-3xl font-bold text-zinc-100 mb-1">
                                    {item.label}
                                </div>
                                <div className="text-sm text-zinc-300">
                                    {item.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Certifications */}
            {variantStyles.showCertifications && (
                <div>
                    <div className="text-center mb-6">
                        <p className="text-sm text-zinc-400 mb-4">
                            Trabajamos con los más altos estándares de seguridad y profesionalismo
                        </p>
                        <div className={`flex ${variantStyles.certGrid} gap-6`}>
                            {certifications.map((cert) => (
                                <div key={cert.id} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg border border-zinc-700">
                                    <div className="text-green-400">
                                        {cert.icon}
                                    </div>
                                    <span className="text-sm font-medium text-zinc-200">
                                        {cert.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Reviews Summary */}
            <div className="bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-2xl p-8 text-center border border-zinc-600">
                <div className="flex items-center justify-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-6 h-6 text-yellow-400 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    ))}
                </div>
                <p className="text-lg font-semibold text-zinc-100 mb-2">
                    5/5 estrellas de satisfacción
                </p>
                <p className="text-zinc-300 text-sm">
                    Basado en más de 200 reseñas verificadas de nuestros clientes
                </p>
            </div>
        </div>
    )
}
