# 📱 WhatsApp Smart Composer (V2.0)

## Descripción General

El **WhatsAppMessageModal** es el centro de comunicación 360 de Zenly. Está diseñado para optimizar el cierre de ventas y la gestión de prospectos mediante un flujo de trabajo de tres columnas que integra **estrategia** (plantillas), **activos** (portafolios) y **ejecución** (editor inteligente).

---

## 🏗️ Arquitectura de la Interfaz (3 Columnas)

### Columna 1: Estrategia (Plantillas)

- **Gestión In-line:** CRUD completo (Crear, Editar, Renombrar, Duplicar y Eliminar).
- **Orden Personalizado:** Reordenamiento mediante Drag & Drop (patrón card-grouped-list con `@dnd-kit/core` y `@dnd-kit/sortable`). Handle de arrastre (GripVertical) a la izquierda; Duplicar/Eliminar en el menú no disparan arrastre ni selección.
- **Conciencia Contextual:**
  - **Badge "Enviado" (✓):** Si el mensaje de esa plantilla ya se envió a la promesa actual (cruce con `studio_promise_logs` y `metadata.whatsappTemplateId`).
  - **Resaltado "Reciente":** Última plantilla usada en la sesión (borde ámbar o tag "Reciente").

### Columna 2: Recursos (Portafolios)

- **Agrupación Automática:** Portafolios categorizados por `event_type_name` (sin tipo → "Otros").
- **Apertura Inteligente:** El modal expande por defecto la categoría que coincide con el tipo de evento de la promesa actual; si no hay match, todas las secciones expandidas.
- **Preview Integrado:** Previsualización del portafolio completo con el componente compartido del perfil público (`PortfolioDetailModal` + `getPortfolioFullDetail`) sin cerrar el modal.
- **Acción dual por portafolio:** Botón Preview (ojo) abre el detalle; botón Agregar (plus) genera short URL e inserta chip al final del editor.

### Columna 3: Editor y Vista Previa

- **Smart Chips:** Variables dinámicas `[[nombre_contacto]]`, `[[fecha_evento]]`, `[[link_promesa]]`, etc., que se visualizan como badges verdes.
- **Inserción al final:** Toda inserción (variables o links de portafolio) se realiza al final del editor para evitar ruptura de la estructura de tags.
- **Link Shortening:** Los links de portafolio se generan como URLs cortas (`/s/shortCode`) vía `getOrCreatePortfolioShortUrl`.
- **WhatsApp Unfurling:** Metadata (OG Tags) en la ruta pública para que el link corto muestre miniatura y título en WhatsApp.

---

## ⚙️ Componentes y Lógica Técnica

### Persistencia

- **`studio_whatsapp_templates`:** Almacena `title`, `message`, `display_order` y `studio_id`.
- **`studio_promise_logs`:** Registra cada envío con `log_type: 'whatsapp_sent'`; en `metadata` se guarda opcionalmente `whatsappTemplateId` para el badge "Enviado".
- **`studio_short_urls`:** URLs cortas para promesas y portafolios (constraint permite `promise_id` y `post_id` nulos para portafolios).

### Acciones de Servidor

| Acción | Uso |
|--------|-----|
| `getWhatsAppTemplates` | Lista plantillas ordenadas por `display_order`. |
| `updateTemplatesOrder` | Persiste el nuevo orden tras drag & drop. |
| `duplicateWhatsAppTemplate` | Duplica plantilla con `display_order` al final. |
| `getWhatsAppSentTemplateIdsForPromise` | IDs de plantillas ya enviadas a esta promesa (badge Enviado). |
| `getOrCreatePortfolioShortUrl` | Short URL para promesa. |
| `getOrCreatePortfolioShortUrl` (portafolio) | Short URL para link de portafolio en el mensaje. |
| `getPortfolioFullDetail` | Detalle completo del portafolio para preview en modal. |
| `logWhatsAppSentWithMessage` | Registra envío en bitácora; opcional `whatsappTemplateId` para badge. |

### Layout y UX

- **Altura:** Contenedor principal `max-h-[85vh]`, tema `bg-zinc-950`, bordes `zinc-800`.
- **Scroll independiente:** Sidebar de plantillas y columna de portafolios con `overflow-y-auto`; encabezados y área de variables sticky.

---

## 💡 Guía de Uso Rápido

1. **Elegir:** Selecciona una plantilla del sidebar izquierdo (o arrastra para reordenar).
2. **Personalizar:** Usa los chips de variables para inyectar nombre, fecha, link promesa, etc.
3. **Presumir:** Añade un portafolio desde la columna central; usa el icono de ojo para previsualizarlo sin salir del modal.
4. **Disparar:** "Enviar WhatsApp" abre WhatsApp con el mensaje prellenado y registra el envío en la bitácora.
