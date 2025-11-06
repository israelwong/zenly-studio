// prisma/seed.ts
/**
 * SEED MAESTRO V2.1
 * 
 * Inicializa TODA la base de datos con datos funcionales de prueba:
 * - Platform core (módulos, planes, canales)
 * - Demo Studio completo
 * - Usuarios multi-contexto
 * - Pipelines V2.0
 * - Catálogo de servicios
 * 
 * Uso: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// CONSTANTES
// ============================================

const DEMO_STUDIO_ID = 'demo-studio-id';
const DEMO_STUDIO_SLUG = 'demo-studio';

// ============================================
// MAIN SEED
// ============================================

async function main() {
    console.log('🌱 Iniciando SEED MAESTRO V2.1...\n');

    // 1. Platform Core
    await seedPlatformModules();
    await seedSocialNetworks();
    await seedAcquisitionChannels();

    // 2. Billing
    await seedPlans();

    // 3. Demo Studio
    await seedDemoStudio();

    // 4. Usuarios Multi-Contexto (removido - usar seed-demo-users.ts)

    // 5. Pipelines V2.0
    await seedPipelines();

    // 6. Catálogo
    await seedCatalogo();

    // 7. Tipos de Evento
    await seedTiposEvento();

    // 8. Demo Lead
    await seedDemoLead();

    console.log('\n✅ SEED MAESTRO COMPLETADO\n');
    console.log('📊 Resumen:');
    console.log('  ✅ Módulos de plataforma');
    console.log('  ✅ Planes con límites');
    console.log('  ✅ Demo Studio configurado');
    console.log('  ✅ Usuarios (usar seed-demo-users.ts)');
    console.log('  ✅ Pipelines Marketing + Manager');
    console.log('  ✅ Catálogo de servicios');
    console.log('  ✅ Tipos de evento');
    console.log('  ✅ Demo Lead asociado\n');
    console.log('🔗 Acceso:');
    console.log('  Studio URL: /demo-studio');
    console.log('  Usuarios: Ejecutar seed-demo-users.ts\n');
}

// ============================================
// 1. PLATFORM MODULES
// ============================================

async function seedPlatformModules() {
    console.log('🧩 Plataforma configurada...');
    console.log(`  ✅ Acceso completo a todas las funcionalidades`);
    // Los módulos ya no se usan en el nuevo modelo de monetización
}

// ============================================
// 2. SOCIAL NETWORKS
// ============================================

async function seedSocialNetworks() {
    console.log('📱 Seeding social networks...');

    const networks = [
        {
            name: 'Facebook',
            slug: 'facebook',
            description: 'Red social principal para conectar con clientes',
            color: '#1877F2',
            icon: 'facebook',
            base_url: 'https://facebook.com/',
            order: 1,
        },
        {
            name: 'Instagram',
            slug: 'instagram',
            description: 'Plataforma visual perfecta para fotógrafos',
            color: '#E4405F',
            icon: 'instagram',
            base_url: 'https://instagram.com/',
            order: 2,
        },
        {
            name: 'TikTok',
            slug: 'tiktok',
            description: 'Red social de videos cortos y creativos',
            color: '#000000',
            icon: 'tiktok',
            base_url: 'https://tiktok.com/@',
            order: 3,
        },
        {
            name: 'YouTube',
            slug: 'youtube',
            description: 'Plataforma de videos largos y tutoriales',
            color: '#FF0000',
            icon: 'youtube',
            base_url: 'https://youtube.com/@',
            order: 4,
        },
        {
            name: 'Threads',
            slug: 'threads',
            description: 'Red social de Meta para conversaciones',
            color: '#000000',
            icon: 'threads',
            base_url: 'https://threads.net/@',
            order: 5,
        },
        {
            name: 'LinkedIn',
            slug: 'linkedin',
            description: 'Red profesional para networking B2B',
            color: '#0077B5',
            icon: 'linkedin',
            base_url: 'https://linkedin.com/in/',
            order: 6,
        },
    ];

    for (const network of networks) {
        await prisma.platform_social_networks.upsert({
            where: { slug: network.slug },
            update: { updated_at: new Date() },
            create: {
                ...network,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
        console.log(`  ✅ ${network.name}`);
    }
}

// ============================================
// 3. ACQUISITION CHANNELS
// ============================================

async function seedAcquisitionChannels() {
    console.log('📊 Seeding acquisition channels...');

    const channels = [
        {
            name: 'Referidos',
            description: 'Clientes referidos por otros clientes',
            color: '#10B981',
            icon: 'users',
            order: 1,
        },
        {
            name: 'Redes Sociales',
            description: 'Leads de Instagram, Facebook, TikTok',
            color: '#3B82F6',
            icon: 'share-2',
            order: 2,
        },
        {
            name: 'Google Ads',
            description: 'Publicidad en Google',
            color: '#F59E0B',
            icon: 'search',
            order: 3,
        },
        {
            name: 'Web Orgánico',
            description: 'Tráfico orgánico del sitio web',
            color: '#8B5CF6',
            icon: 'globe',
            order: 4,
        },
    ];

    for (const channel of channels) {
        await prisma.platform_acquisition_channels.upsert({
            where: { name: channel.name },
            update: { updated_at: new Date() },
            create: {
                ...channel,
                is_active: true,
                is_visible: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
        console.log(`  ✅ ${channel.name}`);
    }
}

// ============================================
// 4. PLANS (con límites normalizados)
// ============================================

async function seedPlans() {
    console.log('💳 Seeding plans with limits...');

    // PLAN BASIC
    const planBasic = await prisma.platform_plans.upsert({
        where: { slug: 'basic' },
        update: {},
        create: {
            name: 'Basic',
            slug: 'basic',
            description: 'Para estudios pequeños que están comenzando',
            price_monthly: 399, // MXN
            price_yearly: 3990, // MXN (ahorro 17%)
            stripe_product_id: 'prod_basic_demo',
            stripe_price_id: 'price_basic_demo',
            features: {
                modules: ['manager'],
                support: 'email',
                analytics: 'basic',
            },
            popular: false,
            active: true,
            order: 1,
        },
    });

    // Límites del plan Basic
    await prisma.plan_limits.createMany({
        data: [
            { plan_id: planBasic.id, limit_type: 'EVENTS_PER_MONTH', limit_value: 10, unit: 'eventos' },
            { plan_id: planBasic.id, limit_type: 'STORAGE_GB', limit_value: 5, unit: 'GB' },
            { plan_id: planBasic.id, limit_type: 'TEAM_MEMBERS', limit_value: 3, unit: 'usuarios' },
            { plan_id: planBasic.id, limit_type: 'PORTFOLIOS', limit_value: 2, unit: 'portfolios' },
        ],
        skipDuplicates: true,
    });
    console.log(`  ✅ ${planBasic.name} (10 eventos/mes, 5GB)`);

    // PLAN PRO
    const planPro = await prisma.platform_plans.upsert({
        where: { slug: 'pro' },
        update: {},
        create: {
            name: 'Pro',
            slug: 'pro',
            description: 'Para estudios en crecimiento',
            price_monthly: 699, // MXN
            price_yearly: 6990, // MXN (ahorro 17%)
            stripe_product_id: 'prod_pro_demo',
            stripe_price_id: 'price_pro_demo',
            features: {
                modules: ['manager', 'marketing', 'magic', 'pages'],
                support: 'email_chat',
                analytics: 'advanced',
            },
            popular: true,
            active: true,
            order: 2,
        },
    });

    await prisma.plan_limits.createMany({
        data: [
            { plan_id: planPro.id, limit_type: 'EVENTS_PER_MONTH', limit_value: 30, unit: 'eventos' },
            { plan_id: planPro.id, limit_type: 'STORAGE_GB', limit_value: 25, unit: 'GB' },
            { plan_id: planPro.id, limit_type: 'TEAM_MEMBERS', limit_value: 10, unit: 'usuarios' },
            { plan_id: planPro.id, limit_type: 'PORTFOLIOS', limit_value: 10, unit: 'portfolios' },
            { plan_id: planPro.id, limit_type: 'GANTT_TEMPLATES', limit_value: 5, unit: 'templates' },
        ],
        skipDuplicates: true,
    });
    console.log(`  ✅ ${planPro.name} (30 eventos/mes, 25GB) ⭐`);

    // PLAN ENTERPRISE
    const planEnterprise = await prisma.platform_plans.upsert({
        where: { slug: 'enterprise' },
        update: {},
        create: {
            name: 'Enterprise',
            slug: 'enterprise',
            description: 'Para estudios grandes con alto volumen',
            price_monthly: 999, // MXN
            price_yearly: 9990, // MXN (ahorro 17%)
            stripe_product_id: 'prod_enterprise_demo',
            stripe_price_id: 'price_enterprise_demo',
            features: {
                modules: ['manager', 'marketing', 'magic', 'pages'],
                support: 'priority',
                analytics: 'enterprise',
                custom_domain: true,
            },
            popular: false,
            active: true,
            order: 3,
        },
    });

    await prisma.plan_limits.createMany({
        data: [
            { plan_id: planEnterprise.id, limit_type: 'EVENTS_PER_MONTH', limit_value: -1, unit: 'eventos' }, // ilimitado
            { plan_id: planEnterprise.id, limit_type: 'STORAGE_GB', limit_value: 100, unit: 'GB' },
            { plan_id: planEnterprise.id, limit_type: 'TEAM_MEMBERS', limit_value: -1, unit: 'usuarios' },
            { plan_id: planEnterprise.id, limit_type: 'PORTFOLIOS', limit_value: -1, unit: 'portfolios' },
            { plan_id: planEnterprise.id, limit_type: 'GANTT_TEMPLATES', limit_value: -1, unit: 'templates' },
        ],
        skipDuplicates: true,
    });
    console.log(`  ✅ ${planEnterprise.name} (ilimitado)`);
}

// ============================================
// 5. DEMO STUDIO
// ============================================

async function seedDemoStudio() {
    console.log('🏢 Seeding demo studio...');

    const demoStudio = await prisma.studios.upsert({
        where: { slug: DEMO_STUDIO_SLUG },
        update: { updated_at: new Date() },
        create: {
            id: DEMO_STUDIO_ID,
            studio_name: 'Demo Studio',
            slug: DEMO_STUDIO_SLUG,
            email: 'contacto@demo-studio.com',
            address: 'Av. Revolución 1234, Guadalajara, JAL',
            maps_url: 'https://maps.app.goo.gl/demo123',
            latitude: 20.6597,
            longitude: -103.3496,
            place_id: 'ChIJ_demo_place_id',
            website: 'https://demo-studio.com',
            bank_name: 'BBVA',
            account_number: '1234567890',
            account_holder: 'Demo Studio S.A. de C.V.',
            clabe_number: '012345678901234567',
            slogan: 'Capturamos tus momentos inolvidables',
            description: 'Estudio fotográfico profesional especializado en bodas, XV años y eventos sociales',
            keywords: 'fotografía, bodas, eventos, Guadalajara',
            subscription_status: 'TRIAL',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
    });
    console.log(`  ✅ ${demoStudio.studio_name}`);

    // Configuración del studio
    await prisma.studio_configuraciones.create({
        data: {
            studio_id: demoStudio.id,
            name: 'Configuración Principal',
            service_margin: 35, // 35% de utilidad en servicios
            product_margin: 40, // 40% de utilidad en productos
            sales_commission: 5, // 5% de comisión por venta
            markup: 0,
            status: 'active',
        },
    });
    console.log(`  ✅ Configuración creada`);

    // Teléfonos del studio
    await prisma.studio_phones.createMany({
        data: [
            {
                studio_id: demoStudio.id,
                number: '+52 33 1234 5678',
                type: 'principal',
                is_active: true,
                order: 0,
            },
            {
                studio_id: demoStudio.id,
                number: '+52 33 1234 5679',
                type: 'whatsapp',
                is_active: true,
                order: 1,
            },
        ],
    });
    console.log(`  ✅ Teléfonos creados`);

    // Horarios de atención
    const diasSemana = [
        { day: 'monday', name: 'Lunes' },
        { day: 'tuesday', name: 'Martes' },
        { day: 'wednesday', name: 'Miércoles' },
        { day: 'thursday', name: 'Jueves' },
        { day: 'friday', name: 'Viernes' },
        { day: 'saturday', name: 'Sábado' },
        { day: 'sunday', name: 'Domingo' },
    ];

    await prisma.studio_business_hours.createMany({
        data: diasSemana.map((dia, index) => ({
            studio_id: demoStudio.id,
            day_of_week: dia.day,
            start_time: '09:00',
            end_time: '18:00',
            is_active: index < 5, // Lunes a Viernes activos por defecto
            order: index,
        })),
        skipDuplicates: true,
    });
    console.log(`  ✅ Horarios de atención creados`);

    // El nuevo modelo de monetización no requiere activación de módulos
    // Los estudios tienen acceso completo a todas las funcionalidades
    console.log(`  ✅ Studio configurado con acceso completo`);
}


// ============================================
// 6. PIPELINES V2.0
// ============================================

async function seedPipelines() {
    console.log('📊 Seeding pipelines V2.0...');

    // MARKETING PIPELINE
    const marketingStages = [
        { slug: 'lead-nuevo', name: 'Lead Nuevo', stage_type: 'PROSPECTING' as const, color: '#3B82F6', order: 0 },
        { slug: 'contactado', name: 'Contactado', stage_type: 'PROSPECTING' as const, color: '#8B5CF6', order: 1 },
        { slug: 'calificado', name: 'Calificado', stage_type: 'QUALIFICATION' as const, color: '#10B981', order: 2 },
        { slug: 'propuesta', name: 'Propuesta Enviada', stage_type: 'PROPOSAL' as const, color: '#F59E0B', order: 3 },
        { slug: 'negociacion', name: 'Negociación', stage_type: 'PROPOSAL' as const, color: '#EF4444', order: 4 },
        { slug: 'ganado', name: 'Ganado', stage_type: 'CONVERSION' as const, color: '#059669', order: 5, is_system: true },
        { slug: 'perdido', name: 'Perdido', stage_type: 'CLOSED_LOST' as const, color: '#6B7280', order: 6, is_system: true },
    ];

    for (const stage of marketingStages) {
        await prisma.marketing_pipeline_stages.upsert({
            where: {
                studio_id_slug: {
                    studio_id: DEMO_STUDIO_ID,
                    slug: stage.slug,
                },
            },
            update: {},
            create: {
                studio_id: DEMO_STUDIO_ID,
                ...stage,
                is_active: true,
                is_system: stage.is_system || false,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
    }
    console.log(`  ✅ Marketing Pipeline (${marketingStages.length} stages)`);

    // MANAGER PIPELINE
    const managerStages = [
        { slug: 'planeacion', name: 'Planeación', stage_type: 'PLANNING' as const, color: '#3B82F6', order: 0 },
        { slug: 'preparacion', name: 'Preparación', stage_type: 'PLANNING' as const, color: '#8B5CF6', order: 1 },
        { slug: 'produccion', name: 'Producción', stage_type: 'PRODUCTION' as const, color: '#EF4444', order: 2 },
        { slug: 'post-produccion', name: 'Post-Producción', stage_type: 'POST_PRODUCTION' as const, color: '#F59E0B', order: 3 },
        { slug: 'entrega', name: 'Entrega', stage_type: 'DELIVERY' as const, color: '#06B6D4', order: 4 },
        { slug: 'garantia', name: 'Garantía', stage_type: 'WARRANTY' as const, color: '#10B981', order: 5 },
        { slug: 'completado', name: 'Completado', stage_type: 'COMPLETED' as const, color: '#059669', order: 6, is_system: true },
    ];

    for (const stage of managerStages) {
        await prisma.studio_manager_pipeline_stages.upsert({
            where: {
                studio_id_slug: {
                    studio_id: DEMO_STUDIO_ID,
                    slug: stage.slug,
                },
            },
            update: {},
            create: {
                studio_id: DEMO_STUDIO_ID,
                ...stage,
                is_active: true,
                is_system: stage.is_system || false,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
    }
    console.log(`  ✅ Manager Pipeline (${managerStages.length} stages)`);

    // PROSPECT PIPELINE
    const prospectStages = [
        { slug: 'nuevo', name: 'Nuevo', color: '#3B82F6', order: 0, is_system: true },
        { slug: 'seguimiento', name: 'Seguimiento', color: '#8B5CF6', order: 1, is_system: false },
        { slug: 'ganado', name: 'Ganado', color: '#10B981', order: 2, is_system: true },
        { slug: 'perdido', name: 'Perdido', color: '#6B7280', order: 3, is_system: true },
    ];

    for (const stage of prospectStages) {
        await prisma.studio_prospect_pipeline_stages.upsert({
            where: {
                studio_id_slug: {
                    studio_id: DEMO_STUDIO_ID,
                    slug: stage.slug,
                },
            },
            update: {},
            create: {
                studio_id: DEMO_STUDIO_ID,
                ...stage,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
    }
    console.log(`  ✅ Prospect Pipeline (${prospectStages.length} stages)`);
}

// ============================================
// 7. CATÁLOGO (sample)
// ============================================

async function seedCatalogo() {
    console.log('📁 Seeding catálogo...');

    // Secciones
    const seccion = await prisma.studio_service_sections.upsert({
        where: { name: 'Cobertura del Evento' },
        update: {},
        create: {
            name: 'Cobertura del Evento',
            description: 'Servicios de fotografía y video el día del evento',
            order: 0,
        },
    });

    // Categoría
    const categoria = await prisma.studio_service_categories.upsert({
        where: { name: 'Fotografía de evento' },
        update: {},
        create: {
            name: 'Fotografía de evento',
            order: 0,
        },
    });

    // Relación sección-categoría
    await prisma.studio_section_categories.createMany({
        data: {
            section_id: seccion.id,
            category_id: categoria.id,
        },
        skipDuplicates: true,
    });

    // Servicios (solo costo y gasto - utilidad se calcula al vuelo)
    const servicios = [
        { name: 'Fotógrafo principal por hora', cost: 500, order: 0 },
        { name: 'Asistente de iluminación por hora', cost: 200, order: 1 },
        { name: 'Revelado digital de fotos', cost: 1500, order: 2 },
    ];

    await prisma.studio_items.createMany({
        data: servicios.map(servicio => ({
            studio_id: DEMO_STUDIO_ID,
            service_category_id: categoria.id,
            name: servicio.name,
            cost: servicio.cost,
            expense: 0,
            utility_type: 'service',
            order: servicio.order,
            status: 'active',
        })),
        skipDuplicates: true,
    });
    console.log(`  ✅ Catálogo (${servicios.length} servicios)`);
}

// ============================================
// 8. TIPOS DE EVENTO
// ============================================

async function seedTiposEvento() {
    console.log('🎉 Seeding tipos de evento...');

    const tipos = [
        { name: 'Boda', order: 0 },
        { name: 'XV Años', order: 1 },
        { name: 'Sesión Familiar', order: 2 },
        { name: 'Sesión Embarazo', order: 3 },
        { name: 'Evento Corporativo', order: 4 },
    ];

    await prisma.studio_event_types.createMany({
        data: tipos.map(tipo => ({
            studio_id: DEMO_STUDIO_ID,
            name: tipo.name,
            status: 'active',
            order: tipo.order,
            created_at: new Date(),
            updated_at: new Date(),
        })),
        skipDuplicates: true,
    });
    console.log(`  ✅ ${tipos.length} tipos de evento`);
}

// ============================================
// 9. DEMO LEAD
// ============================================

async function seedDemoLead() {
    console.log('👤 Seeding demo lead...');

    const demoLead = await prisma.platform_leads.upsert({
        where: { email: 'owner@demo-studio.com' },
        update: { updated_at: new Date() },
        create: {
            studio_id: DEMO_STUDIO_ID,
            name: 'Carlos Méndez',
            email: 'owner@demo-studio.com',
            phone: '+52 33 1234 5678',
            studio_name: 'Demo Studio',
            studio_slug: DEMO_STUDIO_SLUG,
            interested_plan: 'pro',
            score: 8,
            priority: 'high',
            stage_id: null, // No hay stages configurados aún
            acquisition_channel_id: null, // Se puede asignar después
            agent_id: null, // Se puede asignar después
            probable_start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
            created_at: new Date(),
            updated_at: new Date(),
        },
    });

    console.log(`  ✅ Demo Lead: ${demoLead.name} (${demoLead.email})`);
}

// ============================================
// EXECUTE
// ============================================

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });