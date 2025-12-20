/*
  Warnings:

  - You are about to drop the column `createdAt` on the `plan_services` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `plan_services` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_acquisition_channels` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `platform_acquisition_channels` table. All the data in the column will be lost.
  - You are about to drop the column `isVisible` on the `platform_acquisition_channels` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_acquisition_channels` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `fechaProximaAccion` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `proximaAccion` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `platform_activities` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_advertising_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `platform_advertising_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_advertising_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_agents` table. All the data in the column will be lost.
  - You are about to drop the column `metaMensualLeads` on the `platform_agents` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_agents` table. All the data in the column will be lost.
  - You are about to drop the column `actualSpend` on the `platform_campaign_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `platform_campaign_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_campaign_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `platformId` on the `platform_campaign_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_campaign_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `actualSpend` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `leadsGenerated` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `leadsSubscribed` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `totalBudget` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_lead_bitacora` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `platform_lead_bitacora` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_lead_bitacora` table. All the data in the column will be lost.
  - You are about to drop the column `usuarioId` on the `platform_lead_bitacora` table. All the data in the column will be lost.
  - You are about to drop the column `acquisitionChannelId` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `agentConversionId` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `agentId` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `conversionDate` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `conversionMethod` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `firstInteractionDate` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `interactionCount` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `interestedPlan` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `lastContactDate` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `leadType` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `originalSource` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `probableStartDate` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `stageId` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `studioName` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `studioSlug` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `agentId` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledFor` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `platform_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_pipeline_stages` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `platform_pipeline_stages` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_pipeline_stages` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_pipeline_types` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_pipeline_types` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_plans` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_plans` table. All the data in the column will be lost.
  - You are about to drop the column `baseUrl` on the `platform_social_networks` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_social_networks` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `platform_social_networks` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_social_networks` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `platform_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `platform_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `platform_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `platform_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `setup_progress_log` table. All the data in the column will be lost.
  - You are about to drop the column `newStatus` on the `setup_progress_log` table. All the data in the column will be lost.
  - You are about to drop the column `oldStatus` on the `setup_progress_log` table. All the data in the column will be lost.
  - You are about to drop the column `sectionId` on the `setup_progress_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `setup_section_config` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `setup_section_config` table. All the data in the column will be lost.
  - You are about to drop the column `optionalFields` on the `setup_section_config` table. All the data in the column will be lost.
  - You are about to drop the column `requiredFields` on the `setup_section_config` table. All the data in the column will be lost.
  - You are about to drop the column `sectionId` on the `setup_section_config` table. All the data in the column will be lost.
  - You are about to drop the column `sectionName` on the `setup_section_config` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `setup_section_config` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `setup_section_progress` table. All the data in the column will be lost.
  - You are about to drop the column `completedFields` on the `setup_section_progress` table. All the data in the column will be lost.
  - You are about to drop the column `completionPercentage` on the `setup_section_progress` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdatedAt` on the `setup_section_progress` table. All the data in the column will be lost.
  - You are about to drop the column `missingFields` on the `setup_section_progress` table. All the data in the column will be lost.
  - You are about to drop the column `sectionId` on the `setup_section_progress` table. All the data in the column will be lost.
  - You are about to drop the column `sectionName` on the `setup_section_progress` table. All the data in the column will be lost.
  - You are about to drop the column `setupStatusId` on the `setup_section_progress` table. All the data in the column will be lost.
  - You are about to drop the column `agendaTipo` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `eventoId` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `googleMapsUrl` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `studio_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_categorias_personal` table. All the data in the column will be lost.
  - You are about to drop the column `esDefault` on the `studio_categorias_personal` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_categorias_personal` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_clientes` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `studio_clientes` table. All the data in the column will be lost.
  - You are about to drop the column `lastLogin` on the `studio_clientes` table. All the data in the column will be lost.
  - You are about to drop the column `platformUserId` on the `studio_clientes` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_clientes` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_condiciones_comerciales` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_condiciones_comerciales` table. All the data in the column will be lost.
  - You are about to drop the column `condicionesComercialesId` on the `studio_condiciones_comerciales_metodo_pago` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_condiciones_comerciales_metodo_pago` table. All the data in the column will be lost.
  - You are about to drop the column `metodoPagoId` on the `studio_condiciones_comerciales_metodo_pago` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_condiciones_comerciales_metodo_pago` table. All the data in the column will be lost.
  - You are about to drop the column `cotizacionId` on the `studio_cotizacion_costos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_cotizacion_costos` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_cotizacion_costos` table. All the data in the column will be lost.
  - You are about to drop the column `cotizacionId` on the `studio_cotizacion_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_cotizacion_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `fechaAsignacion` on the `studio_cotizacion_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `precioUnitario` on the `studio_cotizacion_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `servicioCategoriaId` on the `studio_cotizacion_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `servicioId` on the `studio_cotizacion_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_cotizacion_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `studio_cotizacion_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `cotizacionId` on the `studio_cotizacion_visitas` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_cotizacion_visitas` table. All the data in the column will be lost.
  - You are about to drop the column `condicionesComercialesId` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `condicionesComercialesMetodoPagoId` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `eventoId` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `eventoTipoId` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_cotizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_cuentas_bancarias` table. All the data in the column will be lost.
  - You are about to drop the column `esPrincipal` on the `studio_cuentas_bancarias` table. All the data in the column will be lost.
  - You are about to drop the column `numeroCuenta` on the `studio_cuentas_bancarias` table. All the data in the column will be lost.
  - You are about to drop the column `tipoCuenta` on the `studio_cuentas_bancarias` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_cuentas_bancarias` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_evento_bitacoras` table. All the data in the column will be lost.
  - You are about to drop the column `eventoId` on the `studio_evento_bitacoras` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_evento_bitacoras` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_evento_etapas` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_evento_etapas` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_evento_tipos` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_evento_tipos` table. All the data in the column will be lost.
  - You are about to drop the column `clienteId` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `eventoEtapaId` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `eventoTipoId` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `studio_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `comprobanteUrl` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `eventoId` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `usuarioId` on the `studio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_horarios_atencion` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_horarios_atencion` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_metodos_pago` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_metodos_pago` table. All the data in the column will be lost.
  - You are about to drop the column `cotizacionServicioId` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `nominaId` on the `studio_nomina_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `eventoId` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `personalId` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `studio_nominas` table. All the data in the column will be lost.
  - You are about to drop the column `clienteId` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `comisionStripe` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `condicionesComercialesId` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `condicionesComercialesMetodoPagoId` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `cotizacionId` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `metodoPagoId` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `studio_pagos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_paquete_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `paqueteId` on the `studio_paquete_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `servicioCategoriaId` on the `studio_paquete_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `servicioId` on the `studio_paquete_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_paquete_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_paquetes` table. All the data in the column will be lost.
  - You are about to drop the column `eventoTipoId` on the `studio_paquetes` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_paquetes` table. All the data in the column will be lost.
  - You are about to drop the column `categoriaId` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `platformUserId` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_personal` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_personal_profile_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `personalId` on the `studio_personal_profile_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `studio_personal_profile_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_personal_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `studio_personal_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_personal_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_redes_sociales` table. All the data in the column will be lost.
  - You are about to drop the column `plataformaId` on the `studio_redes_sociales` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_redes_sociales` table. All the data in the column will be lost.
  - You are about to drop the column `capacidadOperativa` on the `studio_reglas_agendamiento` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_reglas_agendamiento` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_reglas_agendamiento` table. All the data in the column will be lost.
  - You are about to drop the column `cicloVida` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `comisionProsocial` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `comisionStudio` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `precioPublico` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `tipoFacturacion` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `categoriaId` on the `studio_seccion_categorias` table. All the data in the column will be lost.
  - You are about to drop the column `seccionId` on the `studio_seccion_categorias` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_servicio_categorias` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_servicio_categorias` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_servicio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `servicioId` on the `studio_servicio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_servicio_gastos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_servicio_secciones` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_servicio_secciones` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `servicioCategoriaId` on the `studio_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `studio_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_servicios` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_setup_status` table. All the data in the column will be lost.
  - You are about to drop the column `isFullyConfigured` on the `studio_setup_status` table. All the data in the column will be lost.
  - You are about to drop the column `lastValidatedAt` on the `studio_setup_status` table. All the data in the column will be lost.
  - You are about to drop the column `overallProgress` on the `studio_setup_status` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_setup_status` table. All the data in the column will be lost.
  - You are about to drop the column `activadoEn` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `comisionCustom` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `configuracionStudio` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `desactivadoEn` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `precioCustom` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `revenueProductId` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_studio_revenue_products` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_telefonos` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_telefonos` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `studio_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `studio_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `studio_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `studio_users` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `studio_users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `studio_users` table. All the data in the column will be lost.
  - You are about to drop the column `platformUserId` on the `studio_users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `studio_users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[campaign_id,platform_id]` on the table `platform_campaign_platforms` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studio_id]` on the table `platform_leads` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[section_id]` on the table `setup_section_config` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[setup_status_id,section_id]` on the table `setup_section_progress` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nomina_id,cotizacion_servicio_id]` on the table `studio_nomina_servicios` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[personal_id,profile_id]` on the table `studio_personal_profile_assignments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studio_id,plataforma_id]` on the table `studio_redes_sociales` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[categoria_id]` on the table `studio_seccion_categorias` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studio_id,revenue_product_id]` on the table `studio_studio_revenue_products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `plan_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_acquisition_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lead_id` to the `platform_activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_advertising_platforms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_agents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `campaign_id` to the `platform_campaign_platforms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform_id` to the `platform_campaign_platforms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_campaign_platforms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_date` to the `platform_campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `platform_campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_budget` to the `platform_campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lead_id` to the `platform_lead_bitacora` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_lead_bitacora` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_leads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `platform_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_pipeline_stages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_pipeline_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_social_networks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `platform_user_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `optional_fields` to the `setup_section_config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `required_fields` to the `setup_section_config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `section_id` to the `setup_section_config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `section_name` to the `setup_section_config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `setup_section_config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `completed_fields` to the `setup_section_progress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `missing_fields` to the `setup_section_progress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `section_id` to the `setup_section_progress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `section_name` to the `setup_section_progress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `setup_status_id` to the `setup_section_progress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evento_id` to the `studio_agenda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_agenda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_categorias_personal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_condiciones_comerciales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `condiciones_comerciales_id` to the `studio_condiciones_comerciales_metodo_pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metodo_pago_id` to the `studio_condiciones_comerciales_metodo_pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_condiciones_comerciales_metodo_pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cotizacion_id` to the `studio_cotizacion_costos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_cotizacion_costos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cotizacion_id` to the `studio_cotizacion_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_cotizacion_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cotizacion_id` to the `studio_cotizacion_visitas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evento_id` to the `studio_cotizaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evento_tipo_id` to the `studio_cotizaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_cotizaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numero_cuenta` to the `studio_cuentas_bancarias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo_cuenta` to the `studio_cuentas_bancarias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_cuentas_bancarias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evento_id` to the `studio_evento_bitacoras` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_evento_bitacoras` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_evento_etapas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_evento_tipos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cliente_id` to the `studio_eventos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_eventos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_gastos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuario_id` to the `studio_gastos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_horarios_atencion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_metodos_pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomina_id` to the `studio_nomina_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_nominas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `studio_nominas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_pagos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paquete_id` to the `studio_paquete_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `servicio_categoria_id` to the `studio_paquete_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `servicio_id` to the `studio_paquete_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_paquete_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evento_tipo_id` to the `studio_paquetes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_paquetes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoria_id` to the `studio_personal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_personal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personal_id` to the `studio_personal_profile_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `studio_personal_profile_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_personal_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_redes_sociales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_reglas_agendamiento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `comision_plataforma` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `comision_studio` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precio_publico` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo_facturacion` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoria_id` to the `studio_seccion_categorias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seccion_id` to the `studio_seccion_categorias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_servicio_categorias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `servicio_id` to the `studio_servicio_gastos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_servicio_gastos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_servicio_secciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `servicio_categoria_id` to the `studio_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studio_id` to the `studio_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_servicios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_setup_status` table without a default value. This is not possible if the table is not empty.
  - Added the required column `revenue_product_id` to the `studio_studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_studio_revenue_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_telefonos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_user_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_name` to the `studio_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `studio_users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."platform_activities" DROP CONSTRAINT "platform_activities_leadId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_activities" DROP CONSTRAINT "platform_activities_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_campaign_platforms" DROP CONSTRAINT "platform_campaign_platforms_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_campaign_platforms" DROP CONSTRAINT "platform_campaign_platforms_platformId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_lead_bitacora" DROP CONSTRAINT "platform_lead_bitacora_leadId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_lead_bitacora" DROP CONSTRAINT "platform_lead_bitacora_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_leads" DROP CONSTRAINT "platform_leads_acquisitionChannelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_leads" DROP CONSTRAINT "platform_leads_agentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_leads" DROP CONSTRAINT "platform_leads_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_leads" DROP CONSTRAINT "platform_leads_stageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_leads" DROP CONSTRAINT "platform_leads_studioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_notifications" DROP CONSTRAINT "platform_notifications_agentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_notifications" DROP CONSTRAINT "platform_notifications_leadId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_notifications" DROP CONSTRAINT "platform_notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."setup_section_progress" DROP CONSTRAINT "setup_section_progress_setupStatusId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_agenda" DROP CONSTRAINT "studio_agenda_eventoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_agenda" DROP CONSTRAINT "studio_agenda_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_clientes" DROP CONSTRAINT "studio_clientes_platformUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_condiciones_comerciales_metodo_pago" DROP CONSTRAINT "studio_condiciones_comerciales_metodo_pago_condicionesCome_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_condiciones_comerciales_metodo_pago" DROP CONSTRAINT "studio_condiciones_comerciales_metodo_pago_metodoPagoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_costos" DROP CONSTRAINT "studio_cotizacion_costos_cotizacionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" DROP CONSTRAINT "studio_cotizacion_servicios_cotizacionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" DROP CONSTRAINT "studio_cotizacion_servicios_servicioCategoriaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" DROP CONSTRAINT "studio_cotizacion_servicios_servicioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" DROP CONSTRAINT "studio_cotizacion_servicios_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizacion_visitas" DROP CONSTRAINT "studio_cotizacion_visitas_cotizacionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizaciones" DROP CONSTRAINT "studio_cotizaciones_condicionesComercialesId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizaciones" DROP CONSTRAINT "studio_cotizaciones_eventoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_cotizaciones" DROP CONSTRAINT "studio_cotizaciones_eventoTipoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_evento_bitacoras" DROP CONSTRAINT "studio_evento_bitacoras_eventoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_eventos" DROP CONSTRAINT "studio_eventos_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_eventos" DROP CONSTRAINT "studio_eventos_eventoEtapaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_eventos" DROP CONSTRAINT "studio_eventos_eventoTipoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_eventos" DROP CONSTRAINT "studio_eventos_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_gastos" DROP CONSTRAINT "studio_gastos_eventoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_gastos" DROP CONSTRAINT "studio_gastos_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nomina_servicios" DROP CONSTRAINT "studio_nomina_servicios_cotizacionServicioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nomina_servicios" DROP CONSTRAINT "studio_nomina_servicios_nominaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nominas" DROP CONSTRAINT "studio_nominas_eventoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nominas" DROP CONSTRAINT "studio_nominas_personalId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_nominas" DROP CONSTRAINT "studio_nominas_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_pagos" DROP CONSTRAINT "studio_pagos_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_pagos" DROP CONSTRAINT "studio_pagos_condicionesComercialesId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_pagos" DROP CONSTRAINT "studio_pagos_condicionesComercialesMetodoPagoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_pagos" DROP CONSTRAINT "studio_pagos_cotizacionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_pagos" DROP CONSTRAINT "studio_pagos_metodoPagoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_pagos" DROP CONSTRAINT "studio_pagos_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_paquete_servicios" DROP CONSTRAINT "studio_paquete_servicios_paqueteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_paquete_servicios" DROP CONSTRAINT "studio_paquete_servicios_servicioCategoriaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_paquete_servicios" DROP CONSTRAINT "studio_paquete_servicios_servicioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_paquetes" DROP CONSTRAINT "studio_paquetes_eventoTipoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_personal" DROP CONSTRAINT "studio_personal_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_personal" DROP CONSTRAINT "studio_personal_platformUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_personal_profile_assignments" DROP CONSTRAINT "studio_personal_profile_assignments_personalId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_personal_profile_assignments" DROP CONSTRAINT "studio_personal_profile_assignments_profileId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_redes_sociales" DROP CONSTRAINT "studio_redes_sociales_plataformaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_seccion_categorias" DROP CONSTRAINT "studio_seccion_categorias_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_seccion_categorias" DROP CONSTRAINT "studio_seccion_categorias_seccionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_servicio_gastos" DROP CONSTRAINT "studio_servicio_gastos_servicioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_servicios" DROP CONSTRAINT "studio_servicios_servicioCategoriaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_servicios" DROP CONSTRAINT "studio_servicios_studioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_studio_revenue_products" DROP CONSTRAINT "studio_studio_revenue_products_revenueProductId_fkey";

-- DropForeignKey
ALTER TABLE "public"."studio_users" DROP CONSTRAINT "studio_users_platformUserId_fkey";

-- DropIndex
DROP INDEX "public"."platform_acquisition_channels_isActive_idx";

-- DropIndex
DROP INDEX "public"."platform_acquisition_channels_isVisible_idx";

-- DropIndex
DROP INDEX "public"."platform_activities_leadId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."platform_activities_userId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."platform_advertising_platforms_isActive_idx";

-- DropIndex
DROP INDEX "public"."platform_campaign_platforms_campaignId_idx";

-- DropIndex
DROP INDEX "public"."platform_campaign_platforms_campaignId_platformId_key";

-- DropIndex
DROP INDEX "public"."platform_campaign_platforms_platformId_idx";

-- DropIndex
DROP INDEX "public"."platform_campaigns_isActive_idx";

-- DropIndex
DROP INDEX "public"."platform_campaigns_startDate_endDate_idx";

-- DropIndex
DROP INDEX "public"."platform_lead_bitacora_createdAt_idx";

-- DropIndex
DROP INDEX "public"."platform_lead_bitacora_leadId_idx";

-- DropIndex
DROP INDEX "public"."platform_leads_acquisitionChannelId_idx";

-- DropIndex
DROP INDEX "public"."platform_leads_agentId_idx";

-- DropIndex
DROP INDEX "public"."platform_leads_campaignId_idx";

-- DropIndex
DROP INDEX "public"."platform_leads_stageId_priority_idx";

-- DropIndex
DROP INDEX "public"."platform_leads_studioId_key";

-- DropIndex
DROP INDEX "public"."platform_notifications_createdAt_idx";

-- DropIndex
DROP INDEX "public"."platform_notifications_scheduledFor_idx";

-- DropIndex
DROP INDEX "public"."platform_notifications_userId_isActive_idx";

-- DropIndex
DROP INDEX "public"."platform_notifications_userId_isRead_idx";

-- DropIndex
DROP INDEX "public"."platform_pipeline_stages_isActive_idx";

-- DropIndex
DROP INDEX "public"."platform_social_networks_isActive_idx";

-- DropIndex
DROP INDEX "public"."setup_progress_log_createdAt_idx";

-- DropIndex
DROP INDEX "public"."setup_progress_log_sectionId_idx";

-- DropIndex
DROP INDEX "public"."setup_section_config_isActive_idx";

-- DropIndex
DROP INDEX "public"."setup_section_config_sectionId_idx";

-- DropIndex
DROP INDEX "public"."setup_section_config_sectionId_key";

-- DropIndex
DROP INDEX "public"."setup_section_progress_completionPercentage_idx";

-- DropIndex
DROP INDEX "public"."setup_section_progress_sectionId_idx";

-- DropIndex
DROP INDEX "public"."setup_section_progress_setupStatusId_sectionId_key";

-- DropIndex
DROP INDEX "public"."studio_agenda_eventoId_idx";

-- DropIndex
DROP INDEX "public"."studio_categorias_personal_esDefault_idx";

-- DropIndex
DROP INDEX "public"."studio_clientes_platformUserId_idx";

-- DropIndex
DROP INDEX "public"."studio_condiciones_comerciales_metodo_pago_condicionesComer_idx";

-- DropIndex
DROP INDEX "public"."studio_condiciones_comerciales_metodo_pago_metodoPagoId_idx";

-- DropIndex
DROP INDEX "public"."studio_cotizacion_costos_cotizacionId_idx";

-- DropIndex
DROP INDEX "public"."studio_cotizacion_servicios_cotizacionId_idx";

-- DropIndex
DROP INDEX "public"."studio_cotizacion_visitas_cotizacionId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."studio_cotizaciones_eventoId_idx";

-- DropIndex
DROP INDEX "public"."studio_cotizaciones_expiresAt_idx";

-- DropIndex
DROP INDEX "public"."studio_cuentas_bancarias_esPrincipal_idx";

-- DropIndex
DROP INDEX "public"."studio_evento_bitacoras_eventoId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."studio_eventos_clienteId_idx";

-- DropIndex
DROP INDEX "public"."studio_gastos_eventoId_idx";

-- DropIndex
DROP INDEX "public"."studio_nomina_servicios_nominaId_cotizacionServicioId_key";

-- DropIndex
DROP INDEX "public"."studio_nomina_servicios_nominaId_idx";

-- DropIndex
DROP INDEX "public"."studio_pagos_clienteId_idx";

-- DropIndex
DROP INDEX "public"."studio_pagos_createdAt_idx";

-- DropIndex
DROP INDEX "public"."studio_paquete_servicios_paqueteId_idx";

-- DropIndex
DROP INDEX "public"."studio_personal_platformUserId_idx";

-- DropIndex
DROP INDEX "public"."studio_personal_profile_assignments_personalId_idx";

-- DropIndex
DROP INDEX "public"."studio_personal_profile_assignments_personalId_profileId_key";

-- DropIndex
DROP INDEX "public"."studio_personal_profile_assignments_profileId_idx";

-- DropIndex
DROP INDEX "public"."studio_personal_profiles_studio_id_isActive_idx";

-- DropIndex
DROP INDEX "public"."studio_redes_sociales_plataformaId_idx";

-- DropIndex
DROP INDEX "public"."studio_redes_sociales_studio_id_plataformaId_key";

-- DropIndex
DROP INDEX "public"."studio_seccion_categorias_categoriaId_key";

-- DropIndex
DROP INDEX "public"."studio_servicios_studioId_status_idx";

-- DropIndex
DROP INDEX "public"."studio_servicios_studio_id_status_idx";

-- DropIndex
DROP INDEX "public"."studio_setup_status_isFullyConfigured_idx";

-- DropIndex
DROP INDEX "public"."studio_setup_status_overallProgress_idx";

-- DropIndex
DROP INDEX "public"."studio_studio_revenue_products_studio_id_revenueProductId_key";

-- DropIndex
DROP INDEX "public"."studio_users_isActive_idx";

-- DropIndex
DROP INDEX "public"."studio_users_platformUserId_idx";

-- AlterTable
ALTER TABLE "public"."plan_services" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_acquisition_channels" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "isVisible",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_activities" DROP COLUMN "createdAt",
DROP COLUMN "fechaProximaAccion",
DROP COLUMN "leadId",
DROP COLUMN "proximaAccion",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fecha_proxima_accion" TIMESTAMP(3),
ADD COLUMN     "lead_id" TEXT NOT NULL,
ADD COLUMN     "proxima_accion" TEXT,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "public"."platform_advertising_platforms" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_agents" DROP COLUMN "createdAt",
DROP COLUMN "metaMensualLeads",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "meta_mensual_leads" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_campaign_platforms" DROP COLUMN "actualSpend",
DROP COLUMN "campaignId",
DROP COLUMN "createdAt",
DROP COLUMN "platformId",
DROP COLUMN "updatedAt",
ADD COLUMN     "actual_spend" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "campaign_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "platform_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_campaigns" DROP COLUMN "actualSpend",
DROP COLUMN "createdAt",
DROP COLUMN "endDate",
DROP COLUMN "isActive",
DROP COLUMN "leadsGenerated",
DROP COLUMN "leadsSubscribed",
DROP COLUMN "startDate",
DROP COLUMN "totalBudget",
DROP COLUMN "updatedAt",
ADD COLUMN     "actual_spend" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "end_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leads_generated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leads_subscribed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "total_budget" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_discount_codes" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_lead_bitacora" DROP COLUMN "createdAt",
DROP COLUMN "leadId",
DROP COLUMN "updatedAt",
DROP COLUMN "usuarioId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lead_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usuario_id" TEXT;

-- AlterTable
ALTER TABLE "public"."platform_leads" DROP COLUMN "acquisitionChannelId",
DROP COLUMN "agentConversionId",
DROP COLUMN "agentId",
DROP COLUMN "avatarUrl",
DROP COLUMN "campaignId",
DROP COLUMN "conversionDate",
DROP COLUMN "conversionMethod",
DROP COLUMN "createdAt",
DROP COLUMN "firstInteractionDate",
DROP COLUMN "interactionCount",
DROP COLUMN "interestedPlan",
DROP COLUMN "lastContactDate",
DROP COLUMN "leadType",
DROP COLUMN "originalSource",
DROP COLUMN "probableStartDate",
DROP COLUMN "stageId",
DROP COLUMN "studioId",
DROP COLUMN "studioName",
DROP COLUMN "studioSlug",
DROP COLUMN "updatedAt",
ADD COLUMN     "acquisition_channel_id" TEXT,
ADD COLUMN     "agent_conversion_id" TEXT,
ADD COLUMN     "agent_id" TEXT,
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "campaign_id" TEXT,
ADD COLUMN     "conversion_date" TIMESTAMP(3),
ADD COLUMN     "conversion_method" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "first_interaction_date" TIMESTAMP(3),
ADD COLUMN     "interaction_count" INTEGER DEFAULT 0,
ADD COLUMN     "interested_plan" TEXT,
ADD COLUMN     "last_contact_date" TIMESTAMP(3),
ADD COLUMN     "lead_type" TEXT DEFAULT 'prospect',
ADD COLUMN     "original_source" TEXT,
ADD COLUMN     "probable_start_date" TIMESTAMP(3),
ADD COLUMN     "stage_id" TEXT,
ADD COLUMN     "studio_id" TEXT,
ADD COLUMN     "studio_name" TEXT,
ADD COLUMN     "studio_slug" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_notifications" DROP COLUMN "agentId",
DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "isActive",
DROP COLUMN "isRead",
DROP COLUMN "leadId",
DROP COLUMN "scheduledFor",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "agent_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lead_id" TEXT,
ADD COLUMN     "scheduled_for" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_pipeline_stages" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_pipeline_types" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_plans" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_social_networks" DROP COLUMN "baseUrl",
DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "base_url" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_user_profiles" DROP COLUMN "avatarUrl",
DROP COLUMN "createdAt",
DROP COLUMN "fullName",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."setup_progress_log" DROP COLUMN "createdAt",
DROP COLUMN "newStatus",
DROP COLUMN "oldStatus",
DROP COLUMN "sectionId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "new_status" TEXT,
ADD COLUMN     "old_status" TEXT,
ADD COLUMN     "section_id" TEXT;

-- AlterTable
ALTER TABLE "public"."setup_section_config" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "optionalFields",
DROP COLUMN "requiredFields",
DROP COLUMN "sectionId",
DROP COLUMN "sectionName",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "optional_fields" JSONB NOT NULL,
ADD COLUMN     "required_fields" JSONB NOT NULL,
ADD COLUMN     "section_id" TEXT NOT NULL,
ADD COLUMN     "section_name" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."setup_section_progress" DROP COLUMN "completedAt",
DROP COLUMN "completedFields",
DROP COLUMN "completionPercentage",
DROP COLUMN "lastUpdatedAt",
DROP COLUMN "missingFields",
DROP COLUMN "sectionId",
DROP COLUMN "sectionName",
DROP COLUMN "setupStatusId",
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "completed_fields" JSONB NOT NULL,
ADD COLUMN     "completion_percentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "missing_fields" JSONB NOT NULL,
ADD COLUMN     "section_id" TEXT NOT NULL,
ADD COLUMN     "section_name" TEXT NOT NULL,
ADD COLUMN     "setup_status_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_agenda" DROP COLUMN "agendaTipo",
DROP COLUMN "createdAt",
DROP COLUMN "eventoId",
DROP COLUMN "googleMapsUrl",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "agenda_tipo" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evento_id" TEXT NOT NULL,
ADD COLUMN     "google_maps_url" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "public"."studio_categorias_personal" DROP COLUMN "createdAt",
DROP COLUMN "esDefault",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "es_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_clientes" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "lastLogin",
DROP COLUMN "platformUserId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login" TIMESTAMP(3),
ADD COLUMN     "platform_user_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_condiciones_comerciales" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_condiciones_comerciales_metodo_pago" DROP COLUMN "condicionesComercialesId",
DROP COLUMN "createdAt",
DROP COLUMN "metodoPagoId",
DROP COLUMN "updatedAt",
ADD COLUMN     "condiciones_comerciales_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metodo_pago_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_cotizacion_costos" DROP COLUMN "cotizacionId",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "cotizacion_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_cotizacion_servicios" DROP COLUMN "cotizacionId",
DROP COLUMN "createdAt",
DROP COLUMN "fechaAsignacion",
DROP COLUMN "precioUnitario",
DROP COLUMN "servicioCategoriaId",
DROP COLUMN "servicioId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "cotizacion_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fecha_asignacion" TIMESTAMP(3),
ADD COLUMN     "precio_unitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "servicio_categoria_id" TEXT,
ADD COLUMN     "servicio_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "public"."studio_cotizacion_visitas" DROP COLUMN "cotizacionId",
DROP COLUMN "createdAt",
ADD COLUMN     "cotizacion_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."studio_cotizaciones" DROP COLUMN "condicionesComercialesId",
DROP COLUMN "condicionesComercialesMetodoPagoId",
DROP COLUMN "createdAt",
DROP COLUMN "eventoId",
DROP COLUMN "eventoTipoId",
DROP COLUMN "expiresAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "condiciones_comerciales_id" TEXT,
ADD COLUMN     "condiciones_comerciales_metodo_pago_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evento_id" TEXT NOT NULL,
ADD COLUMN     "evento_tipo_id" TEXT NOT NULL,
ADD COLUMN     "expires_at" TIMESTAMP(3) DEFAULT (now() + '10 days'::interval),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_cuentas_bancarias" DROP COLUMN "createdAt",
DROP COLUMN "esPrincipal",
DROP COLUMN "numeroCuenta",
DROP COLUMN "tipoCuenta",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "es_principal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numero_cuenta" TEXT NOT NULL,
ADD COLUMN     "tipo_cuenta" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_evento_bitacoras" DROP COLUMN "createdAt",
DROP COLUMN "eventoId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evento_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_evento_etapas" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_evento_tipos" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_eventos" DROP COLUMN "clienteId",
DROP COLUMN "createdAt",
DROP COLUMN "eventoEtapaId",
DROP COLUMN "eventoTipoId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "cliente_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evento_etapa_id" TEXT,
ADD COLUMN     "evento_tipo_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "public"."studio_gastos" DROP COLUMN "comprobanteUrl",
DROP COLUMN "createdAt",
DROP COLUMN "eventoId",
DROP COLUMN "updatedAt",
DROP COLUMN "usuarioId",
ADD COLUMN     "comprobante_url" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evento_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usuario_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_horarios_atencion" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_metodos_pago" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_nomina_servicios" DROP COLUMN "cotizacionServicioId",
DROP COLUMN "createdAt",
DROP COLUMN "nominaId",
ADD COLUMN     "cotizacion_servicio_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nomina_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_nominas" DROP COLUMN "createdAt",
DROP COLUMN "eventoId",
DROP COLUMN "personalId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evento_id" TEXT,
ADD COLUMN     "personal_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_pagos" DROP COLUMN "clienteId",
DROP COLUMN "comisionStripe",
DROP COLUMN "condicionesComercialesId",
DROP COLUMN "condicionesComercialesMetodoPagoId",
DROP COLUMN "cotizacionId",
DROP COLUMN "createdAt",
DROP COLUMN "metodoPagoId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "cliente_id" TEXT,
ADD COLUMN     "comision_stripe" DOUBLE PRECISION,
ADD COLUMN     "condiciones_comerciales_id" TEXT,
ADD COLUMN     "condiciones_comerciales_metodo_pago_id" TEXT,
ADD COLUMN     "cotizacion_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metodo_pago_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "public"."studio_paquete_servicios" DROP COLUMN "createdAt",
DROP COLUMN "paqueteId",
DROP COLUMN "servicioCategoriaId",
DROP COLUMN "servicioId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paquete_id" TEXT NOT NULL,
ADD COLUMN     "servicio_categoria_id" TEXT NOT NULL,
ADD COLUMN     "servicio_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_paquetes" DROP COLUMN "createdAt",
DROP COLUMN "eventoTipoId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evento_tipo_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_personal" DROP COLUMN "categoriaId",
DROP COLUMN "createdAt",
DROP COLUMN "platformUserId",
DROP COLUMN "updatedAt",
ADD COLUMN     "categoria_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "platform_user_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_personal_profile_assignments" DROP COLUMN "createdAt",
DROP COLUMN "personalId",
DROP COLUMN "profileId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "personal_id" TEXT NOT NULL,
ADD COLUMN     "profile_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_personal_profiles" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_redes_sociales" DROP COLUMN "createdAt",
DROP COLUMN "plataformaId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "plataforma_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_reglas_agendamiento" DROP COLUMN "capacidadOperativa",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "capacidad_operativa" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_revenue_products" DROP COLUMN "cicloVida",
DROP COLUMN "comisionProsocial",
DROP COLUMN "comisionStudio",
DROP COLUMN "createdAt",
DROP COLUMN "precioPublico",
DROP COLUMN "tipoFacturacion",
DROP COLUMN "updatedAt",
ADD COLUMN     "ciclo_vida" INTEGER,
ADD COLUMN     "comision_plataforma" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "comision_studio" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "precio_publico" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "tipo_facturacion" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_seccion_categorias" DROP COLUMN "categoriaId",
DROP COLUMN "seccionId",
ADD COLUMN     "categoria_id" TEXT NOT NULL,
ADD COLUMN     "seccion_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_servicio_categorias" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_servicio_gastos" DROP COLUMN "createdAt",
DROP COLUMN "servicioId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "servicio_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_servicio_secciones" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_servicios" DROP COLUMN "createdAt",
DROP COLUMN "servicioCategoriaId",
DROP COLUMN "studioId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "servicio_categoria_id" TEXT NOT NULL,
ADD COLUMN     "studio_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_setup_status" DROP COLUMN "createdAt",
DROP COLUMN "isFullyConfigured",
DROP COLUMN "lastValidatedAt",
DROP COLUMN "overallProgress",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_fully_configured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_validated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "overall_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_studio_revenue_products" DROP COLUMN "activadoEn",
DROP COLUMN "comisionCustom",
DROP COLUMN "configuracionStudio",
DROP COLUMN "createdAt",
DROP COLUMN "desactivadoEn",
DROP COLUMN "precioCustom",
DROP COLUMN "revenueProductId",
DROP COLUMN "updatedAt",
ADD COLUMN     "activado_en" TIMESTAMP(3),
ADD COLUMN     "comision_custom" DECIMAL(65,30),
ADD COLUMN     "configuracion_studio" JSONB,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "desactivado_en" TIMESTAMP(3),
ADD COLUMN     "precio_custom" DECIMAL(65,30),
ADD COLUMN     "revenue_product_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_telefonos" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_user_profiles" DROP COLUMN "avatarUrl",
DROP COLUMN "createdAt",
DROP COLUMN "fullName",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."studio_users" DROP COLUMN "createdAt",
DROP COLUMN "fullName",
DROP COLUMN "isActive",
DROP COLUMN "platformUserId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "platform_user_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "platform_acquisition_channels_is_active_idx" ON "public"."platform_acquisition_channels"("is_active");

-- CreateIndex
CREATE INDEX "platform_acquisition_channels_is_visible_idx" ON "public"."platform_acquisition_channels"("is_visible");

-- CreateIndex
CREATE INDEX "platform_activities_lead_id_created_at_idx" ON "public"."platform_activities"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_activities_user_id_created_at_idx" ON "public"."platform_activities"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_advertising_platforms_is_active_idx" ON "public"."platform_advertising_platforms"("is_active");

-- CreateIndex
CREATE INDEX "platform_campaign_platforms_campaign_id_idx" ON "public"."platform_campaign_platforms"("campaign_id");

-- CreateIndex
CREATE INDEX "platform_campaign_platforms_platform_id_idx" ON "public"."platform_campaign_platforms"("platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_campaign_platforms_campaign_id_platform_id_key" ON "public"."platform_campaign_platforms"("campaign_id", "platform_id");

-- CreateIndex
CREATE INDEX "platform_campaigns_start_date_end_date_idx" ON "public"."platform_campaigns"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "platform_campaigns_is_active_idx" ON "public"."platform_campaigns"("is_active");

-- CreateIndex
CREATE INDEX "platform_lead_bitacora_created_at_idx" ON "public"."platform_lead_bitacora"("created_at");

-- CreateIndex
CREATE INDEX "platform_lead_bitacora_lead_id_idx" ON "public"."platform_lead_bitacora"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_leads_studio_id_key" ON "public"."platform_leads"("studio_id");

-- CreateIndex
CREATE INDEX "platform_leads_agent_id_idx" ON "public"."platform_leads"("agent_id");

-- CreateIndex
CREATE INDEX "platform_leads_campaign_id_idx" ON "public"."platform_leads"("campaign_id");

-- CreateIndex
CREATE INDEX "platform_leads_acquisition_channel_id_idx" ON "public"."platform_leads"("acquisition_channel_id");

-- CreateIndex
CREATE INDEX "platform_leads_stage_id_priority_idx" ON "public"."platform_leads"("stage_id", "priority");

-- CreateIndex
CREATE INDEX "platform_notifications_created_at_idx" ON "public"."platform_notifications"("created_at");

-- CreateIndex
CREATE INDEX "platform_notifications_scheduled_for_idx" ON "public"."platform_notifications"("scheduled_for");

-- CreateIndex
CREATE INDEX "platform_notifications_user_id_is_active_idx" ON "public"."platform_notifications"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "platform_notifications_user_id_is_read_idx" ON "public"."platform_notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "platform_pipeline_stages_is_active_idx" ON "public"."platform_pipeline_stages"("is_active");

-- CreateIndex
CREATE INDEX "platform_social_networks_is_active_idx" ON "public"."platform_social_networks"("is_active");

-- CreateIndex
CREATE INDEX "setup_progress_log_section_id_idx" ON "public"."setup_progress_log"("section_id");

-- CreateIndex
CREATE INDEX "setup_progress_log_created_at_idx" ON "public"."setup_progress_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "setup_section_config_section_id_key" ON "public"."setup_section_config"("section_id");

-- CreateIndex
CREATE INDEX "setup_section_config_section_id_idx" ON "public"."setup_section_config"("section_id");

-- CreateIndex
CREATE INDEX "setup_section_config_is_active_idx" ON "public"."setup_section_config"("is_active");

-- CreateIndex
CREATE INDEX "setup_section_progress_section_id_idx" ON "public"."setup_section_progress"("section_id");

-- CreateIndex
CREATE INDEX "setup_section_progress_completion_percentage_idx" ON "public"."setup_section_progress"("completion_percentage");

-- CreateIndex
CREATE UNIQUE INDEX "setup_section_progress_setup_status_id_section_id_key" ON "public"."setup_section_progress"("setup_status_id", "section_id");

-- CreateIndex
CREATE INDEX "studio_agenda_evento_id_idx" ON "public"."studio_agenda"("evento_id");

-- CreateIndex
CREATE INDEX "studio_categorias_personal_es_default_idx" ON "public"."studio_categorias_personal"("es_default");

-- CreateIndex
CREATE INDEX "studio_clientes_platform_user_id_idx" ON "public"."studio_clientes"("platform_user_id");

-- CreateIndex
CREATE INDEX "studio_condiciones_comerciales_metodo_pago_condiciones_come_idx" ON "public"."studio_condiciones_comerciales_metodo_pago"("condiciones_comerciales_id");

-- CreateIndex
CREATE INDEX "studio_condiciones_comerciales_metodo_pago_metodo_pago_id_idx" ON "public"."studio_condiciones_comerciales_metodo_pago"("metodo_pago_id");

-- CreateIndex
CREATE INDEX "studio_cotizacion_costos_cotizacion_id_idx" ON "public"."studio_cotizacion_costos"("cotizacion_id");

-- CreateIndex
CREATE INDEX "studio_cotizacion_servicios_cotizacion_id_idx" ON "public"."studio_cotizacion_servicios"("cotizacion_id");

-- CreateIndex
CREATE INDEX "studio_cotizacion_visitas_cotizacion_id_created_at_idx" ON "public"."studio_cotizacion_visitas"("cotizacion_id", "created_at");

-- CreateIndex
CREATE INDEX "studio_cotizaciones_evento_id_idx" ON "public"."studio_cotizaciones"("evento_id");

-- CreateIndex
CREATE INDEX "studio_cotizaciones_expires_at_idx" ON "public"."studio_cotizaciones"("expires_at");

-- CreateIndex
CREATE INDEX "studio_cuentas_bancarias_es_principal_idx" ON "public"."studio_cuentas_bancarias"("es_principal");

-- CreateIndex
CREATE INDEX "studio_evento_bitacoras_evento_id_created_at_idx" ON "public"."studio_evento_bitacoras"("evento_id", "created_at");

-- CreateIndex
CREATE INDEX "studio_eventos_cliente_id_idx" ON "public"."studio_eventos"("cliente_id");

-- CreateIndex
CREATE INDEX "studio_gastos_evento_id_idx" ON "public"."studio_gastos"("evento_id");

-- CreateIndex
CREATE INDEX "studio_nomina_servicios_nomina_id_idx" ON "public"."studio_nomina_servicios"("nomina_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_nomina_servicios_nomina_id_cotizacion_servicio_id_key" ON "public"."studio_nomina_servicios"("nomina_id", "cotizacion_servicio_id");

-- CreateIndex
CREATE INDEX "studio_pagos_created_at_idx" ON "public"."studio_pagos"("created_at");

-- CreateIndex
CREATE INDEX "studio_pagos_cliente_id_idx" ON "public"."studio_pagos"("cliente_id");

-- CreateIndex
CREATE INDEX "studio_paquete_servicios_paquete_id_idx" ON "public"."studio_paquete_servicios"("paquete_id");

-- CreateIndex
CREATE INDEX "studio_personal_platform_user_id_idx" ON "public"."studio_personal"("platform_user_id");

-- CreateIndex
CREATE INDEX "studio_personal_profile_assignments_personal_id_idx" ON "public"."studio_personal_profile_assignments"("personal_id");

-- CreateIndex
CREATE INDEX "studio_personal_profile_assignments_profile_id_idx" ON "public"."studio_personal_profile_assignments"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_personal_profile_assignments_personal_id_profile_id_key" ON "public"."studio_personal_profile_assignments"("personal_id", "profile_id");

-- CreateIndex
CREATE INDEX "studio_personal_profiles_studio_id_is_active_idx" ON "public"."studio_personal_profiles"("studio_id", "is_active");

-- CreateIndex
CREATE INDEX "studio_redes_sociales_plataforma_id_idx" ON "public"."studio_redes_sociales"("plataforma_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_redes_sociales_studio_id_plataforma_id_key" ON "public"."studio_redes_sociales"("studio_id", "plataforma_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_seccion_categorias_categoria_id_key" ON "public"."studio_seccion_categorias"("categoria_id");

-- CreateIndex
CREATE INDEX "studio_servicios_studio_id_status_idx" ON "public"."studio_servicios"("studio_id", "status");

-- CreateIndex
CREATE INDEX "studio_setup_status_is_fully_configured_idx" ON "public"."studio_setup_status"("is_fully_configured");

-- CreateIndex
CREATE INDEX "studio_setup_status_overall_progress_idx" ON "public"."studio_setup_status"("overall_progress");

-- CreateIndex
CREATE UNIQUE INDEX "studio_studio_revenue_products_studio_id_revenue_product_id_key" ON "public"."studio_studio_revenue_products"("studio_id", "revenue_product_id");

-- CreateIndex
CREATE INDEX "studio_users_is_active_idx" ON "public"."studio_users"("is_active");

-- CreateIndex
CREATE INDEX "studio_users_platform_user_id_idx" ON "public"."studio_users"("platform_user_id");

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_acquisition_channel_id_fkey" FOREIGN KEY ("acquisition_channel_id") REFERENCES "public"."platform_acquisition_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."platform_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."platform_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."platform_pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_activities" ADD CONSTRAINT "platform_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."platform_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_activities" ADD CONSTRAINT "platform_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_lead_bitacora" ADD CONSTRAINT "platform_lead_bitacora_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."platform_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_lead_bitacora" ADD CONSTRAINT "platform_lead_bitacora_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."studio_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_campaign_platforms" ADD CONSTRAINT "platform_campaign_platforms_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."platform_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_campaign_platforms" ADD CONSTRAINT "platform_campaign_platforms_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."platform_advertising_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_notifications" ADD CONSTRAINT "platform_notifications_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."platform_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_notifications" ADD CONSTRAINT "platform_notifications_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."platform_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_notifications" ADD CONSTRAINT "platform_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_redes_sociales" ADD CONSTRAINT "studio_redes_sociales_plataforma_id_fkey" FOREIGN KEY ("plataforma_id") REFERENCES "public"."platform_social_networks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."setup_section_progress" ADD CONSTRAINT "setup_section_progress_setup_status_id_fkey" FOREIGN KEY ("setup_status_id") REFERENCES "public"."studio_setup_status"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_servicios" ADD CONSTRAINT "studio_servicios_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_servicios" ADD CONSTRAINT "studio_servicios_servicio_categoria_id_fkey" FOREIGN KEY ("servicio_categoria_id") REFERENCES "public"."studio_servicio_categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_seccion_categorias" ADD CONSTRAINT "studio_seccion_categorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."studio_servicio_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_seccion_categorias" ADD CONSTRAINT "studio_seccion_categorias_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "public"."studio_servicio_secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_servicio_gastos" ADD CONSTRAINT "studio_servicio_gastos_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "public"."studio_servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquetes" ADD CONSTRAINT "studio_paquetes_evento_tipo_id_fkey" FOREIGN KEY ("evento_tipo_id") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_servicios" ADD CONSTRAINT "studio_paquete_servicios_paquete_id_fkey" FOREIGN KEY ("paquete_id") REFERENCES "public"."studio_paquetes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_servicios" ADD CONSTRAINT "studio_paquete_servicios_servicio_categoria_id_fkey" FOREIGN KEY ("servicio_categoria_id") REFERENCES "public"."studio_servicio_categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_servicios" ADD CONSTRAINT "studio_paquete_servicios_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "public"."studio_servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal" ADD CONSTRAINT "studio_personal_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."studio_categorias_personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal" ADD CONSTRAINT "studio_personal_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "public"."platform_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal_profile_assignments" ADD CONSTRAINT "studio_personal_profile_assignments_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "public"."studio_personal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal_profile_assignments" ADD CONSTRAINT "studio_personal_profile_assignments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."studio_personal_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_clientes" ADD CONSTRAINT "studio_clientes_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "public"."platform_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."studio_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_evento_etapa_id_fkey" FOREIGN KEY ("evento_etapa_id") REFERENCES "public"."studio_evento_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_evento_tipo_id_fkey" FOREIGN KEY ("evento_tipo_id") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_evento_bitacoras" ADD CONSTRAINT "studio_evento_bitacoras_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."studio_eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_agenda" ADD CONSTRAINT "studio_agenda_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."studio_eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_agenda" ADD CONSTRAINT "studio_agenda_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_condiciones_comerciales_metodo_pago" ADD CONSTRAINT "studio_condiciones_comerciales_metodo_pago_condiciones_com_fkey" FOREIGN KEY ("condiciones_comerciales_id") REFERENCES "public"."studio_condiciones_comerciales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_condiciones_comerciales_metodo_pago" ADD CONSTRAINT "studio_condiciones_comerciales_metodo_pago_metodo_pago_id_fkey" FOREIGN KEY ("metodo_pago_id") REFERENCES "public"."studio_metodos_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizaciones" ADD CONSTRAINT "studio_cotizaciones_condiciones_comerciales_id_fkey" FOREIGN KEY ("condiciones_comerciales_id") REFERENCES "public"."studio_condiciones_comerciales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizaciones" ADD CONSTRAINT "studio_cotizaciones_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."studio_eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizaciones" ADD CONSTRAINT "studio_cotizaciones_evento_tipo_id_fkey" FOREIGN KEY ("evento_tipo_id") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" ADD CONSTRAINT "studio_cotizacion_servicios_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" ADD CONSTRAINT "studio_cotizacion_servicios_servicio_categoria_id_fkey" FOREIGN KEY ("servicio_categoria_id") REFERENCES "public"."studio_servicio_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" ADD CONSTRAINT "studio_cotizacion_servicios_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "public"."studio_servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" ADD CONSTRAINT "studio_cotizacion_servicios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_costos" ADD CONSTRAINT "studio_cotizacion_costos_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_visitas" ADD CONSTRAINT "studio_cotizacion_visitas_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."studio_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_condiciones_comerciales_id_fkey" FOREIGN KEY ("condiciones_comerciales_id") REFERENCES "public"."studio_condiciones_comerciales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_condiciones_comerciales_metodo_pago_id_fkey" FOREIGN KEY ("condiciones_comerciales_metodo_pago_id") REFERENCES "public"."studio_condiciones_comerciales_metodo_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_metodo_pago_id_fkey" FOREIGN KEY ("metodo_pago_id") REFERENCES "public"."studio_metodos_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."studio_eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "public"."studio_personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."studio_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nomina_servicios" ADD CONSTRAINT "studio_nomina_servicios_cotizacion_servicio_id_fkey" FOREIGN KEY ("cotizacion_servicio_id") REFERENCES "public"."studio_cotizacion_servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nomina_servicios" ADD CONSTRAINT "studio_nomina_servicios_nomina_id_fkey" FOREIGN KEY ("nomina_id") REFERENCES "public"."studio_nominas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_gastos" ADD CONSTRAINT "studio_gastos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."studio_eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_gastos" ADD CONSTRAINT "studio_gastos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."studio_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_studio_revenue_products" ADD CONSTRAINT "studio_studio_revenue_products_revenue_product_id_fkey" FOREIGN KEY ("revenue_product_id") REFERENCES "public"."studio_revenue_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_users" ADD CONSTRAINT "studio_users_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "public"."platform_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
