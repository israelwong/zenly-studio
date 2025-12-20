#!/usr/bin/env tsx
/**
 * Script para eliminar todos los teléfonos de un estudio
 * 
 * Uso:
 *   npx tsx scripts/delete-all-phones.ts <studio-slug>
 * 
 * Ejemplo:
 *   npx tsx scripts/delete-all-phones.ts mi-estudio
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Crear pool de conexiones PostgreSQL
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Crear adapter de Prisma para PostgreSQL
const adapter = new PrismaPg(pgPool);

// Cliente de Prisma con adapter (requerido en Prisma 7)
const prisma = new PrismaClient({
    adapter,
    log: ['error'],
});

async function deleteAllPhones(studioSlug: string) {
    try {
        console.log(`🔍 Buscando estudio con slug: ${studioSlug}`);

        // Buscar el studio por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true, studio_name: true }
        });

        if (!studio) {
            console.error(`❌ No se encontró el estudio con slug: ${studioSlug}`);
            process.exit(1);
        }

        console.log(`✅ Estudio encontrado: ${studio.studio_name} (ID: ${studio.id})`);

        // Contar teléfonos antes de eliminar
        const phonesCount = await prisma.studio_phones.count({
            where: { studio_id: studio.id }
        });

        console.log(`📞 Teléfonos encontrados: ${phonesCount}`);

        if (phonesCount === 0) {
            console.log('ℹ️  No hay teléfonos para eliminar');
            return;
        }

        // Listar teléfonos antes de eliminar
        const phones = await prisma.studio_phones.findMany({
            where: { studio_id: studio.id },
            select: { id: true, number: true, type: true, is_active: true }
        });

        console.log('\n📋 Teléfonos a eliminar:');
        phones.forEach((phone, index) => {
            console.log(`   ${index + 1}. ${phone.number} (${phone.type}) - ${phone.is_active ? 'Activo' : 'Inactivo'}`);
        });

        // Eliminar todos los teléfonos
        const result = await prisma.studio_phones.deleteMany({
            where: { studio_id: studio.id }
        });

        console.log(`\n✅ Eliminados ${result.count} teléfono(s) del estudio "${studio.studio_name}"`);
        console.log(`\n💡 Ahora puedes crear un nuevo teléfono desde la interfaz de contacto`);

    } catch (error) {
        console.error('❌ Error eliminando teléfonos:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pgPool.end();
    }
}

// Obtener slug del argumento de línea de comandos
const studioSlug = process.argv[2];

if (!studioSlug) {
    console.error('❌ Error: Debes proporcionar el slug del estudio');
    console.log('\nUso:');
    console.log('  npx tsx scripts/delete-all-phones.ts <studio-slug>');
    console.log('\nEjemplo:');
    console.log('  npx tsx scripts/delete-all-phones.ts mi-estudio');
    process.exit(1);
}

deleteAllPhones(studioSlug);
