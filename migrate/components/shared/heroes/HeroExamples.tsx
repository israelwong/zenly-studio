// Hero Components Usage Examples
// Este archivo muestra ejemplos de uso de los nuevos componentes Hero

import React from 'react'
import { HeroVideo, HeroImage, HeroText } from '@/app/components/shared/heroes'

export default function HeroExamples() {
    const handleCTA = () => {
        console.log('CTA clicked!')
    }

    return (
        <div className="space-y-0">
            {/* Ejemplo 1: Hero con Video */}
            <HeroVideo
                videoSrc="https://example.com/hero-video.mp4"
                title="Momentos Únicos"
                subtitle="Fotografía y Video Profesional"
                description="Capturamos la esencia de tus eventos más importantes"
                buttons={[
                    {
                        text: "Ver Portafolio",
                        href: "/portafolio",
                        variant: "primary",
                        size: "lg"
                    },
                    {
                        text: "Contactar",
                        href: "/contacto",
                        variant: "outline",
                        size: "lg",
                        withBorder: true
                    }
                ]}
                overlay={true}
                overlayOpacity={40}
                textAlignment="center"
            />

            {/* Ejemplo 2: Hero con Imagen */}
            <HeroImage
                imageSrc="/images/hero-wedding.jpg"
                imageAlt="Boda profesional"
                title="Tu Día Perfecto"
                subtitle="Bodas de Ensueño"
                description="Cada momento merece ser recordado para siempre"
                buttons={[
                    {
                        text: "Solicitar Cotización",
                        href: "/cotizacion",
                        variant: "primary",
                        size: "xl",
                        target: "_blank"
                    },
                    {
                        text: "WhatsApp",
                        href: "https://wa.me/5544546582",
                        variant: "ghost",
                        size: "lg",
                        target: "_blank",
                        withBorder: true
                    }
                ]}
                overlay={true}
                overlayOpacity={60}
                textAlignment="left"
                imagePosition="center"
            />

            {/* Ejemplo 3: Hero Solo Texto */}
            <HeroText
                title="XV Años Mágicos"
                subtitle="Celebra tu Momento Especial"
                description="Una celebración única que merece ser inmortalizada"
                buttons={[
                    {
                        text: "Ver Paquetes",
                        href: "/paquetes/xv-anos",
                        variant: "gradient",
                        size: "lg",
                        fullWidth: false
                    },
                    {
                        text: "Galería XV Años",
                        href: "/galeria/xv-anos",
                        variant: "outline",
                        size: "lg"
                    }
                ]}
                backgroundVariant="gradient"
                backgroundGradient="from-pink-900 via-purple-900 to-indigo-900"
                textAlignment="center"
                pattern="dots"
                patternOpacity={5}
            />

            {/* Ejemplo 4: Hero Texto con Patrón */}
            <HeroText
                title="Eventos Corporativos"
                subtitle="Profesionalismo y Calidad"
                description="Documentamos tus eventos empresariales con la más alta calidad"
                buttons={[
                    {
                        text: "Solicitar Propuesta",
                        onClick: handleCTA,
                        variant: "primary",
                        size: "xl",
                        fullWidth: false,
                        withBorder: true
                    }
                ]}
                backgroundVariant="pattern"
                backgroundColor="bg-gradient-to-br from-zinc-900 to-zinc-800"
                textAlignment="center"
                pattern="grid"
                patternOpacity={8}
                minHeight="min-h-[80vh]"
            />

            {/* Ejemplo 5: Hero Compacto */}
            <HeroText
                title="Contáctanos Ahora"
                description="¿Listo para crear recuerdos inolvidables?"
                buttons={[
                    {
                        text: "5544546582",
                        href: "tel:5544546582",
                        variant: "primary",
                        size: "lg",
                        fullWidth: true
                    },
                    {
                        text: "contacto@prosocial.mx",
                        href: "mailto:contacto@prosocial.mx",
                        variant: "secondary",
                        size: "md",
                        fullWidth: true
                    }
                ]}
                backgroundVariant="solid"
                backgroundColor="bg-zinc-800"
                textAlignment="center"
                minHeight="min-h-[50vh]"
                contentMaxWidth="max-w-2xl"
            />
        </div>
    )
}
