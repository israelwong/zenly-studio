#!/usr/bin/env tsx
/**
 * Script helper para ejecutar comandos de Prisma usando DIRECT_URL
 * 
 * Este script asegura que comandos como `db push` y `migrate` usen
 * la conexión directa (puerto 5432) en lugar del pooler (puerto 6543).
 * 
 * Uso: tsx scripts/prisma-with-direct.ts <comando-prisma> [args...]
 * Ejemplo: tsx scripts/prisma-with-direct.ts db push
 */

import { config } from "dotenv";
import { execSync } from "child_process";
import { resolve } from "path";

// Cargar variables de entorno desde .env.local
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const DIRECT_URL = process.env.DIRECT_URL;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DIRECT_URL) {
  console.error("❌ ERROR: DIRECT_URL no está definido en .env.local");
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL no está definido en .env.local");
  process.exit(1);
}

// Comandos que requieren conexión directa
const DIRECT_CONNECTION_COMMANDS = [
  "db push",
  "migrate",
  "db pull",
  "migrate dev",
  "migrate deploy",
  "migrate reset",
];

// Comandos de migración que necesitan --skip-shadow-database para Supabase
// NOTA: migrate deploy NO acepta --skip-shadow-database
const MIGRATE_COMMANDS_WITH_SKIP_SHADOW = [
  "migrate dev",
];

const args = process.argv.slice(2);
const command = args.join(" ");

// Verificar si el comando requiere conexión directa
const needsDirectConnection = DIRECT_CONNECTION_COMMANDS.some((cmd) =>
  command.includes(cmd)
);

if (needsDirectConnection) {
  console.log("🔗 Usando conexión directa (DIRECT_URL) para:", command);
  
  // Agregar --skip-shadow-database solo para migrate dev (necesario para Supabase)
  // migrate deploy NO acepta este flag
  const needsSkipShadow = MIGRATE_COMMANDS_WITH_SKIP_SHADOW.some((cmd) => command.includes(cmd));
  const finalCommand = needsSkipShadow 
    ? `${command} --skip-shadow-database`
    : command;
  
  // Ejecutar Prisma con DIRECT_URL como DATABASE_URL temporalmente
  // Esto evita el error "prepared statement already exists" del pooler
  execSync(`npx prisma ${finalCommand}`, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: DIRECT_URL,
    },
  });
} else {
  // Para otros comandos (generate, studio, etc.), usar configuración normal
  execSync(`npx prisma ${command}`, {
    stdio: "inherit",
  });
}

