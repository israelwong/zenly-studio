import ImageCarousel from './ImageCarousel'

// Configuración para XV Años
export const XVCarousel = () => {
    const xvImages = Array.from({ length: 10 }, (_, i) => `${i + 1}.jpg`)

    return (
        <ImageCarousel
            images={xvImages}
            baseUrl="https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/fofografia/porfatolio/"
            className="w-full"
            autoplay={4000}
            perView={3.5}
            gap={16}
            breakpoints={{
                1024: { perView: 4, gap: 20 },
                768: { perView: 2.5, gap: 16 },
                640: { perView: 1.3, gap: 12 }
            }}
            imageClassName="object-cover w-full h-full rounded-xl transition-transform duration-300 hover:scale-105"
            containerClassName="relative w-full h-fit"
        />
    )
}

// Configuración para Bodas
export const BodaCarousel = () => {
    const bodaImages = Array.from({ length: 8 }, (_, i) => `boda-${i + 1}.jpg`)

    return (
        <ImageCarousel
            images={bodaImages}
            baseUrl="https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/fofografia/bodas/"
            className="w-full"
            autoplay={3500}
            perView={3.8}
            gap={20}
            breakpoints={{
                1024: { perView: 4.2, gap: 24 },
                768: { perView: 2.8, gap: 16 },
                640: { perView: 1.4, gap: 12 }
            }}
            imageClassName="object-cover w-full h-full rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl"
            containerClassName="relative w-full h-fit"
        />
    )
}

// Configuración para Eventos Corporativos
export const CorporativoCarousel = () => {
    const corporativoImages = Array.from({ length: 6 }, (_, i) => `corporativo-${i + 1}.jpg`)

    return (
        <ImageCarousel
            images={corporativoImages}
            baseUrl="https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/fofografia/corporativo/"
            className="w-full"
            autoplay={4500}
            perView={3.2}
            gap={24}
            breakpoints={{
                1024: { perView: 4, gap: 28 },
                768: { perView: 2.5, gap: 20 },
                640: { perView: 1.2, gap: 16 }
            }}
            imageClassName="object-cover w-full h-full rounded-lg transition-all duration-300 hover:scale-105 hover:brightness-110"
            containerClassName="relative w-full h-fit"
        />
    )
}

// Carrusel dinámico basado en tipo de evento
interface EventCarouselProps {
    tipoEvento: 'boda' | 'xv' | 'xv años' | '15 años' | 'corporativo'
    imagenes?: string[] // 🆕 Prop para imágenes personalizadas
    className?: string
}

export const EventCarousel = ({ tipoEvento, imagenes, className = "" }: EventCarouselProps) => {
    const isXV = tipoEvento === 'xv' || tipoEvento.toLowerCase().includes('xv') || tipoEvento.toLowerCase().includes('15')
    const isCorporativo = tipoEvento === 'corporativo'

    // Si se proporcionan imágenes personalizadas, usarlas
    if (imagenes && imagenes.length > 0) {
        return (
            <div className={className}>
                <ImageCarousel
                    images={imagenes}
                    baseUrl="" // No base URL ya que las imágenes son URLs completas
                    className="w-full"
                    autoplay={4000}
                    perView={3.5}
                    gap={16}
                    breakpoints={{
                        1024: { perView: 4, gap: 20 },
                        768: { perView: 2.5, gap: 16 },
                        640: { perView: 1.3, gap: 12 }
                    }}
                    imageClassName="object-cover w-full h-full rounded-xl transition-transform duration-300 hover:scale-105"
                    containerClassName="relative w-full h-fit"
                />
            </div>
        )
    }

    // Fallback a las imágenes predeterminadas
    return (
        <div className={className}>
            {isCorporativo ? <CorporativoCarousel /> :
                isXV ? <XVCarousel /> : <BodaCarousel />}
        </div>
    )
}

// Exportación por defecto del carrusel base
export default ImageCarousel
