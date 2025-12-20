-- ============================================
-- OPTIMIZACIÓN: Índices en Foreign Keys Críticas
-- ============================================
-- Agrega índices a foreign keys más usadas para mejorar performance
-- NOTA: Se usa CREATE INDEX (sin CONCURRENTLY) porque Supabase ejecuta migraciones en transacciones
-- Operación segura: no modifica datos, solo mejora búsquedas
-- En producción con mucho tráfico, considerar ejecutar manualmente con CONCURRENTLY

-- ============================================
-- STUDIO_PROMISES (Tabla crítica - alta frecuencia)
-- ============================================

-- contact_id: usado en JOINs y filtros frecuentes
CREATE INDEX IF NOT EXISTS 
  idx_studio_promises_contact_id 
ON public.studio_promises(contact_id);

-- event_type_id: usado en filtros y agrupaciones
CREATE INDEX IF NOT EXISTS 
  idx_studio_promises_event_type_id 
ON public.studio_promises(event_type_id);

-- ============================================
-- STUDIO_COTIZACIONES (Tabla crítica - alta frecuencia)
-- ============================================

-- promise_id: relación clave con promises
CREATE INDEX IF NOT EXISTS 
  idx_studio_cotizaciones_promise_id 
ON public.studio_cotizaciones(promise_id);

-- contact_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_cotizaciones_contact_id 
ON public.studio_cotizaciones(contact_id);

-- event_type_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_cotizaciones_event_type_id 
ON public.studio_cotizaciones(event_type_id);

-- condiciones_comerciales_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_cotizaciones_condiciones_comerciales_id 
ON public.studio_cotizaciones(condiciones_comerciales_id);

-- ============================================
-- STUDIO_COTIZACION_ITEMS (Tabla relacionada)
-- ============================================

-- item_id: usado en JOINs con items
CREATE INDEX IF NOT EXISTS 
  idx_studio_cotizacion_items_item_id 
ON public.studio_cotizacion_items(item_id);

-- service_category_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_cotizacion_items_service_category_id 
ON public.studio_cotizacion_items(service_category_id);

-- ============================================
-- STUDIO_NOTIFICATIONS (Tabla de alta frecuencia)
-- ============================================

-- agent_id: usado en filtros por agente
CREATE INDEX IF NOT EXISTS 
  idx_studio_notifications_agent_id 
ON public.studio_notifications(agent_id);

-- lead_id: usado en filtros por lead
CREATE INDEX IF NOT EXISTS 
  idx_studio_notifications_lead_id 
ON public.studio_notifications(lead_id);

-- ============================================
-- STUDIO_EVENTOS (Tabla crítica)
-- ============================================

-- event_type_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_eventos_event_type_id 
ON public.studio_eventos(event_type_id);

-- user_id: usado en filtros por usuario
CREATE INDEX IF NOT EXISTS 
  idx_studio_eventos_user_id 
ON public.studio_eventos(user_id);

-- studio_manager_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_eventos_studio_manager_id 
ON public.studio_eventos(studio_manager_id);

-- ============================================
-- STUDIO_PAGOS (Tabla financiera crítica)
-- ============================================

-- user_id: usado en filtros por usuario
CREATE INDEX IF NOT EXISTS 
  idx_studio_pagos_user_id 
ON public.studio_pagos(user_id);

-- condiciones_comerciales_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_pagos_condiciones_comerciales_id 
ON public.studio_pagos(condiciones_comerciales_id);

-- metodo_pago_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_pagos_metodo_pago_id 
ON public.studio_pagos(metodo_pago_id);

-- ============================================
-- STUDIO_ITEMS (Catálogo)
-- ============================================

-- service_category_id: usado en filtros y JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_items_service_category_id 
ON public.studio_items(service_category_id);

-- ============================================
-- STUDIO_PAQUETE_ITEMS (Relaciones)
-- ============================================

-- item_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_paquete_items_item_id 
ON public.studio_paquete_items(item_id);

-- service_category_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_paquete_items_service_category_id 
ON public.studio_paquete_items(service_category_id);

-- ============================================
-- STUDIO_PAQUETES (Catálogo)
-- ============================================

-- event_type_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_paquetes_event_type_id 
ON public.studio_paquetes(event_type_id);

-- ============================================
-- STUDIO_NOMINAS (Nóminas)
-- ============================================

-- evento_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_nominas_evento_id 
ON public.studio_nominas(evento_id);

-- personal_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_nominas_personal_id 
ON public.studio_nominas(personal_id);

