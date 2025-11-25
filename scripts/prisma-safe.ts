#!/usr/bin/env tsx
/**
 * Script mejorado para ejecutar comandos de Prisma con manejo de timeouts
 * y prevención de cuelgues
 * 
 * Soluciona problemas comunes con Prisma 7 y Supabase:
 * - Timeouts en conexiones
 * - Cuelgues en migraciones
 * - Problemas con pooler de Supabase
 * 
 * Uso: tsx scripts/prisma-safe.ts <comando-prisma> [args...]
 * Ejemplo: tsx scripts/prisma-safe.ts migrate dev --name add_name_to_promises
 */

import { config } from "dotenv";
import { spawn } from "child_process";
import { resolve } from "path";

// Cargar variables de entorno
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const DIRECT_URL = process.env.DIRECT_URL;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DIRECT_URL) {
    console.error("❌ ERROR: DIRECT_URL no está definido en .env.local");
    console.error("💡 En Supabase, usa el puerto 5432 (direct connection)");
    process.exit(1);
}

if (!DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL no está definido en .env.local");
    process.exit(1);
}

// Verificar que DIRECT_URL use el puerto correcto (5432 para conexión directa)
if (DIRECT_URL.includes(':6543')) {
    console.warn("⚠️  ADVERTENCIA: DIRECT_URL parece usar el pooler (puerto 6543)");
    console.warn("💡 Para migraciones, usa el puerto 5432 (conexión directa)");
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

// Comandos que necesitan --accept-data-loss para evitar prompts interactivos
const ACCEPT_DATA_LOSS_COMMANDS = [
    "db push",
];

// Comandos que pueden necesitar --force-reset si hay problemas de drift
const FORCE_RESET_COMMANDS = [
    "db push",
];

const args = process.argv.slice(2);
const command = args.join(" ");

if (args.length === 0) {
    console.error("❌ ERROR: Debes proporcionar un comando de Prisma");
    console.error("Ejemplo: tsx scripts/prisma-safe.ts migrate dev --name my_migration");
    process.exit(1);
}

// Verificar si el comando requiere conexión directa
const needsDirectConnection = DIRECT_CONNECTION_COMMANDS.some((cmd) =>
    command.includes(cmd)
);

// Timeouts por tipo de comando (en milisegundos)
const TIMEOUTS: Record<string, number> = {
    "migrate dev": 120000, // 2 minutos para migraciones
    "migrate deploy": 300000, // 5 minutos para deploy
    "db push": 180000, // 3 minutos para push (aumentado)
    "migrate reset": 180000, // 3 minutos para reset
    default: 60000, // 1 minuto por defecto
};

const getTimeout = (cmd: string): number => {
    for (const [key, timeout] of Object.entries(TIMEOUTS)) {
        if (cmd.includes(key)) {
            return timeout;
        }
    }
    return TIMEOUTS.default;
};

async function runPrismaCommand() {
    const timeout = getTimeout(command);

    // Agregar flags necesarios para evitar prompts y resolver drift
    const needsAcceptDataLoss = ACCEPT_DATA_LOSS_COMMANDS.some((cmd) =>
        command.includes(cmd) && !command.includes("--accept-data-loss")
    );
    const needsForceReset = FORCE_RESET_COMMANDS.some((cmd) =>
        command.includes(cmd) && !command.includes("--force-reset") && !command.includes("--accept-data-loss")
    );

    const finalArgs = [...args];
    if (needsForceReset) {
        finalArgs.push("--force-reset");
    }
    if (needsAcceptDataLoss) {
        finalArgs.push("--accept-data-loss");
    }

    const env = {
        ...process.env,
        ...(needsDirectConnection ? { DATABASE_URL: DIRECT_URL } : {}),
        // Variables de entorno para Prisma 7
        PRISMA_CLI_QUERY_ENGINE_TYPE: "library",
        PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: "1",
    };

    console.log(`🚀 Ejecutando: prisma ${finalArgs.join(" ")}`);
    if (needsDirectConnection) {
        console.log("🔗 Usando conexión directa (DIRECT_URL)");
    }
    if (needsAcceptDataLoss) {
        console.log("⚠️  Aceptando posible pérdida de datos (--accept-data-loss)");
    }
    console.log(`⏱️  Timeout: ${timeout / 1000}s`);

    return new Promise<void>((resolve, reject) => {
        const prismaProcess = spawn("npx", ["prisma", ...finalArgs], {
            stdio: "inherit",
            env,
            shell: true,
        });

        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        // Timeout handler
        timeoutId = setTimeout(() => {
            console.error(`\n❌ TIMEOUT: El comando se quedó colgado después de ${timeout / 1000}s`);
            console.error("💡 Posibles soluciones:");
            console.error("   1. Verifica tu conexión a Supabase");
            console.error("   2. Asegúrate de usar DIRECT_URL con puerto 5432");
            console.error("   3. Verifica que no haya bloqueos en la base de datos");
            console.error("   4. Intenta ejecutar el comando directamente: npx prisma " + command);
            if (prismaProcess.pid) {
                try {
                    process.kill(prismaProcess.pid, "SIGTERM");
                } catch (e) {
                    // Ignorar errores al matar el proceso
                }
            }
            reject(new Error(`Timeout después de ${timeout / 1000}s`));
        }, timeout);

        prismaProcess.on("error", (error) => {
            if (timeoutId) clearTimeout(timeoutId);
            console.error("❌ Error ejecutando Prisma:", error.message);
            reject(error);
        });

        prismaProcess.on("exit", (code, signal) => {
            if (timeoutId) clearTimeout(timeoutId);
            if (code === 0) {
                console.log("✅ Comando completado exitosamente");
                resolve();
            } else if (signal === "SIGTERM") {
                reject(new Error(`Comando terminado por timeout`));
            } else {
                console.error(`❌ Comando falló con código: ${code}`);
                reject(new Error(`Prisma exit code: ${code}`));
            }
        });
    });
}

// Ejecutar
runPrismaCommand().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
});
