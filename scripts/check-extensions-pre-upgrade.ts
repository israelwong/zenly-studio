/**
 * Script para verificar extensiones antes de upgrade de Postgres
 * Ejecuta verificaciones y muestra resultados formateados
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Extension {
  extension: string;
  version: string;
  estado?: string;
  accion?: string;
  compatibilidad?: string;
}

async function checkExtensions() {
  try {
    console.log('🔍 Verificando extensiones antes del upgrade de Postgres 17.4 → 17.6\n');
    console.log('='.repeat(60) + '\n');

    // 1. Verificar versión actual
    console.log('📊 VERSIÓN ACTUAL DE POSTGRES:');
    const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version() as version;
    `;
    console.log(`   ${versionResult[0]?.version || 'No disponible'}\n`);

    // 2. Verificar extensiones deprecadas
    console.log('⚠️  EXTENSIONES DEPRECADAS (deben deshabilitarse):');
    const deprecatedResult = await prisma.$queryRaw<Array<Extension>>`
      SELECT 
        extname as extension,
        extversion as version,
        'Debe deshabilitarse antes del upgrade' as accion
      FROM pg_extension 
      WHERE extname IN ('plcoffee', 'plls', 'plv8', 'timescaledb', 'pgjwt')
      ORDER BY extname;
    `;

    if (deprecatedResult.length === 0) {
      console.log('   ✅ No hay extensiones deprecadas instaladas\n');
    } else {
      deprecatedResult.forEach(ext => {
        console.log(`   ❌ ${ext.extension} (v${ext.version})`);
        console.log(`      ${ext.accion}`);
      });
      console.log('\n   💡 Para deshabilitar:');
      deprecatedResult.forEach(ext => {
        console.log(`      DROP EXTENSION IF EXISTS ${ext.extension} CASCADE;`);
      });
      console.log('');
    }

    // 3. Listar todas las extensiones
    console.log('📦 TODAS LAS EXTENSIONES INSTALADAS:');
    const allExtensions = await prisma.$queryRaw<Array<Extension>>`
      SELECT 
        extname as extension,
        extversion as version,
        n.nspname as schema,
        CASE 
          WHEN extname IN ('plcoffee', 'plls', 'plv8', 'timescaledb', 'pgjwt') 
          THEN '⚠️ DEPRECADA'
          ELSE '✅ OK'
        END as estado
      FROM pg_extension e
      JOIN pg_namespace n ON e.extnamespace = n.oid
      ORDER BY 
        CASE WHEN extname IN ('plcoffee', 'plls', 'plv8', 'timescaledb', 'pgjwt') THEN 0 ELSE 1 END,
        extname;
    `;

    allExtensions.forEach(ext => {
      const icon = ext.estado?.includes('DEPRECADA') ? '❌' : '✅';
      console.log(`   ${icon} ${ext.extension} (v${ext.version}) - ${ext.schema}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verificación completada\n');

    // Resumen final
    const hasDeprecated = deprecatedResult.length > 0;
    if (hasDeprecated) {
      console.log('⚠️  ACCIÓN REQUERIDA:');
      console.log('   Deshabilita las extensiones deprecadas antes de actualizar Postgres.\n');
    } else {
      console.log('✅ LISTO PARA UPGRADE:');
      console.log('   No hay extensiones deprecadas. Puedes proceder con el upgrade.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkExtensions();
