'use client'

import { useEffect } from 'react'

interface StudioFaviconProps {
    logoUrl?: string | null
    isotipoUrl?: string | null
    studioName?: string
}

export function StudioFavicon({ logoUrl, isotipoUrl, studioName }: StudioFaviconProps) {
    useEffect(() => {
        // Priorizar isotipo sobre logo para el favicon
        const faviconUrl = isotipoUrl || logoUrl
        if (faviconUrl) {
            // Actualizar favicon
            const updateFavicon = (href: string) => {
                // Remover favicon existente
                const existingFavicon = document.querySelector('link[rel="icon"]')
                if (existingFavicon) {
                    existingFavicon.remove()
                }

                // Crear nuevo favicon
                const link = document.createElement('link')
                link.rel = 'icon'
                link.href = href
                link.type = 'image/x-icon'
                document.head.appendChild(link)

                // También actualizar shortcut icon
                const existingShortcut = document.querySelector('link[rel="shortcut icon"]')
                if (existingShortcut) {
                    existingShortcut.remove()
                }

                const shortcutLink = document.createElement('link')
                shortcutLink.rel = 'shortcut icon'
                shortcutLink.href = href
                shortcutLink.type = 'image/x-icon'
                document.head.appendChild(shortcutLink)

                // Actualizar apple-touch-icon
                const existingApple = document.querySelector('link[rel="apple-touch-icon"]')
                if (existingApple) {
                    existingApple.remove()
                }

                const appleLink = document.createElement('link')
                appleLink.rel = 'apple-touch-icon'
                appleLink.href = href
                appleLink.sizes = '180x180'
                document.head.appendChild(appleLink)
            }

            updateFavicon(faviconUrl)
        } else if (studioName) {
            // Si no hay logo, crear un favicon con la primera letra del nombre
            const canvas = document.createElement('canvas')
            canvas.width = 32
            canvas.height = 32
            const ctx = canvas.getContext('2d')

            if (ctx) {
                // Fondo azul
                ctx.fillStyle = '#3b82f6'
                ctx.fillRect(0, 0, 32, 32)

                // Texto blanco
                ctx.fillStyle = '#ffffff'
                ctx.font = 'bold 20px Arial'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(studioName.charAt(0).toUpperCase(), 16, 16)

                // Convertir a data URL
                const dataUrl = canvas.toDataURL('image/png')

                // Actualizar favicon
                const updateFavicon = (href: string) => {
                    const existingFavicon = document.querySelector('link[rel="icon"]')
                    if (existingFavicon) {
                        existingFavicon.remove()
                    }

                    const link = document.createElement('link')
                    link.rel = 'icon'
                    link.href = href
                    link.type = 'image/png'
                    document.head.appendChild(link)
                }

                updateFavicon(dataUrl)
            }
        }
    }, [logoUrl, isotipoUrl, studioName])

    return null // Este componente no renderiza nada
}
