# 🧭 Brújula de Visión — Roadmap Estratégico Post-MVP

> *De un SaaS de gestión a un Ecosistema de Economía Creativa.*

---

## 1. Visión General

**ZEN** evoluciona más allá del MVP: de herramienta de gestión a **Ecosistema de Economía Creativa**, integrando tres vectores de valor:

| Vector | Rol |
|--------|-----|
| **Fintech** | Salud financiera, perfilamiento y acceso a capital para estudios |
| **Marketplace** | Conexión estudio–cliente y estudio–proveedor con IA |
| **AI Agent** | Copiloto digital que anticipa, recomienda y automatiza |

La brújula apunta a que cada estudio fotográfico opere con **datos**, **capital** y **visibilidad** en un solo lugar.

---

## 2. Pilar: Asset Management & Marketplace B2B

**Objetivo:** Gestión profesional del inventario y canal de compra/venta de equipo entre la comunidad para retener valor dentro del ecosistema.

- **Gestión de inventario con depreciación contable:** Catálogo de activos (cámaras, lentes, iluminación, accesorios) con estado, responsable y cálculo automático de depreciación según política del estudio. Check-out/Check-in por personal para trazabilidad y menos pérdidas en producción.
- **Marketplace de la Comunidad:** Compra/venta de equipo usado entre usuarios del Tanque. Integración con pasarelas de pago (Stripe) con **retención de fondos (escrow)** hasta confirmación de entrega, garantizando seguridad y confianza en las transacciones.

*Resultado esperado:* Control total del equipo propio y liquidez/acceso a equipo de segunda mano dentro de la plataforma, con transacciones seguras. Menos “desaparecidos” en producción.
---

## 3. Pilar: Red de Colaboración (Bolsa de Trabajo)

**Objetivo:** Conectar estudios que necesitan refuerzo con estudios o profesionales disponibles, generando una bolsa de trabajo y recursos compartidos.

- **Postulación como colaboradores:** Módulo para que estudios se postulen como colaboradores de otros estudios (segundo fotógrafo, asistente, retocador, etc.).
- **Intercambio de Crew y recursos técnicos:** Oferta y demanda de personal y equipo basada en **disponibilidad** y **reputación** dentro de la plataforma (valoraciones, eventos completados, puntualidad).

*Resultado esperado:* Picos de demanda cubiertos sin contratar fijo; estudios con capacidad ociosa monetizan su crew y equipo; red de confianza verificable.

---

## 4. Pilar: IA Proactiva & Publicidad Nativa

**Objetivo:** Asistente que anticipa necesidades operativas y red de recomendaciones donde la publicidad se siente útil y contextual.

- **Asistente que anticipa:** Monitoreo de tareas, recordatorios de preparación de equipo, checklists pre/post evento y sugerencias de seguimiento comercial según comportamiento del lead o promesa.
- **Red de recomendaciones (Ads):** La IA sugiere proveedores o estudios **pautados** según **zona**, **presupuesto** y **disponibilidad real** del prospecto. Publicidad nativa integrada en el flujo (no banners invasivos).

*Resultado esperado:* El estudio opera con un copiloto que no deja caer bolas; la pauta genera reservas porque las recomendaciones son relevantes y basadas en datos reales.

---

## 5. Pilar: Fintech & Marketplace Financiero

**Objetivo:** Alianzas con financieras para que el flujo de caja real registrado en ZEN sea la base de acceso a crédito y productos financieros.

- **Créditos basados en flujo de caja real:** Perfilamiento crediticio a partir de datos ya registrados en el sistema (ingresos, gastos, estacionalidad, cumplimiento de pagos). Sin papeleos pesados.
- **Marketplace financiero:** Conexión con aliados (crédito, leasing, seguros) que ofrecen productos adaptados al sector creativo usando el perfil generado en la plataforma.

*Resultado esperado:* Estudios con historial en ZEN acceden a mejores condiciones y productos financieros diseñados para su realidad.

---

## 6. Pilar: Experiencia y Retención (Smart Bundles & NPS)

**Objetivo:** Mejorar conversión y retención con oferta clara y feedback estructurado en cada etapa.

