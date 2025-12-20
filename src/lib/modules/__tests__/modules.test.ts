/**
 * Tests para Módulos V2.0 - Helpers básicos
 * 
 * Estos tests verifican la funcionalidad básica de validación de módulos.
 * NO incluyen tests de validación de planes (eso viene en Iteración 2).
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  checkStudioModule,
  getActiveModules,
  getModuleInfo,
  checkMultipleModules,
  getAllModulesWithStatus
} from '../index';

// IDs de prueba (estos deben coincidir con los seeds)
const DEMO_STUDIO_ID = 'demo-studio-id';
const DEMO_OWNER_ID = 'user-owner';

describe('Módulos V2.0 - Helpers', () => {
  describe('checkStudioModule', () => {
    it('debe retornar true para módulo activo (manager)', async () => {
      const hasManager = await checkStudioModule(DEMO_STUDIO_ID, 'manager');
      expect(hasManager).toBe(true);
    });

    it('debe retornar true para módulo activo (magic)', async () => {
      const hasMagic = await checkStudioModule(DEMO_STUDIO_ID, 'magic');
      expect(hasMagic).toBe(true);
    });

    it('debe retornar true para módulo activo (marketing)', async () => {
      const hasMarketing = await checkStudioModule(DEMO_STUDIO_ID, 'marketing');
      expect(hasMarketing).toBe(true);
    });

    it('debe retornar false para módulo no activo (payment)', async () => {
      const hasPayment = await checkStudioModule(DEMO_STUDIO_ID, 'payment');
      expect(hasPayment).toBe(false);
    });

    it('debe retornar false para módulo inexistente', async () => {
      const hasInvalid = await checkStudioModule(DEMO_STUDIO_ID, 'modulo-inexistente');
      expect(hasInvalid).toBe(false);
    });

    it('debe retornar false para studio inexistente', async () => {
      const hasModule = await checkStudioModule('studio-inexistente', 'manager');
      expect(hasModule).toBe(false);
    });
  });

  describe('getActiveModules', () => {
    it('debe retornar los 3 módulos activos del demo studio', async () => {
      const modules = await getActiveModules(DEMO_STUDIO_ID);
      
      expect(modules).toHaveLength(3);
      
      const slugs = modules.map(m => m.slug);
      expect(slugs).toContain('manager');
      expect(slugs).toContain('magic');
      expect(slugs).toContain('marketing');
    });

    it('debe retornar array vacío para studio sin módulos', async () => {
      const modules = await getActiveModules('studio-sin-modulos');
      expect(modules).toEqual([]);
    });

    it('debe incluir información completa del módulo', async () => {
      const modules = await getActiveModules(DEMO_STUDIO_ID);
      const manager = modules.find(m => m.slug === 'manager');

      expect(manager).toBeDefined();
      expect(manager?.name).toBe('ZEN Manager');
      expect(manager?.category).toBe('CORE');
      expect(manager?.slug).toBe('manager');
    });
  });

  describe('getModuleInfo', () => {
    it('debe retornar información del módulo manager', async () => {
      const module = await getModuleInfo('manager');

      expect(module).toBeDefined();
      expect(module?.slug).toBe('manager');
      expect(module?.name).toBe('ZEN Manager');
      expect(module?.category).toBe('CORE');
    });

    it('debe retornar información de módulo addon con precio', async () => {
      const module = await getModuleInfo('payment');

      expect(module).toBeDefined();
      expect(module?.slug).toBe('payment');
      expect(module?.category).toBe('ADDON');
      expect(module?.base_price).toBe(10.00);
    });

    it('debe retornar null para módulo inexistente', async () => {
      const module = await getModuleInfo('modulo-inexistente');
      expect(module).toBeNull();
    });
  });

  describe('checkMultipleModules', () => {
    it('debe verificar múltiples módulos correctamente', async () => {
      const access = await checkMultipleModules(DEMO_STUDIO_ID, [
        'manager',
        'magic',
        'marketing',
        'payment'
      ]);

      expect(access).toEqual({
        manager: true,
        magic: true,
        marketing: true,
        payment: false
      });
    });

    it('debe retornar false para módulos inexistentes', async () => {
      const access = await checkMultipleModules(DEMO_STUDIO_ID, [
        'modulo-invalido-1',
        'modulo-invalido-2'
      ]);

      expect(access).toEqual({
        'modulo-invalido-1': false,
        'modulo-invalido-2': false
      });
    });
  });

  describe('getAllModulesWithStatus', () => {
    it('debe retornar todos los módulos con su estado', async () => {
      const modules = await getAllModulesWithStatus(DEMO_STUDIO_ID);

      expect(modules.length).toBeGreaterThanOrEqual(7); // 7 módulos en seeds

      // Verificar que módulos core están activos
      const manager = modules.find(m => m.slug === 'manager');
      expect(manager?.is_active).toBe(true);

      // Verificar que addons no están activos
      const payment = modules.find(m => m.slug === 'payment');
      expect(payment?.is_active).toBe(false);
    });

    it('debe incluir información de precios en addons', async () => {
      const modules = await getAllModulesWithStatus(DEMO_STUDIO_ID);

      const payment = modules.find(m => m.slug === 'payment');
      expect(payment?.base_price).toBe(10.00);

      const cloud = modules.find(m => m.slug === 'cloud');
      expect(cloud?.base_price).toBe(15.00);
    });

    it('debe retornar módulos ordenados por categoría y nombre', async () => {
      const modules = await getAllModulesWithStatus(DEMO_STUDIO_ID);

      // Primero deben venir los CORE
      const firstModule = modules[0];
      expect(firstModule.category).toBe('CORE');
    });
  });
});

/**
 * Tests de integración básica
 * 
 * Estos tests verifican que los helpers funcionan en conjunto
 * como se usarían en la aplicación real.
 */
