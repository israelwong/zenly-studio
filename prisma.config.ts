import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "./prisma/schema.prisma",
    datasource: {
        // URL principal con pgbouncer (para queries en runtime)
        url: env("DATABASE_URL"),
        // URL directa para migraciones (requerida para DDL)
        directUrl: env("DIRECT_URL"),
    },
    // No especificar shadowDatabaseUrl - Prisma usará la misma DB sin crear shadow
    // Esto es necesario para Supabase donde no podemos crear bases de datos temporales
});

