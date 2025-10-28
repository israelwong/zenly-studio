'use client'
import React from 'react'
import Button from './Button'
import { ArrowRight, Download, Star, Heart } from 'lucide-react'

/**
 * Showcase del Button Component mejorado
 * Muestra todas las variantes y capacidades del botón sofisticado
 */

export default function ButtonShowcase() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-white">Kit de Botones Sofisticados</h1>
                    <p className="text-xl text-zinc-300">Adaptativo, elegante y completamente funcional</p>
                </div>

                {/* Primary Buttons - Más sofisticados */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Botones Primary - Efecto Cristal con Decorativos Radiales</h2>
                    <p className="text-zinc-400">Interior con capas radiales superpuestas que crean un efecto cristal premium y sofisticado</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Button variant="primary" size="sm">
                            <Star className="w-4 h-4" />
                            Pequeño
                        </Button>
                        <Button variant="primary" size="md">
                            <Heart className="w-5 h-5" />
                            Mediano
                        </Button>
                        <Button variant="primary" size="lg">
                            Ver Paquetes
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <Button variant="primary" size="xl">
                            <Download className="w-6 h-6" />
                            Extra Grande
                        </Button>
                    </div>
                </section>

                {/* Botones con contenido adaptativo */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Contenido Adaptativo</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Button variant="primary" size="lg" fullWidth>
                            Botón de Ancho Completo
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <Button variant="primary" size="lg">
                            Contenido Dinámico
                        </Button>
                    </div>
                </section>

                {/* Todas las variantes */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Todas las Variantes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <Button variant="primary" size="md">Primary</Button>
                        <Button variant="secondary" size="md">Secondary</Button>
                        <Button variant="outline" size="md">Outline</Button>
                        <Button variant="ghost" size="md">Ghost</Button>
                        <Button variant="gradient" size="md">Gradient</Button>
                        <Button variant="translucent" size="md">Translucent</Button>
                    </div>
                </section>

                {/* Nueva sección específica para Translucent */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Botones Translucent - Para Weddings y Fondos Variados</h2>
                    <p className="text-zinc-400">Fondo translúcido con efecto blur que se adapta perfectamente a cualquier fondo</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Button variant="translucent" size="sm">
                            <Star className="w-4 h-4" />
                            Pequeño
                        </Button>
                        <Button variant="translucent" size="md">
                            <Heart className="w-5 h-5" />
                            Mediano
                        </Button>
                        <Button variant="translucent" size="lg">
                            Ver Paquetes Bodas
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <Button variant="translucent" size="xl">
                            <Download className="w-6 h-6" />
                            Extra Grande
                        </Button>
                    </div>
                </section>

                {/* Botones con enlaces */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Botones como Enlaces</h2>
                    <div className="flex flex-wrap gap-4">
                        <Button
                            variant="primary"
                            size="lg"
                            href="/contacto"
                        >
                            Contactar Ahora
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="md"
                            href="https://example.com"
                            target="_blank"
                        >
                            Enlace Externo
                        </Button>
                    </div>
                </section>

                {/* Estados especiales */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Estados Especiales</h2>
                    <div className="flex flex-wrap gap-4">
                        <Button variant="primary" size="md" disabled>
                            Deshabilitado
                        </Button>
                        <Button variant="primary" size="md" withBorder>
                            Con Borde
                        </Button>
                        <Button
                            variant="gradient"
                            size="lg"
                            onClick={() => alert('¡Botón presionado!')}
                        >
                            <Star className="w-5 h-5" />
                            Acción Especial
                        </Button>
                    </div>
                </section>

            </div>
        </div>
    )
}
