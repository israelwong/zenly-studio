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
  max: 20, // Máximo de conexiones en el pool (aumentado de 10 a 20)
  idleTimeoutMillis: 60000, // Cerrar conexiones inactivas después de 60s (aumentado de 30s)
  connectionTimeoutMillis: 20000, // Timeout para obtener conexión del pool (aumentado de 10s a 20s)
});

// Reutilizar el pool en desarrollo (en producción Next.js cachea los módulos)
if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pgPool;
}

// Crear adapter de Prisma para PostgreSQL
// El adapter necesita el pool para manejar las conexiones
const adapter = new PrismaPg(pgPool);

// Cliente de Prisma centralizado con singleton
// Prisma 7.x requiere adapter cuando se usa engineType: "client"
const prisma = globalThis.__prisma || new PrismaClient({
  adapter,
  // Configuración optimizada para producción
  log: ['error'], // Solo errores para mejor rendimiento
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
