-- =====================================================
-- MIGRACIÓN: Mejoras al esquema del catálogo de servicios
-- =====================================================
-- Fecha: 2025-09-29
-- Propósito: Mejorar semántica y eliminar campos legacy
-- Afecta: project_servicio_secciones, project_servicio_categorias, project_servicios
-- =====================================================

-- =====================================================
-- PASO 1: Renombrar columna 'posicion' → 'orden'
-- =====================================================
-- Mejora semántica: 'orden' es más claro que 'posicion'
-- Compatible con patrón usado en otros módulos (personal, etc)

-- 1.1 Renombrar en project_servicio_secciones
alter table public.project_servicio_secciones 
  rename column posicion to orden;

comment on column public.project_servicio_secciones.orden is 
  'Orden de visualización de la sección en el catálogo (0-based)';

-- 1.2 Renombrar en project_servicio_categorias
alter table public.project_servicio_categorias 
  rename column posicion to orden;

comment on column public.project_servicio_categorias.orden is 
  'Orden de visualización de la categoría dentro de su sección (0-based)';

-- 1.3 Renombrar en project_servicios
alter table public.project_servicios 
  rename column posicion to orden;

comment on column public.project_servicios.orden is 
  'Orden de visualización del servicio dentro de su categoría (0-based)';

-- =====================================================
-- PASO 2: Renombrar columna 'projectId' → 'studioId'
-- =====================================================
-- Mejora claridad multi-tenant: studioId es más específico que projectId
-- NOTA: Este cambio requiere actualizar índices y relaciones

-- 2.1 Eliminar índice existente
drop index if exists public.project_servicios_projectid_status_idx;

-- 2.2 Renombrar columna
alter table public.project_servicios 
  rename column "projectId" to "studioId";

comment on column public.project_servicios."studioId" is 
  'ID del estudio al que pertenece este servicio (multi-tenant isolation)';

-- 2.3 Recrear índice con nuevo nombre
create index project_servicios_studioid_status_idx 
  on public.project_servicios using btree ("studioId", status);

-- =====================================================
-- PASO 3: Eliminar columna 'visible_cliente' (legacy)
-- =====================================================
-- CRÍTICO: Este campo NO se usa en project_servicios
-- MANTENER en project_paquete_servicios (donde sí se usa)

-- 3.1 Eliminar columna de project_servicios
alter table public.project_servicios 
  drop column if exists visible_cliente;

-- Nota: NO eliminar de project_paquete_servicios donde sí se usa para filtrar servicios visibles

-- =====================================================
-- PASO 4: Agregar comentarios descriptivos
-- =====================================================
-- Mejorar documentación del esquema

comment on table public.project_servicio_secciones is 
  'Secciones del catálogo de servicios (Nivel 1: Ej. "Experiencias previas al evento")';

comment on table public.project_servicio_categorias is 
  'Categorías de servicios (Nivel 2: Ej. "Fotografía de sesión previa")';

comment on table public.project_servicios is 
  'Servicios individuales del catálogo (Nivel 3: Ej. "Shooting en estudio 45min")';

comment on table public.project_seccion_categorias is 
  'Tabla pivote que relaciona secciones con categorías (many-to-many)';

-- =====================================================
-- PASO 5: Comentarios en campos clave
-- =====================================================

-- project_servicio_secciones
comment on column public.project_servicio_secciones.nombre is 
  'Nombre de la sección (debe ser único en el catálogo)';
comment on column public.project_servicio_secciones.descripcion is 
  'Descripción opcional de la sección para contexto adicional';

-- project_servicio_categorias
comment on column public.project_servicio_categorias.nombre is 
  'Nombre de la categoría (debe ser único en el catálogo)';

-- project_servicios
comment on column public.project_servicios.nombre is 
  'Nombre descriptivo del servicio';
comment on column public.project_servicios.costo is 
  'Costo base del servicio (sin utilidad)';
comment on column public.project_servicios.gasto is 
  'Gastos adicionales asociados al servicio';
comment on column public.project_servicios.utilidad is 
  'Utilidad calculada según tipo_utilidad (fija o porcentaje)';
comment on column public.project_servicios.precio_publico is 
  'Precio final de venta al cliente (costo + gasto + utilidad)';
comment on column public.project_servicios.tipo_utilidad is 
  'Tipo de cálculo de utilidad: "servicio" (monto fijo) o "porcentaje" (% sobre costo)';
comment on column public.project_servicios.status is 
  'Estado del servicio: "active" (disponible) o "inactive" (oculto)';

-- =====================================================
-- VERIFICACIÓN DE MIGRACIÓN
-- =====================================================
-- Ejecutar estas queries para verificar que la migración fue exitosa:

-- Verificar renombramiento de columnas en secciones
-- select id, nombre, orden from public.project_servicio_secciones limit 5;

-- Verificar renombramiento de columnas en categorías  
-- select id, nombre, orden from public.project_servicio_categorias limit 5;

-- Verificar renombramiento de columnas en servicios
-- select id, nombre, "studioId", orden from public.project_servicios limit 5;

-- Verificar que visible_cliente ya no existe en project_servicios
-- select column_name from information_schema.columns 
-- where table_name = 'project_servicios' and column_name = 'visible_cliente';
-- (Debe retornar 0 filas)

-- Verificar índice nuevo
-- select indexname from pg_indexes 
-- where tablename = 'project_servicios' and indexname = 'project_servicios_studioid_status_idx';

-- =====================================================
-- ROLLBACK (en caso de necesitar revertir)
-- =====================================================
-- ADVERTENCIA: Solo usar si algo sale mal

-- Revertir renombramientos:
-- alter table public.project_servicio_secciones rename column orden to posicion;
-- alter table public.project_servicio_categorias rename column orden to posicion;
-- alter table public.project_servicios rename column orden to posicion;
-- alter table public.project_servicios rename column "studioId" to "projectId";
-- drop index if exists public.project_servicios_studioid_status_idx;
-- create index project_servicios_projectid_status_idx on public.project_servicios("projectId", status);

-- Revertir eliminación de visible_cliente (con datos default):
-- alter table public.project_servicios add column visible_cliente boolean default true;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
