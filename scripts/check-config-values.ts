import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfigValues() {
  try {
    const studio = await prisma.studios.findFirst({
      where: { slug: 'demo-studio' },
      select: { id: true, studio_name: true },
    });

    if (!studio) {
      console.log('Studio no encontrado');
      return;
    }

    const config = await prisma.studio_configuraciones.findFirst({
      where: {
        studio_id: studio.id,
        status: 'active',
      },
      select: {
        id: true,
        markup: true,
        sales_commission: true,
        service_margin: true,
        product_margin: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!config) {
      console.log('No hay configuración activa');
      return;
    }

    console.log('\n=== Valores en Base de Datos ===');
    console.log('Studio:', studio.studio_name);
    console.log('markup (sobreprecio):', config.markup, `(${(config.markup * 100).toFixed(2)}%)`);
    console.log('sales_commission:', config.sales_commission, `(${(config.sales_commission * 100).toFixed(2)}%)`);
    console.log('service_margin:', config.service_margin, `(${(config.service_margin * 100).toFixed(2)}%)`);
    console.log('product_margin:', config.product_margin, `(${(config.product_margin * 100).toFixed(2)}%)`);
    console.log('Última actualización:', config.updated_at);
    console.log('\n=== Análisis ===');
    console.log('El descuento máximo debería usar markup:', config.markup, `= ${(config.markup * 100).toFixed(2)}%`);
    console.log('Si muestra 5%, está usando sales_commission:', config.sales_commission, `= ${(config.sales_commission * 100).toFixed(2)}%`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfigValues();

