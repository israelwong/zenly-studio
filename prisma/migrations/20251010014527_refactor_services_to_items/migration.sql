/*
  Warnings:

  - You are about to drop the column `descripcion` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_proxima_accion` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `proxima_accion` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `resultado` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `agente_id` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `codigo_base` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `codigo_completo` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `duracion_descuento` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_expiracion` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_uso` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_descuento` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `usado` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `valor_descuento` on the `platform_agent_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `platform_agents` table. All the data in the column will be lost.
  - You are about to drop the column `comisionConversion` on the `platform_agents` table. All the data in the column will be lost.
  - You are about to drop the column `meta_mensual_leads` on the `platform_agents` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `platform_agents` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `platform_agents` table. All the data in the column will be lost.
  - You are about to drop the column `comercial_telefono` on the `platform_config` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `platform_config` table. All the data in the column will be lost.
  - You are about to drop the column `horarios_atencion` on the `platform_config` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_empresa` on the `platform_config` table. All the data in the column will be lost.
  - You are about to drop the column `soporte_telefono` on the `platform_config` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `codigo` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_fin` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_inicio` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_aplicacion` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_descuento` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `uso_actual` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `uso_maximo` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `valor_descuento` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_uso` on the `platform_discount_usage` table. All the data in the column will be lost.
  - You are about to drop the column `monto_descuento` on the `platform_discount_usage` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `platform_lead_bitacora` table. All the data in the column will be lost.
  - You are about to drop the column `categoria` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `mensaje` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `titulo` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `platform_pipeline_stages` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `platform_pipeline_stages` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `platform_pipeline_stages` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `platform_pipeline_types` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `platform_pipeline_types` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `platform_pipeline_types` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `platform_pipeline_types` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `platform_plans` table. All the data in the column will be lost.
  - You are about to drop the column `posicion` on the `platform_services` table. All the data in the column will be lost.
  - You are about to drop the column `posicion` on the `service_categories` table. All the data in the column will be lost.
  - You are about to drop the column `concepto` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `fecha` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `hora` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_agenda_tipos` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_categorias_personal` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_categorias_personal` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `studio_categorias_personal` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `studio_clientes` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_clientes` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `studio_clientes` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_condiciones_comerciales` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_condiciones_comerciales` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `studio_condiciones_comerciales` table. All the data in the column will be lost.
  - You are about to drop the column `porcentaje_anticipo` on the `studio_condiciones_comerciales` table. All the data in the column will be lost.
  - You are about to drop the column `porcentaje_descuento` on the `studio_condiciones_comerciales` table. All the data in the column will be lost.
  - You are about to drop the column `clave_autorizacion` on the `studio_configuraciones` table. All the data in the column will be lost.
  - You are about to drop the column `comision_venta` on the `studio_configuraciones` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_configuraciones` table. All the data in the column will be lost.
  - You are about to drop the column `sobreprecio` on the `studio_configuraciones` table. All the data in the column will be lost.
  - You are about to drop the column `utilidad_producto` on the `studio_configuraciones` table. All the data in the column will be lost.
  - You are about to drop the column `utilidad_servicio` on the `studio_configuraciones` table. All the data in the column will be lost.
  - You are about to drop the column `costo` on the `studio_cotizacion_costos` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_cotizacion_costos` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_cotizacion_costos` table. All the data in the column will be lost.
  - You are about to drop the column `posicion` on the `studio_cotizacion_costos` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `studio_cotizacion_costos` table. All the data in the column will be lost.
  - You are about to drop the column `archivada` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `descuento` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `evento_tipo_id` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `precio` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `visible_cliente` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `comentario` on the `studio_evento_bitacoras` table. All the data in the column will be lost.
  - You are about to drop the column `importancia` on the `studio_evento_bitacoras` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_evento_etapas` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `studio_evento_etapas` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `evento_tipo_id` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_evento` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `categoria` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `comprobante_url` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `concepto` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `fecha` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `fechaFactura` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `metodoPago` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `monto` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `numeroFactura` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `proveedor` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `subcategoria` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `usuario_id` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `comision_fija_monto` on the `studio_metodos_pago` table. All the data in the column will be lost.
  - You are about to drop the column `comision_msi_porcentaje` on the `studio_metodos_pago` table. All the data in the column will be lost.
  - You are about to drop the column `comision_porcentaje_base` on the `studio_metodos_pago` table. All the data in the column will be lost.
  - You are about to drop the column `metodo_pago` on the `studio_metodos_pago` table. All the data in the column will be lost.
  - You are about to drop the column `num_msi` on the `studio_metodos_pago` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `studio_metodos_pago` table. All the data in the column will be lost.
  - You are about to drop the column `cantidad_asignada` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `categoria_nombre` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `costo_asignado` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `cotizacion_servicio_id` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `nomina_id` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `seccion_nombre` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `servicio_nombre` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `autorizado_por` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `comision_porcentaje` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `concepto` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `costo_total_snapshot` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `deducciones` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_asignacion` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_autorizacion` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_pago` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `gasto_total_snapshot` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `metodo_pago` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `monto_bruto` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `monto_neto` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `pagado_por` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `periodo_fin` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `periodo_inicio` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `servicios_incluidos` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_pago` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `categoria_transaccion` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `comision_stripe` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `concepto` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `monto` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_transaccion` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `costo` on the `studio_paquetes` table. All the data in the column will be lost.
  - You are about to drop the column `evento_tipo_id` on the `studio_paquetes` table. All the data in the column will be lost.
  - You are about to drop the column `gasto` on the `studio_paquetes` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_paquetes` table. All the data in the column will be lost.
  - You are about to drop the column `posicion` on the `studio_paquetes` table. All the data in the column will be lost.
  - You are about to drop the column `categoria_id` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `cuenta_clabe` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `honorarios_fijos` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `honorarios_variables` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `telefono_emergencia` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_personal_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_personal_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `studio_personal_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `categoria` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `ciclo_vida` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `comision_plataforma` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `comision_studio` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `configuracion` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `precio_publico` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_facturacion` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `activado_en` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `comision_custom` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `configuracion_studio` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `desactivado_en` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `precio_custom` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `studios` table. All the data in the column will be lost.
  - You are about to drop the column `palabras_clave` on the `studios` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `studios` table. All the data in the column will be lost.
  - You are about to drop the `studio_cotizacion_servicios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_cuentas_bancarias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_evento_tipos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_horarios_atencion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_paquete_servicios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_redes_sociales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_reglas_agendamiento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_seccion_categorias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_servicio_categorias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_servicio_gastos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_servicio_secciones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_servicios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_telefonos` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[complete_code]` on the table `platform_agent_discount_codes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `platform_discount_codes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `platform_pipeline_types` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `studio_agenda_tipos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studio_id,name]` on the table `studio_categorias_personal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payroll_id,quote_service_id]` on the table `studio_nomina_servicios` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studio_id,name]` on the table `studio_personal_profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `description` to the `platform_activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `platform_activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agent_id` to the `platform_agent_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `base_code` to the `platform_agent_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `complete_code` to the `platform_agent_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_duration` to the `platform_agent_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_type` to the `platform_agent_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_value` to the `platform_agent_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiration_date` to the `platform_agent_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `platform_agents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `platform_agents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_name` to the `platform_config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `application_type` to the `platform_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `platform_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_type` to the `platform_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_value` to the `platform_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_date` to the `platform_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `platform_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `platform_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_amount` to the `platform_discount_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `platform_lead_bitacora` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `platform_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `platform_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `platform_pipeline_stages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `platform_pipeline_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_agenda_tipos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_categorias_personal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `studio_clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_condiciones_comerciales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `markup` to the `studio_configuraciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_configuraciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_margin` to the `studio_configuraciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sales_commission` to the `studio_configuraciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_margin` to the `studio_configuraciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_cotizacion_costos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_type_id` to the `studio_cotizaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_cotizaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `studio_cotizaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `comment` to the `studio_evento_bitacoras` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_evento_etapas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_date` to the `studio_eventos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `studio_gastos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `studio_gastos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `concept` to the `studio_gastos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `studio_gastos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_method_name` to the `studio_metodos_pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assigned_cost` to the `studio_nomina_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payroll_id` to the `studio_nomina_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_name` to the `studio_nomina_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `concept` to the `studio_nominas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gross_amount` to the `studio_nominas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `net_amount` to the `studio_nominas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `studio_pagos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `concept` to the `studio_pagos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_type_id` to the `studio_paquetes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_paquetes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `studio_personal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_personal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_personal_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billing_type` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform_commission` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `public_price` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studio_commission` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ItemType" AS ENUM ('PRODUCTO', 'SERVICIO');

-- DropForeignKey
ALTER TABLE "public"."gantt_templates" DROP CONSTRAINT "gantt_templates_event_type_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."manager_events" DROP CONSTRAINT "manager_events_event_type_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."marketing_leads" DROP CONSTRAINT "marketing_leads_event_type_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_agent_discount_codes" DROP CONSTRAINT "platform_agent_discount_codes_agente_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" DROP CONSTRAINT "studio_cotizacion_servicios_cotizacion_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" DROP CONSTRAINT "studio_cotizacion_servicios_servicio_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" DROP CONSTRAINT "studio_cotizacion_servicios_servicio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" DROP CONSTRAINT "studio_cotizacion_servicios_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizaciones" DROP CONSTRAINT "studio_cotizaciones_evento_tipo_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cuentas_bancarias" DROP CONSTRAINT "studio_cuentas_bancarias_studio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_evento_tipos" DROP CONSTRAINT "studio_evento_tipos_studio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_eventos" DROP CONSTRAINT "studio_eventos_evento_tipo_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_gastos" DROP CONSTRAINT "studio_gastos_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_horarios_atencion" DROP CONSTRAINT "studio_horarios_atencion_studio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nomina_servicios" DROP CONSTRAINT "studio_nomina_servicios_cotizacion_servicio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nomina_servicios" DROP CONSTRAINT "studio_nomina_servicios_nomina_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nominas" DROP CONSTRAINT "studio_nominas_autorizado_por_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nominas" DROP CONSTRAINT "studio_nominas_pagado_por_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_paquete_servicios" DROP CONSTRAINT "studio_paquete_servicios_paquete_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_paquete_servicios" DROP CONSTRAINT "studio_paquete_servicios_servicio_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_paquete_servicios" DROP CONSTRAINT "studio_paquete_servicios_servicio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_paquetes" DROP CONSTRAINT "studio_paquetes_evento_tipo_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_personal" DROP CONSTRAINT "studio_personal_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_redes_sociales" DROP CONSTRAINT "studio_redes_sociales_plataforma_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_redes_sociales" DROP CONSTRAINT "studio_redes_sociales_studio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_reglas_agendamiento" DROP CONSTRAINT "studio_reglas_agendamiento_studio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_seccion_categorias" DROP CONSTRAINT "studio_seccion_categorias_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_seccion_categorias" DROP CONSTRAINT "studio_seccion_categorias_seccion_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_servicio_gastos" DROP CONSTRAINT "studio_servicio_gastos_servicio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_servicios" DROP CONSTRAINT "studio_servicios_servicio_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_servicios" DROP CONSTRAINT "studio_servicios_studio_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_telefonos" DROP CONSTRAINT "studio_telefonos_studio_id_fkey";

-- DropIndex
DROP INDEX "public"."platform_agent_discount_codes_agente_id_idx";

-- DropIndex
DROP INDEX "public"."platform_agent_discount_codes_codigo_completo_idx";

-- DropIndex
DROP INDEX "public"."platform_agent_discount_codes_codigo_completo_key";

-- DropIndex
DROP INDEX "public"."platform_agent_discount_codes_fecha_expiracion_idx";

-- DropIndex
DROP INDEX "public"."platform_agent_discount_codes_usado_idx";

-- DropIndex
DROP INDEX "public"."platform_agents_activo_idx";

-- DropIndex
DROP INDEX "public"."platform_discount_codes_activo_idx";

-- DropIndex
DROP INDEX "public"."platform_discount_codes_codigo_key";

-- DropIndex
DROP INDEX "public"."platform_discount_codes_fecha_inicio_fecha_fin_idx";

-- DropIndex
DROP INDEX "public"."platform_discount_usage_fecha_uso_idx";

-- DropIndex
DROP INDEX "public"."platform_notifications_tipo_categoria_idx";

-- DropIndex
DROP INDEX "public"."platform_pipeline_stages_orden_idx";

-- DropIndex
DROP INDEX "public"."platform_pipeline_types_activo_idx";

-- DropIndex
DROP INDEX "public"."platform_pipeline_types_nombre_key";

-- DropIndex
DROP INDEX "public"."platform_pipeline_types_orden_idx";

-- DropIndex
DROP INDEX "public"."platform_plans_active_orden_idx";

-- DropIndex
DROP INDEX "public"."platform_services_active_posicion_idx";

-- DropIndex
DROP INDEX "public"."service_categories_active_posicion_idx";

-- DropIndex
DROP INDEX "public"."studio_agenda_fecha_idx";

-- DropIndex
DROP INDEX "public"."studio_agenda_tipos_nombre_key";

-- DropIndex
DROP INDEX "public"."studio_categorias_personal_orden_idx";

-- DropIndex
DROP INDEX "public"."studio_categorias_personal_studio_id_nombre_key";

-- DropIndex
DROP INDEX "public"."studio_clientes_studio_id_telefono_idx";

-- DropIndex
DROP INDEX "public"."studio_evento_etapas_orden_idx";

-- DropIndex
DROP INDEX "public"."studio_eventos_fecha_evento_idx";

-- DropIndex
DROP INDEX "public"."studio_gastos_fecha_categoria_idx";

-- DropIndex
DROP INDEX "public"."studio_nomina_servicios_nomina_id_cotizacion_servicio_id_key";

-- DropIndex
DROP INDEX "public"."studio_nomina_servicios_nomina_id_idx";

-- DropIndex
DROP INDEX "public"."studio_nominas_fecha_asignacion_idx";

-- DropIndex
DROP INDEX "public"."studio_personal_profiles_orden_idx";

-- DropIndex
DROP INDEX "public"."studio_personal_profiles_studio_id_nombre_key";

-- DropIndex
DROP INDEX "public"."studio_revenue_products_categoria_activo_idx";

-- DropIndex
DROP INDEX "public"."studio_studio_revenue_products_studio_id_activo_idx";

-- AlterTable
ALTER TABLE "public"."platform_activities" DROP COLUMN "descripcion",
DROP COLUMN "fecha_proxima_accion",
DROP COLUMN "proxima_accion",
DROP COLUMN "resultado",
DROP COLUMN "tipo",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "next_action" TEXT,
ADD COLUMN     "next_action_date" TIMESTAMP(3),
ADD COLUMN     "result" TEXT,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_agent_discount_codes" DROP COLUMN "activo",
DROP COLUMN "agente_id",
DROP COLUMN "codigo_base",
DROP COLUMN "codigo_completo",
DROP COLUMN "duracion_descuento",
DROP COLUMN "fecha_creacion",
DROP COLUMN "fecha_expiracion",
DROP COLUMN "fecha_uso",
DROP COLUMN "tipo_descuento",
DROP COLUMN "usado",
DROP COLUMN "valor_descuento",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "agent_id" TEXT NOT NULL,
ADD COLUMN     "base_code" TEXT NOT NULL,
ADD COLUMN     "complete_code" TEXT NOT NULL,
ADD COLUMN     "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discount_duration" TEXT NOT NULL,
ADD COLUMN     "discount_type" TEXT NOT NULL,
ADD COLUMN     "discount_value" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "expiration_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usage_date" TIMESTAMP(3),
ADD COLUMN     "used" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."platform_agents" DROP COLUMN "activo",
DROP COLUMN "comisionConversion",
DROP COLUMN "meta_mensual_leads",
DROP COLUMN "nombre",
DROP COLUMN "telefono",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "conversion_commission" DECIMAL(65,30) NOT NULL DEFAULT 0.05,
ADD COLUMN     "monthly_leads_goal" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_config" DROP COLUMN "comercial_telefono",
DROP COLUMN "direccion",
DROP COLUMN "horarios_atencion",
DROP COLUMN "nombre_empresa",
DROP COLUMN "soporte_telefono",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "business_hours" TEXT,
ADD COLUMN     "commercial_phone" TEXT,
ADD COLUMN     "company_name" TEXT NOT NULL,
ADD COLUMN     "support_phone" TEXT;

-- AlterTable
ALTER TABLE "public"."platform_discount_codes" DROP COLUMN "activo",
DROP COLUMN "codigo",
DROP COLUMN "descripcion",
DROP COLUMN "fecha_fin",
DROP COLUMN "fecha_inicio",
DROP COLUMN "nombre",
DROP COLUMN "tipo_aplicacion",
DROP COLUMN "tipo_descuento",
DROP COLUMN "uso_actual",
DROP COLUMN "uso_maximo",
DROP COLUMN "valor_descuento",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "application_type" TEXT NOT NULL,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "current_usage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discount_type" TEXT NOT NULL,
ADD COLUMN     "discount_value" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "end_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "max_usage" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_discount_usage" DROP COLUMN "fecha_uso",
DROP COLUMN "monto_descuento",
ADD COLUMN     "discount_amount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "usage_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."platform_lead_bitacora" DROP COLUMN "descripcion",
ADD COLUMN     "description" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_notifications" DROP COLUMN "categoria",
DROP COLUMN "mensaje",
DROP COLUMN "tipo",
DROP COLUMN "titulo",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'info';

-- AlterTable
ALTER TABLE "public"."platform_pipeline_stages" DROP COLUMN "descripcion",
DROP COLUMN "nombre",
DROP COLUMN "orden",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."platform_pipeline_types" DROP COLUMN "activo",
DROP COLUMN "descripcion",
DROP COLUMN "nombre",
DROP COLUMN "orden",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."platform_plans" DROP COLUMN "orden",
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."platform_services" DROP COLUMN "posicion",
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."service_categories" DROP COLUMN "posicion",
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."studio_agenda" DROP COLUMN "concepto",
DROP COLUMN "descripcion",
DROP COLUMN "direccion",
DROP COLUMN "fecha",
DROP COLUMN "hora",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "concept" TEXT,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "time" TEXT;

-- AlterTable
ALTER TABLE "public"."studio_agenda_tipos" DROP COLUMN "nombre",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_categorias_personal" DROP COLUMN "descripcion",
DROP COLUMN "nombre",
DROP COLUMN "orden",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."studio_clientes" DROP COLUMN "direccion",
DROP COLUMN "nombre",
DROP COLUMN "telefono",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_condiciones_comerciales" DROP COLUMN "descripcion",
DROP COLUMN "nombre",
DROP COLUMN "orden",
DROP COLUMN "porcentaje_anticipo",
DROP COLUMN "porcentaje_descuento",
ADD COLUMN     "advance_percentage" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discount_percentage" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."studio_configuraciones" DROP COLUMN "clave_autorizacion",
DROP COLUMN "comision_venta",
DROP COLUMN "nombre",
DROP COLUMN "sobreprecio",
DROP COLUMN "utilidad_producto",
DROP COLUMN "utilidad_servicio",
ADD COLUMN     "authorization_key" TEXT,
ADD COLUMN     "markup" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "product_margin" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sales_commission" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "service_margin" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_cotizacion_costos" DROP COLUMN "costo",
DROP COLUMN "descripcion",
DROP COLUMN "nombre",
DROP COLUMN "posicion",
DROP COLUMN "tipo",
ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'adicional';

-- AlterTable
ALTER TABLE "public"."studio_cotizaciones" DROP COLUMN "archivada",
DROP COLUMN "descripcion",
DROP COLUMN "descuento",
DROP COLUMN "evento_tipo_id",
DROP COLUMN "nombre",
DROP COLUMN "precio",
DROP COLUMN "visible_cliente",
ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discount" DOUBLE PRECISION,
ADD COLUMN     "event_type_id" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "visible_to_client" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "public"."studio_evento_bitacoras" DROP COLUMN "comentario",
DROP COLUMN "importancia",
ADD COLUMN     "comment" TEXT NOT NULL,
ADD COLUMN     "importance" TEXT NOT NULL DEFAULT '1';

-- AlterTable
ALTER TABLE "public"."studio_evento_etapas" DROP COLUMN "nombre",
DROP COLUMN "orden",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."studio_eventos" DROP COLUMN "direccion",
DROP COLUMN "evento_tipo_id",
DROP COLUMN "fecha_evento",
DROP COLUMN "nombre",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "event_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "event_type_id" TEXT,
ADD COLUMN     "name" TEXT DEFAULT 'Pendiente';

-- AlterTable
ALTER TABLE "public"."studio_gastos" DROP COLUMN "categoria",
DROP COLUMN "comprobante_url",
DROP COLUMN "concepto",
DROP COLUMN "descripcion",
DROP COLUMN "fecha",
DROP COLUMN "fechaFactura",
DROP COLUMN "metodoPago",
DROP COLUMN "monto",
DROP COLUMN "numeroFactura",
DROP COLUMN "proveedor",
DROP COLUMN "subcategoria",
DROP COLUMN "usuario_id",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "concept" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "invoice_date" TIMESTAMP(3),
ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "receipt_url" TEXT,
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_metodos_pago" DROP COLUMN "comision_fija_monto",
DROP COLUMN "comision_msi_porcentaje",
DROP COLUMN "comision_porcentaje_base",
DROP COLUMN "metodo_pago",
DROP COLUMN "num_msi",
DROP COLUMN "orden",
ADD COLUMN     "base_commission_percentage" DOUBLE PRECISION,
ADD COLUMN     "fixed_commission_amount" DOUBLE PRECISION,
ADD COLUMN     "msi_commission_percentage" DOUBLE PRECISION,
ADD COLUMN     "msi_installments" INTEGER,
ADD COLUMN     "order" INTEGER DEFAULT 0,
ADD COLUMN     "payment_method_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_nomina_servicios" DROP COLUMN "cantidad_asignada",
DROP COLUMN "categoria_nombre",
DROP COLUMN "costo_asignado",
DROP COLUMN "cotizacion_servicio_id",
DROP COLUMN "nomina_id",
DROP COLUMN "seccion_nombre",
DROP COLUMN "servicio_nombre",
ADD COLUMN     "assigned_cost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "assigned_quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "category_name" TEXT,
ADD COLUMN     "payroll_id" TEXT NOT NULL,
ADD COLUMN     "quote_service_id" TEXT,
ADD COLUMN     "section_name" TEXT,
ADD COLUMN     "service_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_nominas" DROP COLUMN "autorizado_por",
DROP COLUMN "comision_porcentaje",
DROP COLUMN "concepto",
DROP COLUMN "costo_total_snapshot",
DROP COLUMN "deducciones",
DROP COLUMN "descripcion",
DROP COLUMN "fecha_asignacion",
DROP COLUMN "fecha_autorizacion",
DROP COLUMN "fecha_pago",
DROP COLUMN "gasto_total_snapshot",
DROP COLUMN "metodo_pago",
DROP COLUMN "monto_bruto",
DROP COLUMN "monto_neto",
DROP COLUMN "pagado_por",
DROP COLUMN "periodo_fin",
DROP COLUMN "periodo_inicio",
DROP COLUMN "servicios_incluidos",
DROP COLUMN "tipo_pago",
ADD COLUMN     "assignment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "authorization_date" TIMESTAMP(3),
ADD COLUMN     "authorized_by" TEXT,
ADD COLUMN     "commission_percentage" DOUBLE PRECISION,
ADD COLUMN     "concept" TEXT NOT NULL,
ADD COLUMN     "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "end_period" TIMESTAMP(3),
ADD COLUMN     "expense_total_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "gross_amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "net_amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "paid_by" TEXT,
ADD COLUMN     "payment_date" TIMESTAMP(3),
ADD COLUMN     "payment_method" TEXT DEFAULT 'transferencia',
ADD COLUMN     "payment_type" TEXT NOT NULL DEFAULT 'individual',
ADD COLUMN     "services_included" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "start_period" TIMESTAMP(3),
ADD COLUMN     "total_cost_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."studio_pagos" DROP COLUMN "categoria_transaccion",
DROP COLUMN "comision_stripe",
DROP COLUMN "concepto",
DROP COLUMN "descripcion",
DROP COLUMN "monto",
DROP COLUMN "tipo_transaccion",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "concept" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "stripe_commission" DOUBLE PRECISION,
ADD COLUMN     "transaction_category" TEXT DEFAULT 'abono',
ADD COLUMN     "transaction_type" TEXT DEFAULT 'ingreso';

-- AlterTable
ALTER TABLE "public"."studio_paquetes" DROP COLUMN "costo",
DROP COLUMN "evento_tipo_id",
DROP COLUMN "gasto",
DROP COLUMN "nombre",
DROP COLUMN "posicion",
ADD COLUMN     "cost" DOUBLE PRECISION,
ADD COLUMN     "event_type_id" TEXT NOT NULL,
ADD COLUMN     "expense" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."studio_personal" DROP COLUMN "categoria_id",
DROP COLUMN "cuenta_clabe",
DROP COLUMN "honorarios_fijos",
DROP COLUMN "honorarios_variables",
DROP COLUMN "nombre",
DROP COLUMN "orden",
DROP COLUMN "telefono",
DROP COLUMN "telefono_emergencia",
ADD COLUMN     "category_id" TEXT NOT NULL,
ADD COLUMN     "clabe_account" TEXT,
ADD COLUMN     "emergency_phone" TEXT,
ADD COLUMN     "fixed_salary" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "variable_salary" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."studio_personal_profiles" DROP COLUMN "descripcion",
DROP COLUMN "nombre",
DROP COLUMN "orden",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."studio_revenue_products" DROP COLUMN "activo",
DROP COLUMN "categoria",
DROP COLUMN "ciclo_vida",
DROP COLUMN "comision_plataforma",
DROP COLUMN "comision_studio",
DROP COLUMN "configuracion",
DROP COLUMN "descripcion",
DROP COLUMN "nombre",
DROP COLUMN "precio_publico",
DROP COLUMN "tipo_facturacion",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "billing_type" TEXT NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "configuration" JSONB,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "lifecycle" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "platform_commission" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "public_price" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "studio_commission" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_studio_revenue_products" DROP COLUMN "activado_en",
DROP COLUMN "activo",
DROP COLUMN "comision_custom",
DROP COLUMN "configuracion_studio",
DROP COLUMN "desactivado_en",
DROP COLUMN "precio_custom",
ADD COLUMN     "activated_at" TIMESTAMP(3),
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "custom_commission" DECIMAL(65,30),
ADD COLUMN     "custom_price" DECIMAL(65,30),
ADD COLUMN     "deactivated_at" TIMESTAMP(3),
ADD COLUMN     "studio_configuration" JSONB;

-- AlterTable
ALTER TABLE "public"."studios" DROP COLUMN "descripcion",
DROP COLUMN "palabras_clave",
DROP COLUMN "phone",
ADD COLUMN     "account_holder" TEXT,
ADD COLUMN     "account_number" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "clabe_number" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "keywords" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "maps_url" TEXT,
ADD COLUMN     "place_id" TEXT;

-- DropTable
DROP TABLE "public"."studio_cotizacion_servicios";

-- DropTable
DROP TABLE "public"."studio_cuentas_bancarias";

-- DropTable
DROP TABLE "public"."studio_evento_tipos";

-- DropTable
DROP TABLE "public"."studio_horarios_atencion";

-- DropTable
DROP TABLE "public"."studio_paquete_servicios";

-- DropTable
DROP TABLE "public"."studio_redes_sociales";

-- DropTable
DROP TABLE "public"."studio_reglas_agendamiento";

-- DropTable
DROP TABLE "public"."studio_seccion_categorias";

-- DropTable
DROP TABLE "public"."studio_servicio_categorias";

-- DropTable
DROP TABLE "public"."studio_servicio_gastos";

-- DropTable
DROP TABLE "public"."studio_servicio_secciones";

-- DropTable
DROP TABLE "public"."studio_servicios";

-- DropTable
DROP TABLE "public"."studio_telefonos";

-- CreateTable
CREATE TABLE "public"."studio_phones" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_business_hours" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_social_networks" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "platform_id" TEXT,
    "url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_social_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_scheduling_rules" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "recurrence" TEXT NOT NULL,
    "operational_capacity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_scheduling_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_event_types" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_items" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "service_category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ItemType" NOT NULL DEFAULT 'SERVICIO',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utility_type" TEXT NOT NULL DEFAULT 'service',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_service_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_service_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_section_categories" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "studio_section_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_service_expenses" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_service_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_paquete_items" (
    "id" TEXT NOT NULL,
    "paquete_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "service_category_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible_to_client" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_paquete_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_cotizacion_items" (
    "id" TEXT NOT NULL,
    "cotizacion_id" TEXT NOT NULL,
    "item_id" TEXT,
    "service_category_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT,
    "assignment_date" TIMESTAMP(3),
    "delivery_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "seccion_name_snapshot" TEXT,
    "category_name_snapshot" TEXT,
    "name_snapshot" TEXT NOT NULL DEFAULT 'Servicio migrado',
    "description_snapshot" TEXT,
    "unit_price_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expense_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "public_price_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit_type_snapshot" TEXT NOT NULL DEFAULT 'servicio',
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "name" TEXT,
    "description" TEXT,
    "cost" DOUBLE PRECISION DEFAULT 0,
    "expense" DOUBLE PRECISION DEFAULT 0,
    "profit" DOUBLE PRECISION DEFAULT 0,
    "public_price" DOUBLE PRECISION DEFAULT 0,
    "profit_type" TEXT DEFAULT 'servicio',
    "category_name" TEXT,
    "seccion_name" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "original_service_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_cotizacion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_security_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "device_alerts" BOOLEAN NOT NULL DEFAULT true,
    "session_timeout" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_security_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_access_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_phones_studio_id_idx" ON "public"."studio_phones"("studio_id");

-- CreateIndex
CREATE INDEX "studio_phones_studio_id_is_active_idx" ON "public"."studio_phones"("studio_id", "is_active");

-- CreateIndex
CREATE INDEX "studio_phones_studio_id_type_idx" ON "public"."studio_phones"("studio_id", "type");

-- CreateIndex
CREATE INDEX "studio_business_hours_studio_id_idx" ON "public"."studio_business_hours"("studio_id");

-- CreateIndex
CREATE INDEX "studio_business_hours_studio_id_day_of_week_idx" ON "public"."studio_business_hours"("studio_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "studio_business_hours_studio_id_day_of_week_key" ON "public"."studio_business_hours"("studio_id", "day_of_week");

-- CreateIndex
CREATE INDEX "studio_social_networks_studio_id_idx" ON "public"."studio_social_networks"("studio_id");

-- CreateIndex
CREATE INDEX "studio_social_networks_platform_id_idx" ON "public"."studio_social_networks"("platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_social_networks_studio_id_platform_id_key" ON "public"."studio_social_networks"("studio_id", "platform_id");

-- CreateIndex
CREATE INDEX "studio_scheduling_rules_studio_id_idx" ON "public"."studio_scheduling_rules"("studio_id");

-- CreateIndex
CREATE INDEX "studio_scheduling_rules_status_idx" ON "public"."studio_scheduling_rules"("status");

-- CreateIndex
CREATE INDEX "studio_scheduling_rules_order_idx" ON "public"."studio_scheduling_rules"("order");

-- CreateIndex
CREATE INDEX "studio_event_types_studio_id_idx" ON "public"."studio_event_types"("studio_id");

-- CreateIndex
CREATE INDEX "studio_event_types_studio_id_status_idx" ON "public"."studio_event_types"("studio_id", "status");

-- CreateIndex
CREATE INDEX "studio_items_studio_id_status_idx" ON "public"."studio_items"("studio_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "studio_service_categories_name_key" ON "public"."studio_service_categories"("name");

-- CreateIndex
CREATE INDEX "studio_service_categories_name_idx" ON "public"."studio_service_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "studio_service_sections_name_key" ON "public"."studio_service_sections"("name");

-- CreateIndex
CREATE INDEX "studio_service_sections_name_idx" ON "public"."studio_service_sections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "studio_section_categories_category_id_key" ON "public"."studio_section_categories"("category_id");

-- CreateIndex
CREATE INDEX "studio_paquete_items_paquete_id_idx" ON "public"."studio_paquete_items"("paquete_id");

-- CreateIndex
CREATE INDEX "studio_cotizacion_items_cotizacion_id_idx" ON "public"."studio_cotizacion_items"("cotizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_security_settings_user_id_key" ON "public"."user_security_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_security_settings_user_id_idx" ON "public"."user_security_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_access_logs_user_id_idx" ON "public"."user_access_logs"("user_id");

-- CreateIndex
CREATE INDEX "user_access_logs_action_idx" ON "public"."user_access_logs"("action");

-- CreateIndex
CREATE INDEX "user_access_logs_created_at_idx" ON "public"."user_access_logs"("created_at");

-- CreateIndex
CREATE INDEX "user_access_logs_success_idx" ON "public"."user_access_logs"("success");

-- CreateIndex
CREATE UNIQUE INDEX "platform_agent_discount_codes_complete_code_key" ON "public"."platform_agent_discount_codes"("complete_code");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_agent_id_idx" ON "public"."platform_agent_discount_codes"("agent_id");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_complete_code_idx" ON "public"."platform_agent_discount_codes"("complete_code");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_used_idx" ON "public"."platform_agent_discount_codes"("used");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_expiration_date_idx" ON "public"."platform_agent_discount_codes"("expiration_date");

-- CreateIndex
CREATE INDEX "platform_agents_active_idx" ON "public"."platform_agents"("active");

-- CreateIndex
CREATE UNIQUE INDEX "platform_discount_codes_code_key" ON "public"."platform_discount_codes"("code");

-- CreateIndex
CREATE INDEX "platform_discount_codes_active_idx" ON "public"."platform_discount_codes"("active");

-- CreateIndex
CREATE INDEX "platform_discount_codes_start_date_end_date_idx" ON "public"."platform_discount_codes"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "platform_discount_usage_usage_date_idx" ON "public"."platform_discount_usage"("usage_date");

-- CreateIndex
CREATE INDEX "platform_notifications_type_category_idx" ON "public"."platform_notifications"("type", "category");

-- CreateIndex
CREATE INDEX "platform_pipeline_stages_order_idx" ON "public"."platform_pipeline_stages"("order");

-- CreateIndex
CREATE UNIQUE INDEX "platform_pipeline_types_name_key" ON "public"."platform_pipeline_types"("name");

-- CreateIndex
CREATE INDEX "platform_pipeline_types_active_idx" ON "public"."platform_pipeline_types"("active");

-- CreateIndex
CREATE INDEX "platform_pipeline_types_order_idx" ON "public"."platform_pipeline_types"("order");

-- CreateIndex
CREATE INDEX "platform_plans_active_order_idx" ON "public"."platform_plans"("active", "order");

-- CreateIndex
CREATE INDEX "platform_services_active_position_idx" ON "public"."platform_services"("active", "position");

-- CreateIndex
CREATE INDEX "service_categories_active_position_idx" ON "public"."service_categories"("active", "position");

-- CreateIndex
CREATE INDEX "studio_agenda_date_idx" ON "public"."studio_agenda"("date");

-- CreateIndex
CREATE UNIQUE INDEX "studio_agenda_tipos_name_key" ON "public"."studio_agenda_tipos"("name");

-- CreateIndex
CREATE INDEX "studio_categorias_personal_order_idx" ON "public"."studio_categorias_personal"("order");

-- CreateIndex
CREATE UNIQUE INDEX "studio_categorias_personal_studio_id_name_key" ON "public"."studio_categorias_personal"("studio_id", "name");

-- CreateIndex
CREATE INDEX "studio_clientes_studio_id_phone_idx" ON "public"."studio_clientes"("studio_id", "phone");

-- CreateIndex
CREATE INDEX "studio_evento_etapas_order_idx" ON "public"."studio_evento_etapas"("order");

-- CreateIndex
CREATE INDEX "studio_eventos_event_date_idx" ON "public"."studio_eventos"("event_date");

-- CreateIndex
CREATE INDEX "studio_gastos_date_category_idx" ON "public"."studio_gastos"("date", "category");

-- CreateIndex
CREATE INDEX "studio_nomina_servicios_payroll_id_idx" ON "public"."studio_nomina_servicios"("payroll_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_nomina_servicios_payroll_id_quote_service_id_key" ON "public"."studio_nomina_servicios"("payroll_id", "quote_service_id");

-- CreateIndex
CREATE INDEX "studio_nominas_assignment_date_idx" ON "public"."studio_nominas"("assignment_date");

-- CreateIndex
CREATE INDEX "studio_personal_profiles_order_idx" ON "public"."studio_personal_profiles"("order");

-- CreateIndex
CREATE UNIQUE INDEX "studio_personal_profiles_studio_id_name_key" ON "public"."studio_personal_profiles"("studio_id", "name");

-- CreateIndex
CREATE INDEX "studio_revenue_products_category_active_idx" ON "public"."studio_revenue_products"("category", "active");

-- CreateIndex
CREATE INDEX "studio_studio_revenue_products_studio_id_active_idx" ON "public"."studio_studio_revenue_products"("studio_id", "active");

-- AddForeignKey
ALTER TABLE "public"."platform_agent_discount_codes" ADD CONSTRAINT "platform_agent_discount_codes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."platform_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_phones" ADD CONSTRAINT "studio_phones_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_business_hours" ADD CONSTRAINT "studio_business_hours_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_social_networks" ADD CONSTRAINT "studio_social_networks_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."platform_social_networks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_social_networks" ADD CONSTRAINT "studio_social_networks_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_scheduling_rules" ADD CONSTRAINT "studio_scheduling_rules_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_event_types" ADD CONSTRAINT "studio_event_types_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_items" ADD CONSTRAINT "studio_items_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_items" ADD CONSTRAINT "studio_items_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "public"."studio_service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_section_categories" ADD CONSTRAINT "studio_section_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."studio_service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_section_categories" ADD CONSTRAINT "studio_section_categories_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."studio_service_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_service_expenses" ADD CONSTRAINT "studio_service_expenses_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."studio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquetes" ADD CONSTRAINT "studio_paquetes_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_items" ADD CONSTRAINT "studio_paquete_items_paquete_id_fkey" FOREIGN KEY ("paquete_id") REFERENCES "public"."studio_paquetes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_items" ADD CONSTRAINT "studio_paquete_items_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "public"."studio_service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_items" ADD CONSTRAINT "studio_paquete_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."studio_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal" ADD CONSTRAINT "studio_personal_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."studio_categorias_personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizaciones" ADD CONSTRAINT "studio_cotizaciones_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_items" ADD CONSTRAINT "studio_cotizacion_items_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_items" ADD CONSTRAINT "studio_cotizacion_items_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "public"."studio_service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_items" ADD CONSTRAINT "studio_cotizacion_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."studio_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_items" ADD CONSTRAINT "studio_cotizacion_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_authorized_by_fkey" FOREIGN KEY ("authorized_by") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nomina_servicios" ADD CONSTRAINT "studio_nomina_servicios_quote_service_id_fkey" FOREIGN KEY ("quote_service_id") REFERENCES "public"."studio_cotizacion_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nomina_servicios" ADD CONSTRAINT "studio_nomina_servicios_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "public"."studio_nominas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_gastos" ADD CONSTRAINT "studio_gastos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_leads" ADD CONSTRAINT "marketing_leads_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_events" ADD CONSTRAINT "manager_events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_templates" ADD CONSTRAINT "gantt_templates_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_security_settings" ADD CONSTRAINT "user_security_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_access_logs" ADD CONSTRAINT "user_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
