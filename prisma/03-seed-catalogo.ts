// prisma/03-seed-catalogo.ts
/**
 * SEED CATÁLOGO COMPLETO
 * 
 * Script para sembrar secciones, categorías y servicios COMPLETO con estructura anidada
 * 
 * Uso: npm run db:seed-catalogo
 * Orden: 03 (después de 02-seed-demo-users.ts)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') });

// Crear pool de conexiones PostgreSQL
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Crear adapter de Prisma para PostgreSQL
const adapter = new PrismaPg(pgPool);

// Cliente de Prisma con adapter (requerido en Prisma 7)
const prisma = new PrismaClient({
    adapter,
    log: ['error'],
});

interface StudioConfig {
    utilidad_servicio: number; // Decimal (0.30 = 30%)
    utilidad_producto: number; // Decimal (0.20 = 20%)
}

// Helper para calcular precio público
function calcularPrecioPublico(
    costo: number,
    expense: number,
    tipo: 'servicio' | 'producto',
    config: StudioConfig
): number {
    const costoTotal = costo + expense;
    const margen = tipo === 'servicio'
        ? config.utilidad_servicio
        : config.utilidad_producto;

    return costoTotal / (1 - margen);
}

export async function seedStudioCatalog(studioId: string) {
    console.log('🌱 Sembrando catálogo COMPLETO con estructura anidada...');

    // ============================================
    // 0. CARGAR CONFIGURACIÓN DEL STUDIO
    // ============================================

    console.log('⚙️  Cargando configuración del studio...');

    const configuracion = await prisma.studio_configuraciones.findFirst({
        where: { studio_id: studioId },
    });

    // Valores por defecto si no existe configuración
    const studioConfig: StudioConfig = {
        utilidad_servicio: configuracion?.service_margin ?? 0.30, // 30% por defecto
        utilidad_producto: configuracion?.product_margin ?? 0.20, // 20% por defecto
    };

    console.log(`  ✅ Configuración cargada: Servicios ${(studioConfig.utilidad_servicio * 100).toFixed(0)}%, Productos ${(studioConfig.utilidad_producto * 100).toFixed(0)}%`);

    // ============================================
    // 1. LIMPIAR TABLAS EXISTENTES
    // ============================================

    console.log('🧹 Limpiando tablas existentes...');

    // Eliminar en orden correcto para respetar foreign keys
    // 1. Primero eliminar items de paquetes (tienen FK a studio_items)
    await prisma.studio_paquete_items.deleteMany({
        where: {
            paquetes: {
                studio_id: studioId
            }
        }
    });

    // 2. Luego eliminar los items
    await prisma.studio_items.deleteMany({
        where: { studio_id: studioId }
    });

    // 3. Eliminar relaciones de secciones-categorías
    await prisma.studio_section_categories.deleteMany({});

    // 4. Eliminar categorías
    await prisma.studio_service_categories.deleteMany({});

    // 5. Finalmente eliminar secciones
    await prisma.studio_service_sections.deleteMany({});

    console.log('✅ Tablas limpiadas exitosamente');

    // ============================================
    // 2. CREAR SECCIONES DE SERVICIO
    // ============================================

    console.log('📂 Creando secciones de servicio...');

    const secciones = await Promise.all([
        prisma.studio_service_sections.create({
            data: {
                name: 'Experiencias previas al evento',
                description: 'Todo lo relacionado con las sesiones fotográficas y cinematográficas que suceden antes del día principal',
                order: 0
            }
        }),
        prisma.studio_service_sections.create({
            data: {
                name: 'Cobertura del Día del Evento',
                description: 'El personal, equipo y tiempo dedicados a capturar cada momento del evento principal',
                order: 1
            }
        }),
        prisma.studio_service_sections.create({
            data: {
                name: 'Arte Impreso de evento',
                description: 'Productos físicos de alta calidad que convierten tus recuerdos en tesoros tangibles',
                order: 2
            }
        }),
        prisma.studio_service_sections.create({
            data: {
                name: 'Complementos y Servicios Adicionales',
                description: 'Extras que añaden un toque único y especial a la experiencia completa',
                order: 3
            }
        })
    ]);

    console.log(`✅ ${secciones.length} secciones creadas`);

    // ============================================
    // 3. CREAR CATEGORÍAS Y RELACIONAR CON SECCIONES
    // ============================================

    console.log('📁 Creando categorías y relacionando con secciones...');

    // SECCIÓN 1: Experiencias previas al evento
    const categoriasSeccion1 = await Promise.all([
        prisma.studio_service_categories.create({
            data: { name: 'Fotografía de sesión previa', order: 0 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Revelado y retoque digital de fotos de sesión', order: 1 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Cinematografía de sesión', order: 2 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Otros servicios previos al evento', order: 3 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Arte impreso de sesión', order: 4 }
        })
    ]);

    // Relacionar categorías con sección 1
    await Promise.all(
        categoriasSeccion1.map(categoria =>
            prisma.studio_section_categories.create({
                data: {
                    section_id: secciones[0].id,
                    category_id: categoria.id
                }
            })
        )
    );

    // SECCIÓN 2: Cobertura del Día del Evento
    const categoriasSeccion2 = await Promise.all([
        prisma.studio_service_categories.create({
            data: { name: 'Arreglo en domicilio', order: 5 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Tour limusina', order: 6 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Fotografía de evento', order: 7 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Cinematografía de evento', order: 8 }
        })
    ]);

    // Relacionar categorías con sección 2
    await Promise.all(
        categoriasSeccion2.map(categoria =>
            prisma.studio_section_categories.create({
                data: {
                    section_id: secciones[1].id,
                    category_id: categoria.id
                }
            })
        )
    );

    // SECCIÓN 3: Arte Impreso de evento
    const categoriasSeccion3 = await Promise.all([
        prisma.studio_service_categories.create({
            data: { name: 'Cuadro de evento', order: 9 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Libro de evento de lujo 12x12"', order: 10 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Libro de evento clásico 12x12"', order: 11 }
        }),
        prisma.studio_service_categories.create({
            data: { name: 'Libro de evento clásico 10x10"', order: 12 }
        })
    ]);

    // Relacionar categorías con sección 3
    await Promise.all(
        categoriasSeccion3.map(categoria =>
            prisma.studio_section_categories.create({
                data: {
                    section_id: secciones[2].id,
                    category_id: categoria.id
                }
            })
        )
    );

    // SECCIÓN 4: Complementos y Servicios Adicionales
    const categoriasSeccion4 = await Promise.all([
        prisma.studio_service_categories.create({
            data: { name: 'Otros entregables', order: 13 }
        })
    ]);

    // Relacionar categorías con sección 4
    await Promise.all(
        categoriasSeccion4.map(categoria =>
            prisma.studio_section_categories.create({
                data: {
                    section_id: secciones[3].id,
                    category_id: categoria.id
                }
            })
        )
    );

    // Combinar todas las categorías para facilitar el acceso
    const todasLasCategorias = [
        ...categoriasSeccion1,
        ...categoriasSeccion2,
        ...categoriasSeccion3,
        ...categoriasSeccion4
    ];

    console.log(`✅ ${todasLasCategorias.length} categorías creadas y relacionadas con secciones`);

    // ============================================
    // 4. CREAR SERVICIOS Y RELACIONAR CON CATEGORÍAS
    // ============================================

    console.log('🛠️ Creando servicios y relacionando con categorías...');

    const servicios = await Promise.all([
        // FOTOGRAFÍA DE SESIÓN PREVIA (5 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[0].id,
                name: 'Shooting en estudio fotográfico hasta por 45min',
                cost: 1000, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[0].id,
                name: 'Sesión de vestido hasta 3 horas de servicio',
                cost: 2500, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[0].id,
                name: 'Shooting para cambios casuales hasta por 2 horas de servicio',
                cost: 1500, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[0].id,
                name: 'Shooting Trash the Dress hasta por 3 horas de servicio',
                cost: 2000, expense: 0, order: 3, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[0].id,
                name: 'Asistencia en iluminación para sesión',
                cost: 600, expense: 0, order: 4, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // REVELADO Y RETOQUE DIGITAL DE FOTOS DE SESIÓN (2 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[1].id,
                name: 'Revelado digital de todas las fotografías de sesión',
                cost: 300, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[1].id,
                name: 'Retoque avanzado de fotografía digital',
                cost: 120, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // CINEMATOGRAFÍA DE SESIÓN (3 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[2].id,
                name: 'Servicio de grabación profesional sesión en 4k con estabilizador de imagen',
                cost: 2000, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[2].id,
                name: 'Grabación con dron 4k para sesión',
                cost: 1000, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[2].id,
                name: 'Edición de video cinemático de sesión musicalizado de hasta 3min',
                cost: 1000, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // OTROS SERVICIOS PREVIOS AL EVENTO (2 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[3].id,
                name: 'Edición de video slide musicalizado con las fotos de retoque fino de la sesión',
                cost: 300, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[3].id,
                name: 'Edición de video remembranza con hasta 100 fotografías de momentos especiales',
                cost: 300, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // ARTE IMPRESO DE SESIÓN (2 categorías)
        // Cuadros de sesión
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[4].id,
                name: 'Cuadro en acrílico 24x36" en papel perla sobre macocel y bastidor',
                cost: 2040, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // Libro de sesión de lujo 12x12"
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[4].id,
                name: 'Diseño de libro de sesión',
                cost: 500, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[4].id,
                name: 'Libro de lujo de sesión 12x12" con portada en acrílico impresa en papel aperlado con interiores impresos el papel velvet o perla con hasta 12 paginas en interior',
                cost: 2400, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[4].id,
                name: 'Caja de lujo 12x12" para libro de sesión con tapa de acrílico y fotografía impresa en papel aperlado o velvet',
                cost: 3300, expense: 0, order: 3, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // Libros de sesión
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[4].id,
                name: 'Libro clásico de sesión 12x12" con foto portada en textura con interiores impresos el papel lustre, mate o brillante con hasta 12 paginas en interior',
                cost: 1237, expense: 0, order: 4, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion1[4].id,
                name: 'Caja clásica 12x12" para libro de sesión con foto envolvente y foto en tapa interior',
                cost: 1275, expense: 0, order: 5, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // ARREGLO EN DOMICILIO (6 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[0].id,
                name: 'Fotógrafo A por servicio de 2 hrs',
                cost: 1000, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[0].id,
                name: 'Asistente de iluminación A por servicio de 2 hrs',
                cost: 250, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[0].id,
                name: 'Fotógrafo B por servicio de 2 hrs',
                cost: 1000, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[0].id,
                name: 'Asistente de iluminación B por servicio de 2 hrs',
                cost: 250, expense: 0, order: 3, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[0].id,
                name: 'Camarógrafo A por servicio de 2 hrs',
                cost: 1000, expense: 0, order: 4, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[0].id,
                name: 'Camarógrafo B por servicio de 2 hrs',
                cost: 1000, expense: 0, order: 5, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // TOUR LIMUSINA (3 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[1].id,
                name: 'Fotógrafo A por servicio',
                cost: 500, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[1].id,
                name: 'Asistente de iluminación A por servicio',
                cost: 200, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[1].id,
                name: 'Camarógrafo A por servicio',
                cost: 500, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // FOTOGRAFÍA DE EVENTO (5 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[2].id,
                name: 'Fotógrafo A por hora (Cobertura general)',
                cost: 300, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[2].id,
                name: 'Asistente de iluminación A por hora',
                cost: 100, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[2].id,
                name: 'Fotógrafo B por hora (Fotografía de detalle)',
                cost: 200, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[2].id,
                name: 'Asistente de iluminación B por hora',
                cost: 100, expense: 0, order: 3, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[2].id,
                name: 'Revelado ligero de todas las fotografías del evento',
                cost: 2500, expense: 0, order: 4, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // CINEMATOGRAFÍA DE EVENTO (8 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Camarógrafo A por hora',
                cost: 300, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Camarógrafo B por hora',
                cost: 200, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Camarógrafo C por hora',
                cost: 200, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Grúa con cabezal robótico de 8mts y operador',
                cost: 5000, expense: 0, order: 3, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Grabación con dron 4k para evento en momentos clave',
                cost: 1500, expense: 0, order: 4, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Asistente de producción por hora',
                cost: 100, expense: 0, order: 5, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Edición de video extendido de 90 min',
                cost: 2500, expense: 0, order: 6, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Edición de video de hasta 40min',
                cost: 1500, expense: 0, order: 7, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion2[3].id,
                name: 'Edición de video resumen de hasta 3min',
                cost: 1000, expense: 0, order: 8, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // CUADRO DE EVENTO (1 servicio)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[0].id,
                name: 'Cuadro en acrílico 24x36" en papel perla sobre macocel y bastidor',
                cost: 2040, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // LIBRO DE EVENTO DE LUJO 12X12" (4 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[1].id,
                name: 'Diseño de libro de evento',
                cost: 500, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[1].id,
                name: 'Kit de revelado y retoque avanzado de hasta 55 fotografías de evento para libro',
                cost: 3000, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[1].id,
                name: 'Libro de lujo 12x12" de evento con portada en acrílico impresa en papel aperlado, interiores impresos el papel mate velvet con hasta 50 paginas en interior (80 fotos)',
                cost: 4905, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[1].id,
                name: 'Caja de lujo 12x12" para libro de evento con foto envolvente y foto en tapa interior',
                cost: 3500, expense: 0, order: 3, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // LIBRO DE EVENTO CLÁSICO 12X12" (3 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[2].id,
                name: 'Libro clásico de evento 12x12" con foto portada con textura a elegir, interiores impresos el papel lustre, mate o brillante con hasta 50 paginas en interior (80 fotos)',
                cost: 2989, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[2].id,
                name: 'Caja estándar 12x12" para libro de sesión con foto envolvente y foto en tapa interior',
                cost: 1600, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // LIBRO DE EVENTO CLÁSICO 10X10" (3 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[3].id,
                name: 'Libro clásico de evento 10x10" con foto portada con textura a elegir, interiores impresos el papel lustre, mate o brillante con hasta 50 paginas en interior (80 fotos)',
                cost: 2250, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion3[3].id,
                name: 'Caja estándar 10x10" para libro de sesión con foto envolvente y foto en tapa interior',
                cost: 1500, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),

        // OTROS ENTREGABLES (4 servicios)
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion4[0].id,
                name: 'USB de 64GB 3.0',
                cost: 300, expense: 0, order: 0, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion4[0].id,
                name: 'Bolsa tipo shopping para caja de USB',
                cost: 500, expense: 0, order: 1, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion4[0].id,
                name: 'Caja para USB',
                cost: 1500, expense: 0, order: 2, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        }),
        prisma.studio_items.create({
            data: {
                studio_id: studioId,
                service_category_id: categoriasSeccion4[0].id,
                name: 'Link permanente de Google Drive',
                cost: 0, expense: 0, order: 3, status: 'active', type: 'SERVICIO', utility_type: 'service'
            }
        })
    ]);

    console.log(`✅ ${servicios.length} servicios creados y relacionados con categorías`);

    // ============================================
    // 5. CALCULAR PRECIOS DE TODOS LOS SERVICIOS
    // ============================================

    console.log('💰 Calculando precios de todos los servicios...');

    for (const servicio of servicios) {
        const precioPublico = calcularPrecioPublico(servicio.cost, servicio.expense, 'servicio', studioConfig);

        console.log(`  ✅ ${servicio.name}:`);
        console.log(`     Costo: $${servicio.cost.toFixed(2)}`);
        console.log(`     Gasto: $${servicio.expense.toFixed(2)}`);
        console.log(`     Precio Calculado: $${precioPublico.toFixed(2)}`);
    }

    console.log('✅ Catálogo COMPLETO con estructura anidada sembrado exitosamente');
    console.log('🎯 RESULTADOS OBTENIDOS:');
    console.log(`   ✅ ${secciones.length} Secciones de servicios`);
    console.log(`   ✅ ${todasLasCategorias.length} Categorías organizadas por sección`);
    console.log(`   ✅ ${servicios.length} Servicios con costos reales`);
    console.log('   ✅ Estructura anidada: Sección → Categoría → Servicio');
    console.log('   ✅ Relaciones correctas creadas en base de datos');
}

async function main() {
    try {
        // Buscar específicamente demo-studio por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: 'demo-studio' },
            select: { id: true, studio_name: true, slug: true }
        });

        if (!studio) {
            console.error('❌ No se encontró demo-studio en la base de datos');
            process.exit(1);
        }

        console.log(`🎯 Sembrando catálogo COMPLETO con estructura anidada para studio: ${studio.studio_name} (slug: ${studio.slug}, id: ${studio.id})`);

        await seedStudioCatalog(studio.id);

        console.log('🎉 Seed COMPLETO con estructura anidada finalizado exitosamente!');
    } catch (error) {
        console.error('❌ Error durante el seed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    main();
}