- **Configurador dinámico de paquetes:** El cliente (o el estudio desde su vista) arma paquetes según tipo de evento, presupuesto y add-ons; precios y disponibilidad en tiempo real.
- **Encuestas de satisfacción en cada etapa:** NPS y cuestionarios en puntos clave del proceso (post-cotización, post-evento, post-entrega) con métricas en dashboard para actuar sobre la experiencia.

*Resultado esperado:* Menos fricción en la venta, más cierres y datos de experiencia para mejorar producto y servicio de forma continua.

---

## 7. Nice to Wish — Ideas en Iteración

Espacio abierto para ideas futuras que se validan y priorizan con el tiempo:

| Idea | Descripción breve |
|------|-------------------|
| **Red Social de Productores** | Comunidad entre estudios: referidos, colaboraciones, intercambio de buenas prácticas y casos. |
| **Marketplace B2B de insumos** | Conexión estudio ↔ proveedores de insumos (papel, álbumes, marquetería, etc.) con cotizaciones y pedidos integrados. |
| **Otros** | *Aquí se suman nuevas ideas según feedback de usuarios y tendencias del mercado.* |

---

## 8. Módulo de Auditoría y Transparencia Financiera

**Objetivo:** Garantizar integridad contable histórica, trazabilidad de pagos por personal y recordatorios de cierre para una gestión financiera transparente y auditable.

1. **Estados de Cuenta Mensuales (Snapshots Inmutables):**
   - Implementar la generación de *Estados de Cuenta* al cierre de cada mes.
   - El registro debe ser estático y capturar: saldo inicial, todos los movimientos (ingresos, egresos, cancelaciones, devoluciones) con su snapshot de origen de pago, y el balance final del periodo.
   - Una vez generado, el registro es **inmutable** para garantizar la integridad contable histórica.

2. **Historial de Pagos por Personal (Staff Reporting):**
   - Vista de auditoría para el estudio con filtro de historial de pagos por miembro del staff.
   - Consultas por meses específicos o rangos de fecha (ej.: *¿Cuánto se le ha pagado a [Nombre] en lo que va del año?*).
   - *Futuro:* Panel individual para que cada miembro del staff consulte su propio histórico de ingresos percibidos.

3. **Notificaciones de Cierre:**
   - Sistema de alertas a fin de mes para sugerir al administrador la generación del estado de cuenta y la revisión de saldos finales.

*Resultado esperado:* Historial financiero confiable, respaldo para auditorías y claridad en pagos al personal; menos riesgo de discrepancias y mayor confianza en los datos.

---

## 9. Estrategia de Crecimiento y UX (Micro-onboarding)

**Objetivo:** Reducir fricción de entrada, aumentar retención y asegurar que el valor percibido sea inmediato en cada paso del producto.

1. **Onboarding Contextual (Progressive Disclosure):**
   - Implementar un sistema de *goteo* de información. En lugar de un setup inicial masivo, pedir datos específicos conforme el usuario descubre nuevas secciones (Finanzas, Catálogo, Eventos, etc.).
   - Objetivo: reducir la fricción inicial y aumentar la retención al dar beneficios inmediatos por cada dato entregado.

2. **Asistente de Configuración Financiera:**
   - Al ingresar por primera vez a Finanzas, detectar el plan de suscripción del estudio y sugerir (vía banner o modal amigable) la creación automática del gasto recurrente de *Suscripción El Tanque* para garantizar que los KPIs de utilidad neta sean 100% reales desde el inicio.

3. **Tooltips y Guías "Just-in-Time":**
   - Añadir micro-guías interactivas que se activen solo cuando el usuario interactúa con elementos clave por primera vez (ej. al expandir por primera vez el acordeón de pago o al marcar una tarjeta como default).

4. **Validación Proactiva:**
   - El sistema debe anticiparse a errores (como el saldo insuficiente en bancos/caja) y ofrecer soluciones rápidas en lugar de solo mensajes de error.

*Resultado esperado:* Usuarios que ven valor desde el primer uso, menos abandono en setup y KPIs financieros coherentes desde día uno.

---

*Documento vivo. Actualizar según hitos, aprendizajes y decisiones de producto.*  
**ZEN** — *Economía creativa, bien gestionada.*
