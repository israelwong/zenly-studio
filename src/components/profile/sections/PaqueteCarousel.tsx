'use client';

import React, { useRef, useEffect } from 'react';
import Glide from '@glidejs/glide';
import '@glidejs/glide/dist/css/glide.core.min.css';
import '@glidejs/glide/dist/css/glide.theme.min.css';
import { PaqueteCard } from './PaqueteCard';
import { PublicPaquete } from '@/types/public-profile';

interface PaqueteCarouselProps {
    paquetes: PublicPaquete[];
}

export function PaqueteCarousel({ paquetes }: PaqueteCarouselProps) {
    const glideRef = useRef<HTMLDivElement>(null);
    const glideInstanceRef = useRef<Glide | null>(null);

    useEffect(() => {
        if (!glideRef.current || paquetes.length <= 1) return;

        const glideInstance = new Glide(glideRef.current, {
            type: 'carousel',
            focusAt: 'center',
            perView: 1,
            peek: { before: 0, after: 80 },
            autoplay: false,
            animationDuration: 300,
            gap: 16,
            classes: {
                activeNav: '[&>*]:bg-white',
            },
            breakpoints: {
                768: { peek: { before: 0, after: 60 }, gap: 12 },
                640: { peek: { before: 0, after: 50 }, gap: 10 }
            }
        });

        glideInstance.mount();
        glideInstanceRef.current = glideInstance;

        return () => {
            if (glideInstanceRef.current) {
                glideInstanceRef.current.destroy();
                glideInstanceRef.current = null;
            }
        };
    }, [paquetes]);

    if (paquetes.length === 0) {
        return null;
    }

    // Si solo hay un paquete, mostrar sin carousel
    if (paquetes.length === 1) {
        return <PaqueteCard paquete={paquetes[0]} />;
    }

    return (
        <div className="glide" ref={glideRef}>
            <div className="glide__track" data-glide-el="track">
                <ul className="glide__slides">
                    {paquetes.map((paquete) => (
                        <li key={paquete.id} className="glide__slide">
                            <PaqueteCard paquete={paquete} />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

