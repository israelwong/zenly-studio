#!/usr/bin/env tsx
/**
 * Script para ejecutar archivos SQL usando DIRECT_URL con Prisma Client
 * 
 * Este script ejecuta archivos SQL directamente usando la conexión directa
 * (puerto 5432) en lugar del pooler (puerto 6543).
 * 
 * Uso: tsx scripts/execute-sql.ts <ruta-al-archivo.sql>
 * Ejemplo: tsx scripts/execute-sql.ts prisma/migrations/migrate_promise_as_single_source.sql
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Cargar variables de entorno desde .env.local
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const DIRECT_URL = process.env.DIRECT_URL;

if (!DIRECT_URL) {
  console.error("❌ ERROR: DIRECT_URL no está definido en .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const sqlFilePath = args[0];

if (!sqlFilePath) {
  console.error("❌ ERROR: Debes proporcionar la ruta al archivo SQL");
  console.error("Uso: tsx scripts/execute-sql.ts <ruta-al-archivo.sql>");
  process.exit(1);
}

const fullPath = resolve(process.cwd(), sqlFilePath);

async function executeSQL() {
  try {
    // Leer el archivo SQL
    const sqlContent = readFileSync(fullPath, "utf-8");

    console.log(`📄 Ejecutando SQL desde: ${sqlFilePath}`);
    console.log("🔗 Usando conexión directa (DIRECT_URL)");

    // Crear pool de conexiones PostgreSQL usando DIRECT_URL
    const pgPool = new Pool({
      connectionString: DIRECT_URL,
      max: 1, // Solo necesitamos una conexión para ejecutar SQL
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Crear adapter de Prisma para PostgreSQL
    const adapter = new PrismaPg(pgPool);

    // Crear cliente de Prisma con adapter (Prisma 7 lee configuración de prisma.config.ts)
    const prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });

    // Dividir el SQL en statements individuales (separados por ;)
    // Remover comentarios y líneas vacías
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

    console.log(`📝 Ejecutando ${statements.length} statements...`);

    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement);
          console.log(`  ✓ Statement ${i + 1}/${statements.length} ejecutado`);
        } catch (error: unknown) {
          // Ignorar errores de "already exists" o "does not exist" para DROP/ALTER
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : '';

          if (
            errorMessage.includes('does not exist') ||
            errorMessage.includes('already exists') ||
            (errorMessage.includes('column') && errorMessage.includes('does not exist'))
          ) {
            console.log(`  ⚠ Statement ${i + 1}/${statements.length} ignorado (ya aplicado o no existe)`);
          } else {
            throw error;
          }
        }
      }
    }

    await prisma.$disconnect();
    await pgPool.end();

    console.log("✅ Migración ejecutada exitosamente");
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    process.exit(1);
  }
}

executeSQL();

