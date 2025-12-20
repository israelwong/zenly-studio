'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ========================================
// TIPOS Y SCHEMAS
// ========================================

export interface NegocioData {
    id?: string
    nombre: string
    descripcion?: string
    direccion?: string
    telefono?: string
    email?: string
    sitioWeb?: string
    logoUrl?: string
    isotipoUrl?: string
    // Campos con valores por defecto (no se muestran en UI)
    moneda?: string
    timezone?: string
    idioma?: string
}

export interface NegocioRRSSData {
    id?: string
    plataforma: string
    username?: string
    url: string
    activo: boolean
    orden: number
}

export interface NegocioHorariosData {
    id?: string
    diaSemana: number
    horaInicio?: string
    horaFin?: string
    cerrado: boolean
    notas?: string
}

// ========================================
// INFORMACIÓN DEL NEGOCIO
// ========================================

/**
 * Obtener información del negocio
 * Si no existe, devuelve un objeto con valores por defecto
 */
export async function obtenerNegocio(): Promise<NegocioData | null> {
    try {
        const negocio = await prisma.negocio.findFirst({
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' }
        })

        if (!negocio) {
            return null
        }

        return {
            id: negocio.id,
            nombre: negocio.nombre,
            descripcion: negocio.descripcion || undefined,
            direccion: negocio.direccion || undefined,
            telefono: negocio.telefono || undefined,
            email: negocio.email || undefined,
            sitioWeb: negocio.sitioWeb || undefined,
            logoUrl: negocio.logoUrl || undefined,
            isotipoUrl: negocio.isotipoUrl || undefined,
            moneda: negocio.moneda,
            timezone: negocio.timezone,
            idioma: negocio.idioma
        }
    } catch (error) {
        console.error('Error al obtener información del negocio:', error)
        throw new Error('Error al obtener información del negocio')
    }
}

/**
 * Crear o actualizar información del negocio
 */
export async function guardarNegocio(data: NegocioData) {
    try {
        // Buscar si ya existe un negocio
        const negocioExistente = await prisma.negocio.findFirst({
            where: { status: 'active' }
        })

        let resultado

        if (negocioExistente) {
            // Actualizar
            resultado = await prisma.negocio.update({
                where: { id: negocioExistente.id },
                data: {
                    nombre: data.nombre,
                    descripcion: data.descripcion,
                    direccion: data.direccion,
                    telefono: data.telefono,
                    email: data.email,
                    sitioWeb: data.sitioWeb,
                    logoUrl: data.logoUrl,
                    isotipoUrl: data.isotipoUrl,
                    moneda: data.moneda || 'MXN',
                    timezone: data.timezone || 'America/Mexico_City',
                    idioma: data.idioma || 'es',
                    updatedAt: new Date()
                }
            })
        } else {
            // Crear nuevo
            resultado = await prisma.negocio.create({
                data: {
                    nombre: data.nombre,
                    descripcion: data.descripcion,
                    direccion: data.direccion,
                    telefono: data.telefono,
                    email: data.email,
                    sitioWeb: data.sitioWeb,
                    logoUrl: data.logoUrl,
                    isotipoUrl: data.isotipoUrl,
                    moneda: data.moneda || 'MXN',
                    timezone: data.timezone || 'America/Mexico_City',
                    idioma: data.idioma || 'es',
                    status: 'active'
                }
            })
        }

        revalidatePath('/admin/configurar/negocio')

        return {
            success: true,
            data: resultado,
            message: negocioExistente ? 'Información actualizada correctamente' : 'Información creada correctamente'
        }
    } catch (error) {
        console.error('Error al guardar información del negocio:', error)
        return {
            success: false,
            error: 'Error al guardar información del negocio'
        }
    }
}

// ========================================
// REDES SOCIALES
// ========================================

/**
 * Obtener redes sociales del negocio
 */
export async function obtenerRedesSociales(): Promise<NegocioRRSSData[]> {
    try {
        const negocio = await prisma.negocio.findFirst({
            where: { status: 'active' },
            include: {
                NegocioRRSS: {
                    where: { activo: true },
                    orderBy: { orden: 'asc' }
                }
            }
        })

        if (!negocio) {
            return []
        }

        return negocio.NegocioRRSS.map(red => ({
            id: red.id,
            plataforma: red.plataforma,
            username: red.username || undefined,
            url: red.url,
            activo: red.activo,
            orden: red.orden
        }))
    } catch (error) {
        console.error('Error al obtener redes sociales:', error)
        throw new Error('Error al obtener redes sociales')
    }
}

/**
 * Guardar redes sociales del negocio
 */
