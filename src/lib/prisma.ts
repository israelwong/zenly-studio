import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Patrón Singleton para evitar múltiples instancias
declare global {
  var __prisma: PrismaClient | undefined;
  var __pgPool: Pool | undefined;
}

// Verificar que la URL de la base de datos esté disponible
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// Crear pool de conexiones PostgreSQL (singleton)
const pgPool = globalThis.__pgPool || new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Reutilizar el pool en desarrollo (en producción Next.js cachea los módulos)
if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pgPool;
}

// Crear adapter de Prisma para PostgreSQL
const adapter = new PrismaPg(pgPool);

// Cliente de Prisma centralizado con singleton
// Prisma 7.x requiere adapter cuando se usa engineType: "client"
const prisma = globalThis.__prisma || new PrismaClient({
  adapter,
  // Configuración optimizada para producción
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// Reutilización del cliente para evitar agotamiento de conexiones
// En producción Next.js reutiliza el módulo, pero en desarrollo necesitamos singleton explícito
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// En producción, asegurar que siempre se reutilice la misma instancia
// Next.js en producción cachea los módulos, pero es seguro mantener el singleton

export { prisma };