describe('Módulos V2.0 - Integración', () => {
  it('escenario: middleware de protección de ruta', async () => {
    // Simular middleware que protege ruta /studio/[slug]/manager
    const hasAccess = await checkStudioModule(DEMO_STUDIO_ID, 'manager');
    
    expect(hasAccess).toBe(true);
    // En la app real: if (!hasAccess) redirect('/settings/modules')
  });

  it('escenario: menú lateral solo muestra módulos activos', async () => {
    const activeModules = await getActiveModules(DEMO_STUDIO_ID);
    
    // El menú solo debe mostrar estos 3 items
    expect(activeModules).toHaveLength(3);
    
    const menuItems = activeModules.map(m => ({
      href: `/studio/demo-studio/${m.slug}`,
      label: m.name
    }));

    expect(menuItems).toEqual([
      { href: '/studio/demo-studio/manager', label: 'ZEN Manager' },
      { href: '/studio/demo-studio/magic', label: 'ZEN Magic' },
      { href: '/studio/demo-studio/marketing', label: 'ZEN Marketing' }
    ]);
  });

  it('escenario: settings muestra todos los módulos con estado', async () => {
    const allModules = await getAllModulesWithStatus(DEMO_STUDIO_ID);
    
    // Debe mostrar 7 módulos (3 activos, 4 inactivos)
    expect(allModules.length).toBe(7);

    // CORE activos
    const coreModules = allModules.filter(m => m.category === 'CORE');
    expect(coreModules.every(m => m.is_active)).toBe(true);

    // ADDONS inactivos
    const addonModules = allModules.filter(m => m.category === 'ADDON');
    expect(addonModules.every(m => !m.is_active)).toBe(true);
  });

  it('escenario: verificación rápida de múltiples módulos para dashboard', async () => {
    // Dashboard necesita saber qué widgets mostrar según módulos activos
    const modulesAccess = await checkMultipleModules(DEMO_STUDIO_ID, [
      'manager',  // Widget de eventos
      'marketing', // Widget de leads
      'payment'    // Widget de pagos
    ]);

    // Solo debe mostrar widgets de manager y marketing
    expect(modulesAccess.manager).toBe(true);
    expect(modulesAccess.marketing).toBe(true);
    expect(modulesAccess.payment).toBe(false);
  });
});

/**
 * Tests de edge cases y manejo de errores
 */
describe('Módulos V2.0 - Edge Cases', () => {
  it('debe manejar studio_id vacío', async () => {
    const hasModule = await checkStudioModule('', 'manager');
    expect(hasModule).toBe(false);
  });

  it('debe manejar moduleSlug vacío', async () => {
    const hasModule = await checkStudioModule(DEMO_STUDIO_ID, '');
    expect(hasModule).toBe(false);
  });

  it('debe manejar caracteres especiales en slugs', async () => {
    const hasModule = await checkStudioModule(DEMO_STUDIO_ID, 'module@#$%');
    expect(hasModule).toBe(false);
  });

  it('debe retornar arrays vacíos en caso de error de DB', async () => {
    const modules = await getActiveModules('studio-que-causa-error');
    expect(Array.isArray(modules)).toBe(true);
    expect(modules).toEqual([]);
  });
});

