import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Patrón Singleton para evitar múltiples instancias en serverless
declare global {
  var __prisma: PrismaClient | undefined;
  var __pgPool: Pool | undefined;
}

// Verificar que la URL de la base de datos esté disponible
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

/**
 * Normaliza la URL de conexión para Vercel + Supabase pgbouncer
 * - Detecta si ya tiene parámetros pgbouncer
 * - Agrega connection_limit=1 si usa pgbouncer (requerido para serverless)
 * - Preserva otros parámetros existentes
 */
function normalizeConnectionString(url: string, isPgbouncer: boolean): string {
  try {
    const urlObj = new URL(url);
    
    // Si es pgbouncer, asegurar parámetros críticos
    if (isPgbouncer) {
      urlObj.searchParams.set('pgbouncer', 'true');
      urlObj.searchParams.set('connection_limit', '1');
    }
    
    return urlObj.toString();
  } catch {
    // Si falla el parsing, retornar original
    return url;
  }
}

/**
 * Detecta si la URL usa pgbouncer (puerto 6543 o parámetro pgbouncer=true)
 */
function isPgbouncerUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.port === '6543' ||
      urlObj.searchParams.get('pgbouncer') === 'true' ||
      urlObj.hostname.includes('pooler')
    );
  } catch {
    return false;
  }
}

// Seleccionar URL de conexión según entorno
// Desarrollo: preferir DIRECT_URL para evitar problemas de schema cacheado
// Producción/Vercel: usar DATABASE_URL con pgbouncer
const rawConnectionString = 
  process.env.NODE_ENV === 'development' && process.env.DIRECT_URL
    ? process.env.DIRECT_URL
    : process.env.DATABASE_URL;

const isPgbouncer = isPgbouncerUrl(rawConnectionString);
const connectionString = normalizeConnectionString(rawConnectionString, isPgbouncer);

// En desarrollo, forzar recreación si cambió la conexión
if (process.env.NODE_ENV !== 'production') {
  const currentConnection = connectionString;
  const cachedConnection = (globalThis as any).__cachedConnection;
  
  if (cachedConnection && cachedConnection !== currentConnection) {
    if (globalThis.__prisma) {
      globalThis.__prisma.$disconnect().catch(() => {});
      globalThis.__prisma = undefined;
    }
    if (globalThis.__pgPool) {
      globalThis.__pgPool.end().catch(() => {});
      globalThis.__pgPool = undefined;
    }
  }
  (globalThis as any).__cachedConnection = currentConnection;
}

// Pool de conexiones optimizado para serverless
// CRÍTICO: max=1 para Vercel + pgbouncer (evita MaxClientsInSessionMode)
// ⚠️ OPTIMIZACIÓN: Aumentar pool en desarrollo para paralelismo
const poolMax = isPgbouncer 
  ? 1 // Serverless: 1 conexión (pgbouncer)
  : process.env.NODE_ENV === 'production' 
    ? 1 // Producción: 1 conexión (conservador)
    : 10; // Desarrollo: 10 conexiones para paralelismo

const pgPool = globalThis.__pgPool || new Pool({
  connectionString,
  max: poolMax,
  idleTimeoutMillis: 30000, // 30s para liberar conexiones rápidamente
  connectionTimeoutMillis: 30000, // 30s timeout (aumentado para queries complejas)
  allowExitOnIdle: true, // Permitir que el proceso termine cuando no hay conexiones activas
  // ⚠️ OPTIMIZACIÓN: Configuración adicional para reducir overhead
  statement_timeout: 30000, // 30s timeout por statement
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pgPool;
}

// Adapter de Prisma para PostgreSQL
const adapter = new PrismaPg(pgPool);

// Singleton de PrismaClient
// En desarrollo: limpiar si existe para evitar cache de schema
if (process.env.NODE_ENV !== "production" && globalThis.__prisma) {
  globalThis.__prisma.$disconnect().catch(() => {});
  globalThis.__prisma = undefined;
}

const prisma = globalThis.__prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// Singleton explícito (crítico en serverless)
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// En producción, Next.js cachea módulos pero el singleton garantiza reutilización
// Esto previene múltiples instancias en funciones serverless concurrentes

export { prisma };
