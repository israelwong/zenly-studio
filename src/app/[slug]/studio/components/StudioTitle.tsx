'use client'

import { useEffect } from 'react'

interface StudioTitleProps {
    studioName: string
    description?: string | null
}

export function StudioTitle({ studioName, description }: StudioTitleProps) {
    useEffect(() => {
        // Actualizar el título de la página
        const title = `${studioName} - Estudio Fotográfico`
        document.title = title

        // Actualizar meta description si existe
        if (description) {
            const metaDescription = document.querySelector('meta[name="description"]')
            if (metaDescription) {
                metaDescription.setAttribute('content', description)
            }
        }

        // Actualizar Open Graph title
        const ogTitle = document.querySelector('meta[property="og:title"]')
        if (ogTitle) {
            ogTitle.setAttribute('content', title)
        }

        // Actualizar Twitter/X title
        const twitterTitle = document.querySelector('meta[name="twitter:title"]')
        if (twitterTitle) {
            twitterTitle.setAttribute('content', title)
        }

        // Cleanup function para restaurar título original si es necesario
        return () => {
            // Opcional: restaurar título por defecto
            // document.title = 'Zenly Studio'
        }
    }, [studioName, description])

    return null // Este componente no renderiza nada
}