export async function guardarRedesSociales(redes: NegocioRRSSData[]) {
    try {
        // Obtener o crear negocio
        const negocio = await prisma.negocio.findFirst({
            where: { status: 'active' }
        })

        if (!negocio) {
            throw new Error('Debe configurar la información del negocio primero')
        }

        // Eliminar redes sociales existentes
        await prisma.negocioRRSS.deleteMany({
            where: { negocioId: negocio.id }
        })

        // Crear nuevas redes sociales
        if (redes.length > 0) {
            await prisma.negocioRRSS.createMany({
                data: redes.map(red => ({
                    negocioId: negocio!.id,
                    plataforma: red.plataforma,
                    username: red.username,
                    url: red.url,
                    activo: red.activo,
                    orden: red.orden
                }))
            })
        }

        revalidatePath('/admin/configurar/redes-sociales')

        return {
            success: true,
            message: 'Redes sociales guardadas correctamente'
        }
    } catch (error) {
        console.error('Error al guardar redes sociales:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al guardar redes sociales'
        }
    }
}

// ========================================
// HORARIOS
// ========================================

/**
 * Obtener horarios del negocio
 */
export async function obtenerHorarios(): Promise<NegocioHorariosData[]> {
    try {
        const negocio = await prisma.negocio.findFirst({
            where: { status: 'active' },
            include: {
                NegocioHorarios: {
                    where: { activo: true },
                    orderBy: { diaSemana: 'asc' }
                }
            }
        })

        if (!negocio || !negocio.NegocioHorarios.length) {
            // Devolver horarios por defecto
            return [
                { diaSemana: 0, cerrado: true },      // Domingo
                { diaSemana: 1, horaInicio: '09:00', horaFin: '18:00', cerrado: false }, // Lunes
                { diaSemana: 2, horaInicio: '09:00', horaFin: '18:00', cerrado: false }, // Martes
                { diaSemana: 3, horaInicio: '09:00', horaFin: '18:00', cerrado: false }, // Miércoles
                { diaSemana: 4, horaInicio: '09:00', horaFin: '18:00', cerrado: false }, // Jueves
                { diaSemana: 5, horaInicio: '09:00', horaFin: '18:00', cerrado: false }, // Viernes
                { diaSemana: 6, cerrado: true }       // Sábado
            ]
        }

        return negocio.NegocioHorarios.map(horario => ({
            id: horario.id,
            diaSemana: horario.diaSemana,
            horaInicio: horario.horaInicio || undefined,
            horaFin: horario.horaFin || undefined,
            cerrado: horario.cerrado,
            notas: horario.notas || undefined
        }))
    } catch (error) {
        console.error('Error al obtener horarios:', error)
        throw new Error('Error al obtener horarios')
    }
}

/**
 * Guardar horarios del negocio
 */
export async function guardarHorarios(horarios: NegocioHorariosData[]) {
    try {
        // Obtener o crear negocio
        const negocio = await prisma.negocio.findFirst({
            where: { status: 'active' }
        })

        if (!negocio) {
            throw new Error('Debe configurar la información del negocio primero')
        }

        // Eliminar horarios existentes
        await prisma.negocioHorarios.deleteMany({
            where: { negocioId: negocio.id }
        })

        // Crear nuevos horarios
        await prisma.negocioHorarios.createMany({
            data: horarios.map(horario => ({
                negocioId: negocio!.id,
                diaSemana: horario.diaSemana,
                horaInicio: horario.horaInicio,
                horaFin: horario.horaFin,
                cerrado: horario.cerrado,
                notas: horario.notas,
                activo: true
            }))
        })

        revalidatePath('/admin/configurar/horarios')

        return {
            success: true,
            message: 'Horarios guardados correctamente'
        }
    } catch (error) {
        console.error('Error al guardar horarios:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al guardar horarios'
        }
    }
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

/**
 * Verificar si el negocio está configurado
 */
export async function verificarNegocioConfigurado(): Promise<boolean> {
    try {
        const negocio = await prisma.negocio.findFirst({
            where: { status: 'active' }
        })

        return !!negocio
    } catch (error) {
        console.error('Error al verificar configuración del negocio:', error)
        return false
    }
}

/**
 * Obtener configuración completa del negocio
 */
export async function obtenerConfiguracionCompleta() {
    try {
        const negocio = await obtenerNegocio()
        const redesSociales = await obtenerRedesSociales()
        const horarios = await obtenerHorarios()

        return {
            negocio,
            redesSociales,
            horarios,
            configurado: !!negocio
        }
    } catch (error) {
        console.error('Error al obtener configuración completa:', error)
        throw new Error('Error al obtener configuración completa')
    }
}
