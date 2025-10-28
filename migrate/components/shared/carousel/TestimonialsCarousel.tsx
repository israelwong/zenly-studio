'use client'
import React, { useEffect, useRef } from 'react'
import { Star } from 'lucide-react'
import Glide from '@glidejs/glide'

interface TestimonialData {
    id: string
    nombre: string
    evento: string
    testimonio: string
    rating: number
    fecha: string
}

interface TestimonialsCarouselProps {
    testimonios?: TestimonialData[]
    className?: string
    showTitle?: boolean
    title?: string
    subtitle?: string
    variant?: 'default' | 'compact' | 'centered' | 'dark'
    autoplay?: boolean | number
    showGradients?: boolean
}

// Datos por defecto sin avatares
const defaultTestimonios: TestimonialData[] = [
    {
        id: '1',
        nombre: 'Stephanie Moran',
        evento: 'Boda',
        testimonio: 'Recomiendo ampliamente su servicio! Son muy profesionales, puntuales y realmente los mejores para capturar un momento tan importante en la vida! El material que te entregan es excelente! Muchas gracias por todo',
        rating: 5,
        fecha: '2024'
    },
    {
        id: '2',
        nombre: 'Adris Escalante',
        evento: 'XV Años',
        testimonio: 'El mejor equipo que pude elegir para recordar por siempre los mejores momentos de mi evento, siempre agradecida con ProSocial por su amabilidad, compromiso, profesionalismo, disponibilidad y paciencia.',
        rating: 5,
        fecha: '2024'
    },
    {
        id: '3',
        nombre: 'Ashly Neri',
        evento: 'XV Años',
        testimonio: 'Hacen un trabajo increíble! Son súper profesionales y muy atentos a lo que quieres para tu servicio, me encanto, lo recomiendo 100%.',
        rating: 5,
        fecha: '2024'
    },
    {
        id: '4',
        nombre: 'Patricia Soriano',
        evento: 'XV Años',
        testimonio: 'Son un excelente equipo de trabajo, muy profesionales y la calidad de su trabajo es de excelencia, cumplidos en las fechas acordadas y bastante confiables, ampliamente recomendables. Felicidades por el excelente equipo y la calidad de sus servicios 👏🏼👏🏼👏🏼.',
        rating: 5,
        fecha: '2024'
    },
    {
        id: '5',
        nombre: 'Paty Benitez',
        evento: 'XV Años',
        testimonio: 'Excelente servicio muy profesional y con buena disposición para cualquier idea. Súper recomendable!!!',
        rating: 5,
        fecha: '2024'
    },
    {
        id: '6',
        nombre: 'Mara Hernandez',
        evento: 'XV Años',
        testimonio: 'Tienen un servicio de excelencia y cálidad, me encanta su forma de trabajo y son muy cumplidos en lo que prometen',
        rating: 5,
        fecha: '2024'
    },
    {
        id: '7',
        nombre: 'Norma Manzo',
        evento: 'XV Años',
        testimonio: 'Gracias prosocial muy satisfecha con su trabajo, excelente equipo todo de 10 de principio o fin. Fue un placer es algo que vale mucho la pena recuerdos de muy buena calidad!',
        rating: 5,
        fecha: '2024'
    },
    {
        id: '8',
        nombre: 'Elia Gatell',
        evento: 'XV Años',
        testimonio: 'Todos los servicios que ofrecen.  Sus atenciones, su compromiso por hacer su trabajo y darme una satisfacción plena a mi evento  y la actitud  de cada una de sus  integrantes en verdad son  personas que Aman y disfrutan su trabajo . Así ampliamente los recomiendo 👌.',
        rating: 5,
        fecha: '2024'
    }
];

