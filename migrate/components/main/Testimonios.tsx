import React from 'react'
import { TestimonialsCarousel } from '@/app/components/shared/carousel'

function Testimonios() {
    return (
        <section className="w-full bg-zinc-900 py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-zinc-800/80 border border-zinc-700 mb-6">
                        <span className="text-zinc-300 text-sm font-medium">
                            ⭐ Testimonios Reales
                        </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                        Lo que Dicen Nuestros Clientes
                    </h2>
                    <p className="text-zinc-400 text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
                        La satisfacción de nuestros clientes es nuestra mejor carta de presentación
                    </p>
                </div>

                <TestimonialsCarousel
                    variant="dark"
                    autoplay={5000}
                    showGradients={true}
                />
            </div>
        </section>
    )
}

export default Testimonios
