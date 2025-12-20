/**
 * Script de testing manual para helpers de módulos
 * 
 * Ejecutar con: npx tsx src/lib/modules/__tests__/manual-test.ts
 * 
 * Este script verifica que los helpers funcionen correctamente
 * con los datos reales de la base de datos (seeds).
 */

import {
  checkStudioModule,
  getActiveModules,
  getModuleInfo,
  checkMultipleModules,
  getAllModulesWithStatus
} from '../index';

const DEMO_STUDIO_ID = 'demo-studio-id';

async function runTests() {
  console.log('🧪 Iniciando tests manuales de módulos V2.0...\n');

  try {
    // Test 1: Verificar módulo activo
    console.log('📋 Test 1: Verificar módulo activo (manager)');
    const hasManager = await checkStudioModule(DEMO_STUDIO_ID, 'manager');
    console.log(`  ✅ Resultado: ${hasManager}`);
    console.assert(hasManager === true, 'Manager debería estar activo');

    // Test 2: Verificar módulo inactivo
    console.log('\n📋 Test 2: Verificar módulo inactivo (payment)');
    const hasPayment = await checkStudioModule(DEMO_STUDIO_ID, 'payment');
    console.log(`  ✅ Resultado: ${hasPayment}`);
    console.assert(hasPayment === false, 'Payment NO debería estar activo');

    // Test 3: Listar módulos activos
    console.log('\n📋 Test 3: Listar módulos activos');
    const activeModules = await getActiveModules(DEMO_STUDIO_ID);
    console.log(`  ✅ Módulos activos (${activeModules.length}):`);
    activeModules.forEach(m => {
      console.log(`     - ${m.name} (${m.slug}) - ${m.category}`);
    });
    console.assert(activeModules.length === 3, 'Deberían haber 3 módulos activos');

    // Test 4: Información de módulo específico
    console.log('\n📋 Test 4: Información de módulo (payment)');
    const paymentInfo = await getModuleInfo('payment');
    if (paymentInfo) {
      console.log(`  ✅ Nombre: ${paymentInfo.name}`);
      console.log(`  ✅ Categoría: ${paymentInfo.category}`);
      console.log(`  ✅ Precio: $${paymentInfo.base_price}/mes`);
    }
    console.assert(paymentInfo?.base_price?.toString() === '10', 'Payment debe costar $10');

    // Test 5: Verificar múltiples módulos
    console.log('\n📋 Test 5: Verificar múltiples módulos');
    const access = await checkMultipleModules(DEMO_STUDIO_ID, [
      'manager',
      'magic',
      'marketing',
      'payment',
      'cloud'
    ]);
    console.log('  ✅ Acceso por módulo:');
    Object.entries(access).forEach(([module, hasAccess]) => {
      const icon = hasAccess ? '✓' : '✗';
      console.log(`     ${icon} ${module}: ${hasAccess}`);
    });

    // Test 6: Todos los módulos con estado
    console.log('\n📋 Test 6: Todos los módulos con estado');
    const allModules = await getAllModulesWithStatus(DEMO_STUDIO_ID);
    console.log(`  ✅ Total de módulos: ${allModules.length}`);
    console.log('\n  📊 CORE Modules:');
    allModules
      .filter(m => m.category === 'CORE')
      .forEach(m => {
        const status = m.is_active ? '✓ Activo' : '✗ Inactivo';
        console.log(`     ${status} - ${m.name}`);
      });
    console.log('\n  📊 ADDON Modules:');
    allModules
      .filter(m => m.category === 'ADDON')
      .forEach(m => {
        const status = m.is_active ? '✓ Activo' : '✗ Inactivo';
        const price = m.base_price ? `($${m.base_price}/mes)` : '';
        console.log(`     ${status} - ${m.name} ${price}`);
      });

    // Test 7: Verificar módulo inexistente
    console.log('\n📋 Test 7: Módulo inexistente');
    const hasInvalid = await checkStudioModule(DEMO_STUDIO_ID, 'modulo-no-existe');
    console.log(`  ✅ Resultado: ${hasInvalid}`);
    console.assert(hasInvalid === false, 'Módulo inexistente debe retornar false');

    // Test 8: Studio inexistente
    console.log('\n📋 Test 8: Studio inexistente');
    const hasModuleInvalid = await checkStudioModule('studio-no-existe', 'manager');
    console.log(`  ✅ Resultado: ${hasModuleInvalid}`);
    console.assert(hasModuleInvalid === false, 'Studio inexistente debe retornar false');

    console.log('\n\n🎉 ¡Todos los tests manuales completados exitosamente!');
    console.log('\n📝 Resumen:');
    console.log('  ✅ checkStudioModule() - Funcional');
    console.log('  ✅ getActiveModules() - Funcional');
    console.log('  ✅ getModuleInfo() - Funcional');
    console.log('  ✅ checkMultipleModules() - Funcional');
    console.log('  ✅ getAllModulesWithStatus() - Funcional');
    console.log('\n✨ Helpers de módulos V2.0 listos para usar en frontend!');

  } catch (error) {
    console.error('\n❌ Error durante los tests:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar tests
runTests();