-- user_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_nominas_user_id 
ON public.studio_nominas(user_id);

-- authorized_by: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_nominas_authorized_by 
ON public.studio_nominas(authorized_by);

-- paid_by: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_nominas_paid_by 
ON public.studio_nominas(paid_by);

-- ============================================
-- STUDIO_AGENDA (Calendario)
-- ============================================

-- user_id: usado en filtros por usuario
CREATE INDEX IF NOT EXISTS 
  idx_studio_agenda_user_id 
ON public.studio_agenda(user_id);

-- ============================================
-- PLATFORM_NOTIFICATIONS (Notificaciones globales)
-- ============================================

-- agent_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_platform_notifications_agent_id 
ON public.platform_notifications(agent_id);

-- lead_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_platform_notifications_lead_id 
ON public.platform_notifications(lead_id);

-- ============================================
-- PLATFORM_LEAD_BITACORA (Bitácora)
-- ============================================

-- usuario_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_platform_lead_bitacora_usuario_id 
ON public.platform_lead_bitacora(usuario_id);

-- ============================================
-- PLATFORM_AGENT_DISCOUNT_CODES (Descuentos)
-- ============================================

-- subscription_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_platform_agent_discount_codes_subscription_id 
ON public.platform_agent_discount_codes(subscription_id);

-- ============================================
-- STUDIO_CLIENT_PORTAL_ACCESS (Portal cliente)
-- ============================================

-- event_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_client_portal_access_event_id 
ON public.studio_client_portal_access(event_id);

-- ============================================
-- STUDIO_CONTRACT_TEMPLATES (Contratos)
-- ============================================

-- created_by: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_contract_templates_created_by 
ON public.studio_contract_templates(created_by);

-- ============================================
-- STUDIO_EVENT_CONTRACTS (Contratos de eventos)
-- ============================================

-- created_by: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_event_contracts_created_by 
ON public.studio_event_contracts(created_by);

-- ============================================
-- STUDIO_EVENT_TIMELINE (Timeline)
-- ============================================

-- user_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_event_timeline_user_id 
ON public.studio_event_timeline(user_id);

-- ============================================
-- STUDIO_ITEM_EXPENSES (Gastos de items)
-- ============================================

-- item_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_item_expenses_item_id 
ON public.studio_item_expenses(item_id);

-- ============================================
-- STUDIO_GASTOS (Gastos)
-- ============================================

-- user_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_gastos_user_id 
ON public.studio_gastos(user_id);

-- ============================================
-- STUDIO_SCHEDULER_EVENT_TASKS (Tareas)
-- ============================================

-- completed_by_user_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_scheduler_event_tasks_completed_by_user_id 
ON public.studio_scheduler_event_tasks(completed_by_user_id);

-- depends_on_task_id: usado en JOINs recursivos
CREATE INDEX IF NOT EXISTS 
  idx_studio_scheduler_event_tasks_depends_on_task_id 
ON public.studio_scheduler_event_tasks(depends_on_task_id);

-- ============================================
-- STUDIO_SCHEDULER_TASK_ACTIVITY (Actividad)
-- ============================================

-- user_id: usado en filtros
CREATE INDEX IF NOT EXISTS 
  idx_studio_scheduler_task_activity_user_id 
ON public.studio_scheduler_task_activity(user_id);

-- ============================================
-- STUDIO_SECTION_CATEGORIES (Categorías)
-- ============================================

-- section_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_section_categories_section_id 
ON public.studio_section_categories(section_id);

-- ============================================
-- STUDIO_STUDIO_REVENUE_PRODUCTS (Productos)
-- ============================================

-- revenue_product_id: usado en JOINs
CREATE INDEX IF NOT EXISTS 
  idx_studio_studio_revenue_products_revenue_product_id 
ON public.studio_studio_revenue_products(revenue_product_id);

-- ============================================
-- SUBSCRIPTIONS (Suscripciones)
-- ============================================

-- plan_id: usado en JOINs y filtros
CREATE INDEX IF NOT EXISTS 
  idx_subscriptions_plan_id 
ON public.subscriptions(plan_id);

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON INDEX idx_studio_promises_contact_id IS 
  'Índice en foreign key para mejorar JOINs y filtros por contacto';

COMMENT ON INDEX idx_studio_cotizaciones_promise_id IS 
  'Índice en foreign key para mejorar JOINs con promises';

COMMENT ON INDEX idx_studio_notifications_agent_id IS 
  'Índice en foreign key para mejorar filtros por agente';
