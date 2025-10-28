'use client'
import React, { useState } from 'react'
import FAQAccordion from './FAQAccordion'
import FAQSearch from './FAQSearch'
import FAQCategories from './FAQCategories'

export type FAQVariant = 'compact' | 'full' | 'inline'
export type FAQCategory = 'all' | 'bodas' | 'xv-anos' | 'corporativo' | 'general'

export interface FAQItem {
    id: string
    question: string
    answer: string
    category: FAQCategory
    tags?: string[]
    featured?: boolean
}

interface FAQSectionProps {
    variant?: FAQVariant
    title?: string
    subtitle?: string
    items?: FAQItem[]
    showSearch?: boolean
    showCategories?: boolean
    maxItems?: number
    className?: string
    contentMaxWidth?: string
}

const defaultFAQs: FAQItem[] = [
    // SERVICIOS GENERALES
    {
        id: 'gen-1',
        question: '¿Cuánto tiempo antes debo reservar mi evento?',
        answer: 'Recomendamos reservar con al menos 45 días de anticipación para eventos importantes. Esto nos permite planificar mejor y asegurar la disponibilidad de nuestro equipo principal para tu fecha especial.',
        category: 'general',
        tags: ['reservas', 'tiempo', 'planificación'],
        featured: true
    },
    {
        id: 'gen-2',
        question: '¿Qué incluyen sus paquetes de fotografía y video?',
        answer: 'Nuestros paquetes incluyen: cobertura fotográfica y de video del evento, sesión previa, álbum digital de alta resolución, video highlight de 3-5 minutos, y entrega en USB personalizado. También incluimos servicios de edición profesional.',
        category: 'general',
        tags: ['paquetes', 'incluye', 'servicios']
    },
    {
        id: 'gen-4',
        question: '¿Incluyen sesiones previas al evento?',
        answer: 'Sí, las sesiones previas pueden en fotograía y/o video. Las realizamos en locaciones especiales como jardines, estudios o lugares significativos. Las fotos se entregan en alta resolución con edición profesional y el vide es en 4K.',
        category: 'general',
        tags: ['sesión', 'previa', 'incluido'],
        featured: true
    },

    // MÉTODOS DE PAGO Y GARANTÍAS
    {
        id: 'pago-1',
        question: '¿Cuáles son sus métodos de pago?',
        answer: 'Aceptamos pagos con tarjeta de crédito/débito (con opción a meses sin intereses por temporadas), transferencias bancarias, y efectivo. Los esquema de apartado van cambiando según las condiciones comerciales vigentes en ese momento.',
        category: 'general',
        tags: ['pagos', 'métodos', 'financiamiento']
    },
    {
        id: 'garantia-1',
        question: '¿Qué garantías ofrecen en sus servicios?',
        answer: 'Ofrecemos garantía de satisfacción al 100%. Si no quedas completamente satisfecho con el resultado, hacemos los ajustes en edición de video si es necesario sin costo adicional. También garantizamos la entrega en tiempo y forma según lo acordado.',
        category: 'general',
        tags: ['garantías', 'satisfacción', 'calidad'],
        featured: true
    },
    {
        id: 'entrega-1',
        question: '¿En cuánto tiempo entregan el material final?',
        answer: 'Para fotografías: 7-14 días hábiles. Para videos editados: 40 días hábiles máximo. Para álbumes físicos: 4-6 semanas. Siempre entregamos una galería preview en 48-72 horas para que puedas compartir con familia y amigos.',
        category: 'general',
        tags: ['tiempos', 'entrega', 'plazos']
    }
]

export default function FAQSection({
    variant = 'full',
    title = 'Preguntas Frecuentes',
    subtitle = 'Resolvemos tus dudas más comunes sobre nuestros servicios',
    items = defaultFAQs,
    showSearch = true,
    showCategories = true,
    maxItems,
    className = '',
    contentMaxWidth = 'max-w-4xl'
}: FAQSectionProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<FAQCategory>('all')
    const [openItem, setOpenItem] = useState<string | null>(null)

    // Filtrar FAQs
    const filteredFAQs = items.filter(faq => {
        const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
        const matchesSearch = searchTerm === '' ||
            faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            faq.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

        return matchesCategory && matchesSearch
    })

    // Limitar items si se especifica maxItems
    const displayFAQs = maxItems ? filteredFAQs.slice(0, maxItems) : filteredFAQs

    // Configuración por variante
    const getVariantStyles = () => {
        switch (variant) {
            case 'compact':
                return {
                    sectionPadding: 'py-8',
                    titleSize: 'text-xl sm:text-2xl',
                    subtitleSize: 'text-base',
                    showSubtitle: false,
                    containerClass: 'max-w-2xl mx-auto px-4'
                }
            case 'inline':
                return {
                    sectionPadding: 'py-6',
                    titleSize: 'text-2xl sm:text-3xl',
                    subtitleSize: 'text-lg',
                    showSubtitle: true,
                    containerClass: `${contentMaxWidth} mx-auto px-4 sm:px-6 lg:px-8`
                }
            default: // full
                return {
                    sectionPadding: 'py-6',
                    titleSize: 'text-3xl sm:text-4xl',
                    subtitleSize: 'text-xl',
                    showSubtitle: true,
                    containerClass: `${contentMaxWidth} mx-auto px-4 sm:px-6 lg:px-8`
                }
        }
    }

    const variantStyles = getVariantStyles()

    return (
        <section className={`${variantStyles.sectionPadding} ${className}`}>
            <div className={variantStyles.containerClass}>
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className={`${variantStyles.titleSize} font-bold text-zinc-100 mb-4`}>
                        {title}
                    </h2>
                    {variantStyles.showSubtitle && subtitle && (
                        <p className={`${variantStyles.subtitleSize} text-zinc-300 max-w-2xl mx-auto`}>
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Controles */}
                {(showSearch || showCategories) && variant !== 'compact' && (
                    <div className="mb-8 space-y-4">
                        {showSearch && (
                            <FAQSearch
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                placeholder="Buscar en preguntas frecuentes..."
                            />
                        )}
                        {showCategories && (
                            <FAQCategories
                                selectedCategory={selectedCategory}
                                onCategoryChange={setSelectedCategory}
                            />
                        )}
                    </div>
                )}

                {/* FAQs */}
                <div className="space-y-4">
                    {displayFAQs.length > 0 ? (
                        displayFAQs.map((faq) => (
                            <FAQAccordion
                                key={faq.id}
                                item={faq}
                                isOpen={openItem === faq.id}
                                onToggle={() => setOpenItem(openItem === faq.id ? null : faq.id)}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-zinc-500 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.463-.64-6.316-1.76a4.003 4.003 0 01-.854-5.145l.144-.26a4 4 0 016.144-1.24L12 8l.882-1.404a4 4 0 016.144 1.24l.144.26a4.003 4.003 0 01-.854 5.145A7.962 7.962 0 0112 15z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-zinc-100 mb-2">
                                No encontramos resultados
                            </h3>
                            <p className="text-zinc-300">
                                Intenta con otros términos de búsqueda o{' '}
                                <button
                                    onClick={() => {
                                        setSearchTerm('')
                                        setSelectedCategory('all')
                                    }}
                                    className="text-purple-400 hover:text-purple-300 font-medium"
                                >
                                    ver todas las preguntas
                                </button>
                            </p>
                        </div>
                    )}
                </div>

                {/* CTA para más información */}
                {variant === 'compact' && (
                    <div className="text-center mt-8">
                        <p className="text-zinc-300 mb-4">
                            ¿No encontraste lo que buscabas?
                        </p>
                        <button className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                            <span>Ver todas las preguntas</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}