// Componente de testimonio individual con variantes
const TestimonialCard = ({
    testimonio,
    variant = 'default'
}: {
    testimonio: TestimonialData
    variant?: 'default' | 'compact' | 'centered' | 'dark'
}) => {
    const cardClasses = {
        default: "bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mx-2",
        compact: "bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 mx-1",
        centered: "bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 mx-3",
        dark: "bg-zinc-800 rounded-xl p-6 shadow-xl border border-zinc-700 hover:bg-zinc-750 hover:border-zinc-600 transition-all duration-300 mx-2"
    }

    const textClasses = {
        default: { name: "text-gray-900", content: "text-gray-700", stars: "text-yellow-400 fill-yellow-400" },
        compact: { name: "text-gray-900", content: "text-gray-700", stars: "text-yellow-400 fill-yellow-400" },
        centered: { name: "text-gray-900", content: "text-gray-700", stars: "text-yellow-400 fill-yellow-400" },
        dark: { name: "text-white", content: "text-zinc-300", stars: "text-yellow-400 fill-yellow-400" }
    }

    const textSizes = {
        default: "text-sm sm:text-base",
        compact: "text-xs sm:text-sm",
        centered: "text-base sm:text-lg",
        dark: "text-base sm:text-lg"
    }

    const currentTextClasses = textClasses[variant]

    return (
        <div className={cardClasses[variant]}>
            {/* Header con info del cliente */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                    <h4 className={`font-semibold ${currentTextClasses.name} ${variant === 'compact' ? 'text-base' : 'text-lg'}`}>
                        {testimonio.nombre}
                    </h4>
                </div>
                <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={`${variant === 'compact' ? 'w-3 h-3' : 'w-5 h-5'} ${i < testimonio.rating
                                ? currentTextClasses.stars
                                : variant === 'dark' ? 'text-zinc-600' : 'text-gray-300'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Testimonio */}
            <p className={`${currentTextClasses.content} leading-relaxed ${textSizes[variant]} italic`}>
                "{testimonio.testimonio}"
            </p>

            {/* Línea decorativa */}
            {variant !== 'dark' && (
                <div className="mt-4 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            )}
        </div>
    )
}

export default function TestimonialsCarousel({
    testimonios = defaultTestimonios,
    className = "",
    showTitle = true,
    title = "Lo que dicen nuestros clientes",
    subtitle = "Testimonios reales de familias que confiaron en nosotros para sus momentos más especiales",
    variant = 'default',
    autoplay = 4000,
    showGradients = true
}: TestimonialsCarouselProps) {
    const glideRef = useRef<HTMLDivElement>(null)
    const glideInstanceRef = useRef<Glide | null>(null)

    useEffect(() => {
        if (!glideRef.current) return

        const perViewConfig = {
            default: { xl: 3, lg: 2, md: 1.5, sm: 1 },
            compact: { xl: 4, lg: 3, md: 2, sm: 1 },
            centered: { xl: 2, lg: 1.5, md: 1, sm: 1 },
            dark: { xl: 3, lg: 2, md: 1.5, sm: 1 }
        }

        const config = perViewConfig[variant]

        const glideInstance = new Glide(glideRef.current, {
            type: "carousel",
            focusAt: "center",
            perView: config.xl,
            autoplay: autoplay === false ? false : (typeof autoplay === 'number' ? autoplay : 4000),
            animationDuration: 800,
            gap: variant === 'compact' ? 16 : 24,
            classes: {
                activeNav: "[&>*]:bg-purple-500",
            },
            breakpoints: {
                1280: { perView: config.xl, gap: variant === 'compact' ? 16 : 24 },
                1024: { perView: config.lg, gap: variant === 'compact' ? 14 : 20 },
                768: { perView: config.md, gap: variant === 'compact' ? 12 : 16 },
                640: { perView: config.sm, gap: variant === 'compact' ? 10 : 12 }
            },
        })

        glideInstance.mount()
        glideInstanceRef.current = glideInstance

        return () => {
            if (glideInstanceRef.current) {
                glideInstanceRef.current.destroy()
            }
        }
    }, [variant, autoplay])

    const sectionClasses = {
        default: "py-16 px-4 bg-gradient-to-br from-gray-50 to-gray-100",
        compact: "py-8 px-4 bg-gray-50",
        centered: "py-20 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100",
        dark: "w-full"
    }

    return (
        <section className={`${sectionClasses[variant]} ${className}`}>
            <div className={`mx-auto ${variant === 'centered' ? 'max-w-6xl' : 'max-w-7xl'}`}>
                {/* Header */}
                {showTitle && variant !== 'dark' && (
                    <div className={`text-center ${variant === 'compact' ? 'mb-8' : 'mb-12'}`}>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Star className={`text-yellow-400 fill-yellow-400 ${variant === 'compact' ? 'w-6 h-6' : 'w-8 h-8'}`} />
                            <h2 className={`font-bold text-gray-900 ${variant === 'compact' ? 'text-2xl sm:text-3xl' :
                                variant === 'centered' ? 'text-4xl sm:text-5xl' :
                                    'text-3xl sm:text-4xl'
                                }`}>
                                {title}
                            </h2>
                            <Star className={`text-yellow-400 fill-yellow-400 ${variant === 'compact' ? 'w-6 h-6' : 'w-8 h-8'}`} />
                        </div>
                        <p className={`text-gray-600 mx-auto leading-relaxed ${variant === 'compact' ? 'text-base max-w-xl' :
                            variant === 'centered' ? 'text-xl max-w-3xl' :
                                'text-lg max-w-2xl'
                            }`}>
                            {subtitle}
                        </p>
                    </div>
                )}

                {/* Carrusel de testimonios */}
                <div className="relative">
                    <div ref={glideRef} className="glide-testimonios relative w-full h-fit">
                        <div className="overflow-hidden" data-glide-el="track">
                            <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [touch-action: pan-Y] [will-change: transform] relative flex w-full overflow-hidden p-0">
                                {testimonios.map((testimonio) => (
                                    <li key={testimonio.id} className="glide__slide">
                                        <TestimonialCard testimonio={testimonio} variant={variant} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Indicadores de navegación visual */}
                    {showGradients && variant !== 'dark' && (
                        <>
                            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-gray-100 via-gray-100/50 to-transparent pointer-events-none z-10" />
                            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-gray-100 via-gray-100/50 to-transparent pointer-events-none z-10" />
                        </>
                    )}
                    {showGradients && variant === 'dark' && (
                        <>
                            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-900 via-zinc-900/60 to-transparent pointer-events-none z-10" />
                            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-900 via-zinc-900/60 to-transparent pointer-events-none z-10" />
                        </>
                    )}
                </div>
            </div>
        </section>
    )
}

// Export también del tipo para usar en otros componentes
export type { TestimonialData }
