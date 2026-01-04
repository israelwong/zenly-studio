/**
 * Script para rellenar snapshots faltantes en cotizaciones existentes
 * Ejecutar con: npx tsx scripts/fix-missing-snapshots.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Cargar variables de entorno
config({ path: resolve(__dirname, '../.env.local') });

if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    throw new Error('DATABASE_URL o DIRECT_URL debe estar definida');
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;

const pgPool = new Pool({
    connectionString,
    max: 5,
});

const adapter = new PrismaPg(pgPool);

const prisma = new PrismaClient({
    adapter,
});

async function fixMissingSnapshots() {
    console.log('🔍 Ejecutando actualización de snapshots...');

    try {
        // Usar SQL directo para actualizar todos los items que necesitan snapshots
        const result = await prisma.$executeRaw`
      UPDATE studio_cotizacion_items
      SET 
        name_snapshot = COALESCE(name, 'Sin nombre'),
        description_snapshot = description,
        category_name_snapshot = category_name,
        seccion_name_snapshot = seccion_name,
        unit_price_snapshot = unit_price,
        cost_snapshot = cost,
        expense_snapshot = expense,
        profit_snapshot = profit,
        public_price_snapshot = public_price,
        profit_type_snapshot = profit_type
      WHERE 
        name_snapshot IS NULL 
        OR name_snapshot = 'Servicio migrado'
        OR seccion_name_snapshot IS NULL
        OR category_name_snapshot IS NULL
    `;

        console.log(`\n✅ Actualización completada: ${result} registros actualizados`);
    } catch (error) {
        console.error('❌ Error durante la actualización:', error);
        throw error;
    }
}

// Ejecutar script
fixMissingSnapshots()
    .then(() => {
        console.log('\n✨ Script completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error fatal:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

