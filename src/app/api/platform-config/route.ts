import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener configuración de la plataforma
export async function GET() {
    try {
        const config = await prisma.platform_config.findFirst({
            orderBy: { createdAt: 'desc' }
        })

        if (!config) {
            // Si no existe configuración, devolver valores por defecto
            return NextResponse.json({
                id: 'default',
                nombre_empresa: 'ProSocial Platform',
                logo_url: null,
                favicon_url: null,
                comercial_telefono: null,
                comercial_email: null,
                comercial_whatsapp: null,
                soporte_telefono: null,
                soporte_email: null,
                soporte_chat_url: null,
                direccion: null,
                horarios_atencion: null,
                timezone: 'America/Mexico_City',
                facebook_url: null,
                instagram_url: null,
                twitter_url: null,
                linkedin_url: null,
                terminos_condiciones: null,
                politica_privacidad: null,
                aviso_legal: null,
                meta_description: null,
                meta_keywords: null,
                google_analytics_id: null,
                google_tag_manager_id: null,
                createdAt: new Date(),
                updatedAt: new Date()
            })
        }

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error fetching platform config:', error)

        // Manejar errores de conexión específicos
        if (error instanceof Error && (
            error.message.includes('Can\'t reach database server') ||
            error.message.includes('P1001') ||
            error.message.includes('connection')
        )) {
            return NextResponse.json(
                { error: 'Error de conexión con la base de datos. Usando configuración por defecto.' },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { error: 'Error al obtener la configuración de la plataforma' },
            { status: 500 }
        )
    }
}

// POST - Crear o actualizar configuración de la plataforma
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validar campos requeridos
        if (!body.nombre_empresa) {
            return NextResponse.json(
                { error: 'El nombre de la empresa es requerido' },
                { status: 400 }
            )
        }

        // Verificar si ya existe configuración
        const existingConfig = await prisma.platform_config.findFirst({
            orderBy: { createdAt: 'desc' }
        })

        let config

        if (existingConfig) {
            // Actualizar configuración existente
            config = await prisma.platform_config.update({
                where: { id: existingConfig.id },
                data: {
                    ...body,
                    updatedAt: new Date()
                }
            })
        } else {
            // Crear nueva configuración
            config = await prisma.platform_config.create({
                data: {
                    ...body,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            })
        }

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error saving platform config:', error)

        // Manejar errores de conexión específicos
        if (error instanceof Error && (
            error.message.includes('Can\'t reach database server') ||
            error.message.includes('P1001') ||
            error.message.includes('connection')
        )) {
            return NextResponse.json(
                { error: 'Error de conexión con la base de datos. Por favor, intenta nuevamente.' },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { error: 'Error al guardar la configuración de la plataforma' },
            { status: 500 }
        )
    }
}

// PUT - Actualizar configuración específica
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json(
                { error: 'ID de configuración es requerido' },
                { status: 400 }
            )
        }

        const config = await prisma.platform_config.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date()
            }
        })

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error updating platform config:', error)

        // Manejar errores de conexión específicos
        if (error instanceof Error && (
            error.message.includes('Can\'t reach database server') ||
            error.message.includes('P1001') ||
            error.message.includes('connection')
        )) {
            return NextResponse.json(
                { error: 'Error de conexión con la base de datos. Por favor, intenta nuevamente.' },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { error: 'Error al actualizar la configuración de la plataforma' },
            { status: 500 }
        )
    }
}

// DELETE - Eliminar configuración
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'ID de configuración es requerido' },
                { status: 400 }
            )
        }

        await prisma.platform_config.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'Configuración eliminada exitosamente' })
    } catch (error) {
        console.error('Error deleting platform config:', error)

        // Manejar errores de conexión específicos
        if (error instanceof Error && (
            error.message.includes('Can\'t reach database server') ||
            error.message.includes('P1001') ||
            error.message.includes('connection')
        )) {
            return NextResponse.json(
                { error: 'Error de conexión con la base de datos. Por favor, intenta nuevamente.' },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { error: 'Error al eliminar la configuración de la plataforma' },
            { status: 500 }
        )
    }
}
