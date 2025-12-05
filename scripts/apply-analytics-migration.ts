import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Cargar variables de entorno
config();

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🚀 Iniciando migración de analytics...\n');

  try {
    // PASO 1: Crear ENUMs
    console.log('📦 Paso 1: Creando ENUMs...');

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentType') THEN
              CREATE TYPE "ContentType" AS ENUM ('POST', 'PORTFOLIO', 'OFFER', 'PACKAGE');
              RAISE NOTICE 'ContentType enum creado';
          ELSE
              RAISE NOTICE 'ContentType enum ya existe';
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnalyticsEventType') THEN
              CREATE TYPE "AnalyticsEventType" AS ENUM (
                'PAGE_VIEW',
                'FEED_VIEW',
                'MODAL_OPEN',
                'MODAL_CLOSE',
                'NEXT_CONTENT',
                'PREV_CONTENT',
                'LINK_COPY',
                'SHARE_CLICK',
                'MEDIA_CLICK',
                'MEDIA_VIEW',
                'CAROUSEL_NEXT',
                'CAROUSEL_PREV',
                'CTA_CLICK',
                'WHATSAPP_CLICK',
                'FORM_VIEW',
                'FORM_SUBMIT',
                'SCROLL_50',
                'SCROLL_100',
                'TIME_30S',
                'TIME_60S'
              );
              RAISE NOTICE 'AnalyticsEventType enum creado';
          ELSE
              RAISE NOTICE 'AnalyticsEventType enum ya existe';
          END IF;
      END $$;
    `);
    console.log('✅ ENUMs creados\n');

    // PASO 2: Agregar nuevos valores al enum
    console.log('📦 Paso 2: Agregando SIDEBAR_VIEW y OFFER_CLICK...');

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'SIDEBAR_VIEW';
      `);
      console.log('✅ SIDEBAR_VIEW agregado');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('ℹ️  SIDEBAR_VIEW ya existe');
      } else {
        throw e;
      }
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'OFFER_CLICK';
      `);
      console.log('✅ OFFER_CLICK agregado\n');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('ℹ️  OFFER_CLICK ya existe\n');
      } else {
        throw e;
      }
    }

    // PASO 3: Crear tabla
    console.log('📦 Paso 3: Creando tabla studio_content_analytics...');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "studio_content_analytics" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "studio_id" TEXT NOT NULL,
          "content_type" "ContentType" NOT NULL,
          "content_id" TEXT NOT NULL,
          "event_type" "AnalyticsEventType" NOT NULL,
          "user_id" TEXT,
          "ip_address" TEXT,
          "user_agent" TEXT,
          "session_id" TEXT,
          "referrer" TEXT,
          "utm_source" TEXT,
          "utm_medium" TEXT,
          "utm_campaign" TEXT,
          "utm_term" TEXT,
          "utm_content" TEXT,
          "metadata" JSONB,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "studio_content_analytics_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Tabla creada\n');

    // PASO 4: Crear índices
    console.log('📦 Paso 4: Creando índices...');

    const indexes = [
      {
        name: 'studio_content_analytics_studio_id_content_type_content_id_event_type_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "studio_content_analytics_studio_id_content_type_content_id_event_type_idx" ON "studio_content_analytics"("studio_id", "content_type", "content_id", "event_type");'
      },
      {
        name: 'studio_content_analytics_content_type_content_id_created_at_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "studio_content_analytics_content_type_content_id_created_at_idx" ON "studio_content_analytics"("content_type", "content_id", "created_at");'
      },
      {
        name: 'studio_content_analytics_studio_id_created_at_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "studio_content_analytics_studio_id_created_at_idx" ON "studio_content_analytics"("studio_id", "created_at");'
      },
      {
        name: 'studio_content_analytics_event_type_created_at_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "studio_content_analytics_event_type_created_at_idx" ON "studio_content_analytics"("event_type", "created_at");'
      },
      {
        name: 'studio_content_analytics_session_id_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "studio_content_analytics_session_id_idx" ON "studio_content_analytics"("session_id");'
      }
    ];

    for (const index of indexes) {
      await prisma.$executeRawUnsafe(index.sql);
      console.log(`✅ ${index.name}`);
    }
    console.log('');

    // PASO 5: Agregar foreign key
    console.log('📦 Paso 5: Agregando foreign key constraint...');

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'studio_content_analytics_studio_id_fkey'
          ) THEN
              ALTER TABLE "studio_content_analytics" 
              ADD CONSTRAINT "studio_content_analytics_studio_id_fkey" 
              FOREIGN KEY ("studio_id") 
              REFERENCES "studios"("id") 
              ON DELETE CASCADE 
              ON UPDATE CASCADE;
              RAISE NOTICE 'Foreign key constraint creado';
          ELSE
              RAISE NOTICE 'Foreign key constraint ya existe';
          END IF;
      END $$;
    `);
    console.log('✅ Foreign key agregado\n');

    // VERIFICACIÓN
    console.log('🔍 Verificando migración...\n');

    const tableExists = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE tablename = 'studio_content_analytics'
    `;
    console.log(`✅ Tabla existe: ${tableExists.length > 0 ? 'Sí' : 'No'}`);

    const indexCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE tablename = 'studio_content_analytics'
    `;
    console.log(`✅ Índices creados: ${indexCount[0].count}`);

    const enumValues = await prisma.$queryRaw<Array<{ enum_value: string }>>`
      SELECT e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'AnalyticsEventType'
      ORDER BY e.enumsortorder
    `;
    console.log(`✅ Eventos en enum: ${enumValues.length}`);
    console.log(`   Incluye SIDEBAR_VIEW: ${enumValues.some(v => v.enum_value === 'SIDEBAR_VIEW') ? 'Sí' : 'No'}`);
    console.log(`   Incluye OFFER_CLICK: ${enumValues.some(v => v.enum_value === 'OFFER_CLICK') ? 'Sí' : 'No'}`);

    console.log('\n🎉 ¡Migración completada exitosamente!\n');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
