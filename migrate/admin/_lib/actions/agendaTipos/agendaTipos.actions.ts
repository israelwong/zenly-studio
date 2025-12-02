'use server'
import { prisma } from '@/lib/prisma';

export async function obtenerAgendaTipos() {
    return await prisma.agendaTipo.findMany();
}