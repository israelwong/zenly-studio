import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "./prisma/schema.prisma",
    datasource: {
        url: env("DIRECT_URL"), // Usar conexión directa para migraciones
    },
    // No especificar shadowDatabaseUrl - Prisma usará la misma DB sin crear shadow
    // Esto es necesario para Supabase donde no podemos crear bases de datos temporales
});

