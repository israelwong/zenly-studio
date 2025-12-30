# 🎯 Flujo Completo de Contratos - ZEN Platform

## 📋 Resumen Ejecutivo

Sistema completo de gestión de contratos que separa la autorización de cotizaciones de la creación de eventos, asegurando que los contratos se firmen **ANTES** de crear el evento en el pipeline de gestión.

---

## 🏗️ Arquitectura Implementada

### Base de Datos (FASE 1) ✅

**Nuevos Campos:**

```sql
-- platform_config
auto_generate_contract BOOLEAN DEFAULT false
require_contract_before_event BOOLEAN DEFAULT true

-- studio_eventos (studio_events en Prisma)
contract_id TEXT (FK a studio_event_contracts)

-- studio_contacts
data_confirmed_at TIMESTAMPTZ
data_confirmed_ip INET

-- studio_event_contracts
signed_ip INET
```

**Nuevos Estados de Cotización:**
- `contract_pending` → Esperando confirmación de datos del cliente
- `contract_generated` → Contrato generado, esperando firma
- `contract_signed` → Contrato firmado, esperando autorización del studio
- `autorizada` → Evento autorizado y creado

---

## 🔄 Flujo Completo

### 1️⃣ PROSPECTO AUTORIZA COTIZACIÓN

**Ubicación:** Portal Público o Studio

**Acción:**
```typescript
autorizarCotizacion(data)
```

**Resultado:**
- ✅ Cotización → `contract_pending`
- ✅ Promesa → etapa "approved"
- ✅ Otras cotizaciones → archivadas
- ❌ NO se crea evento

**UI Studio:**
- Badge ámbar: "Contrato Pendiente"
- Mensaje: "Esperando confirmación de datos del cliente"

---

### 2️⃣ CLIENTE CONFIRMA DATOS

**Ubicación:** Portal del Cliente (`/[slug]/cliente/[clientId]/[eventId]`)

**Componente:** `ConfirmClientDataCard`

**Flujo:**
1. Cliente accede a su portal
2. Ve card "Confirma tus Datos"
3. Revisa información actual
4. Click "Revisar y Confirmar Datos"
5. Modal con formulario editable
6. Actualiza datos si es necesario
7. Click "Confirmar Datos"

**Acción:**
```typescript
confirmClientDataAndGenerateContract(studioSlug, promiseId, {
  contact_id,
  name,
  phone,
  email,
  address,
  ip_address
})
```

**Resultado:**
- ✅ Contacto actualizado con datos confirmados
- ✅ `data_confirmed_at` + `data_confirmed_ip` registrados
- ✅ Status → "cliente"

**Si `auto_generate_contract = true`:**
- ✅ Contrato generado automáticamente desde plantilla default
- ✅ Contrato publicado (status: PUBLISHED)
- ✅ Cotización → `contract_generated`

**Si `auto_generate_contract = false`:**
- ✅ Cotización → `contract_pending`
- ⏳ Studio debe generar contrato manualmente

**UI Cliente:**
- Card desaparece
- Aparece card "Tu Contrato" (si auto-generado)

**UI Studio:**
- Badge azul: "Contrato Generado" (si auto)
- Badge ámbar: "Contrato Pendiente" (si manual)

---

### 3️⃣ STUDIO GENERA CONTRATO (Manual)

**Ubicación:** `/[slug]/studio/commercial/promises/[promiseId]`

**Componente:** `PromiseContractCard`

**Flujo:**
1. Studio ve badge "Contrato Pendiente"
2. Click "Anexar" o "Generar Contrato"
3. Selecciona plantilla
4. Edita contenido si es necesario
5. Guarda contrato (status: DRAFT)
6. Click "Publicar para revisión del cliente"

**Acción:**
```typescript
generateEventContract(studioSlug, { event_id, template_id })
publishEventContract(studioSlug, contractId)
```

**Resultado:**
- ✅ Contrato creado y publicado
- ✅ Cotización → `contract_generated`

**UI Studio:**
- Badge azul: "Contrato Generado"
- Contrato visible con estado "Publicado"

**UI Cliente:**
- Aparece card "Tu Contrato"

---

### 4️⃣ CLIENTE FIRMA CONTRATO

**Ubicación:** Portal del Cliente

**Componente:** `ClientContractViewCard`

**Flujo:**
1. Cliente ve card "Tu Contrato"
2. Badge azul: "Pendiente de Firma"
3. Click "Ver Contrato"
4. Modal con contenido completo del contrato
5. Revisa términos y condiciones
6. Click "Firmar Contrato"
7. Modal de confirmación con advertencias legales
8. Click "Sí, Firmar Contrato"

**Acción:**
```typescript
signContract(studioSlug, contactId, {
  contract_id,
  ip_address
})
```

**Resultado:**
- ✅ Contrato → status "SIGNED"
- ✅ `signed_at` + `signed_ip` registrados
- ✅ Cotización → `contract_signed`

**UI Cliente:**
- Badge verde: "Firmado"
- Mensaje: "¡Contrato firmado! El studio está revisando..."
- Botón "Firmar" desaparece

**UI Studio:**
- Badge verde: "Contrato Firmado"
- Aparece botón "Autorizar Evento"

---

### 5️⃣ STUDIO AUTORIZA EVENTO

**Ubicación:** `/[slug]/studio/commercial/promises/[promiseId]`

**Componente:** `PromiseContractCard` + `AuthorizeEventModal`

**Flujo:**
1. Studio ve badge verde "Contrato Firmado"
2. Click "Autorizar Evento"
3. Modal con información de cotización
4. Opción de registrar pago inicial (opcional)
5. Click "Autorizar Evento"

**Acción:**
```typescript
authorizeEventAfterContract(studioSlug, {
  promise_id,
  cotizacion_id,
  contract_id,
  register_payment,
  payment_amount,
  payment_method_id
})
```

**Resultado:**
- ✅ `studio_events.contract_id` = contract_id (vinculación)
- ✅ Evento → etapa "Autorizado"
- ✅ Cotización → `autorizada`
- ✅ Pago inicial registrado (si se indicó)

**UI Studio:**
- Evento aparece en `/studio/business/events`
- Badge verde: "Autorizada"
- Botón "Autorizar Evento" desaparece

**UI Cliente:**
- Evento visible en dashboard
- Pipeline stages actualizados

---

## 🎨 Estados Visuales

### Badges de Cotización (`PromiseQuotesPanelCard`)

| Estado | Color | Label | Descripción |
|--------|-------|-------|-------------|
| `pendiente` | Gris | Pendiente | Cotización creada, sin autorizar |
| `preautorizada` | Azul | Pre autorizada | Prospecto autorizó desde portal público |
| `contract_pending` | Ámbar | Contrato Pendiente | Esperando confirmación de datos |
| `contract_generated` | Azul | Contrato Generado | Esperando firma del cliente |
| `contract_signed` | Verde | Contrato Firmado | Listo para autorizar evento |
| `autorizada` | Verde | Autorizada | Evento autorizado y creado |

### Estados de Contrato

| Estado | Descripción | Acciones Disponibles |
|--------|-------------|---------------------|
| `DRAFT` | Borrador (solo studio) | Editar, Publicar, Eliminar |
| `PUBLISHED` | Publicado (visible para cliente) | Ver, Firmar (cliente) / Editar (studio) |
| `SIGNED` | Firmado por cliente | Solo lectura, Autorizar Evento (studio) |
| `CANCELLED` | Cancelado | Solo lectura |

---

## 🔐 Seguridad y Validez Legal

### Registro de IPs

**Confirmación de Datos:**
```typescript
data_confirmed_at: DateTime
data_confirmed_ip: INET
```

**Firma de Contrato:**
```typescript
signed_at: DateTime
signed_ip: INET
```

### Validaciones

**Datos Obligatorios para Contrato:**
- ✅ Nombre completo
- ✅ Teléfono
- ✅ Email
- ✅ Dirección completa

**Validaciones de Flujo:**
- ❌ No se puede firmar contrato sin confirmar datos
- ❌ No se puede autorizar evento sin contrato firmado
- ❌ No se puede modificar contrato firmado
- ❌ Solo puede haber un contrato activo por evento

---

## 🛠️ Configuración del Studio

### `platform_config`

**`auto_generate_contract` (default: false)**
- `true`: Genera contrato automáticamente al confirmar datos
- `false`: Studio genera contrato manualmente

**`require_contract_before_event` (default: true)**
- `true`: Requiere contrato firmado antes de crear evento
- `false`: Permite crear evento sin contrato (legacy)

### Plantilla Default

**Requerimiento:**
- Si `auto_generate_contract = true`, DEBE existir plantilla default
- Si no existe, muestra error al cliente

**Configuración:**
```
/studio/business/contracts/templates
→ Marcar plantilla como "Default"
```

---

## 📝 Server Actions Implementados

### Cliente

**`confirmClientDataAndGenerateContract()`**
- Ubicación: `src/lib/actions/cliente/contract.actions.ts`
- Valida y actualiza datos del contacto
- Registra IP y timestamp
- Genera contrato si `auto_generate_contract = true`

**`signContract()`**
- Ubicación: `src/lib/actions/cliente/contract.actions.ts`
- Valida que contrato esté en estado PUBLISHED
- Registra firma con IP y timestamp
- Actualiza cotización a `contract_signed`

### Studio

**`authorizeEventAfterContract()`**
- Ubicación: `src/lib/actions/studio/commercial/promises/authorize-event.actions.ts`
- Verifica contrato firmado (SIGNED)
- Vincula contract_id al evento
- Mueve evento a etapa "Autorizado"
- Registra pago inicial (opcional)

**`autorizarCotizacion()` (Modificado)**
- Ubicación: `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts`
- **CAMBIO CRÍTICO:** NO crea evento
- Solo cambia status a `contract_pending`
- Mueve promesa a "approved"

---

## 🧪 Casos de Prueba

### ✅ Flujo Normal (Auto-generación)

1. Prospecto autoriza cotización
2. Cliente confirma datos
3. Contrato generado automáticamente
4. Cliente firma contrato
5. Studio autoriza evento
6. Evento creado

### ✅ Flujo Manual (Sin auto-generación)

1. Prospecto autoriza cotización
2. Cliente confirma datos
3. Studio genera contrato manualmente
4. Studio publica contrato
5. Cliente firma contrato
6. Studio autoriza evento
7. Evento creado

### ✅ Cliente Solicita Cambios

1. Cliente ve contrato
2. Cliente solicita cambios (comunicación externa)
3. Studio edita contrato
4. Nueva versión generada
5. Cliente revisa y firma
6. Studio autoriza evento

### ✅ Legacy (Importación de Clientes)

1. Studio crea cotización directamente
2. Studio genera contrato manualmente
3. Studio publica contrato
4. Cliente firma (o studio marca como firmado)
5. Studio autoriza evento

---

## 🚨 Puntos de Revisión

### 1. Flujo de Autorización

**Pregunta:** ¿El flujo actual de `autorizarCotizacion()` está correcto?

**Actual:**
- NO crea evento
- Solo cambia a `contract_pending`

**Revisar:**
- ¿Hay casos donde se necesite crear evento inmediatamente?
- ¿Importación de clientes legacy funciona?

### 2. Generación Automática

**Pregunta:** ¿La lógica de auto-generación es correcta?

**Actual:**
- Genera si `auto_generate_contract = true`
- Requiere plantilla default
- Publica inmediatamente

**Revisar:**
- ¿Studio debe revisar antes de publicar?
- ¿Notificaciones al cliente?

### 3. Datos Obligatorios

**Pregunta:** ¿Los campos obligatorios son correctos?

**Actual:**
- Nombre, teléfono, email, dirección

**Revisar:**
- ¿Faltan campos? (RFC, datos de festejados, etc.)
- ¿Campos opcionales según tipo de evento?

### 4. Notificaciones

**Pregunta:** ¿Qué notificaciones se necesitan?

**Pendiente:**
- Cliente: "Contrato listo para revisión"
- Studio: "Cliente firmó contrato"
- Studio: "Cliente confirmó datos"
- Cliente: "Evento autorizado"

### 5. Permisos y Accesos

**Pregunta:** ¿El acceso del cliente es correcto?

**Actual:**
- Auth por número telefónico
- Ve eventos asociados a su contactId

**Revisar:**
- ¿Seguridad suficiente?
- ¿Necesita 2FA?

### 6. Manejo de Errores

**Pregunta:** ¿Qué pasa si...?

**Casos:**
- Cliente no tiene email → ❓ Validar antes
- No hay plantilla default → ❓ Error mostrado
- Cliente cierra navegador a mitad de firma → ✅ No se guarda
- Studio elimina contrato después de firma → ❓ Prevenir
- Múltiples contratos activos → ✅ Prevenido

### 7. Migración de Datos Legacy

**Pregunta:** ¿Cómo manejar clientes existentes?

**Escenarios:**
- Eventos sin contrato → ❓ Generar retroactivamente?
- Contratos sin firma → ❓ Marcar como firmados?
- Cotizaciones en estados antiguos → ❓ Migrar a nuevos estados?

---

## 📊 Métricas y Monitoreo

### KPIs Sugeridos

1. **Tiempo promedio de firma**
   - Desde `contract_generated` hasta `contract_signed`

2. **Tasa de conversión**
   - % de contratos publicados que se firman

3. **Tasa de abandono**
   - % de clientes que no confirman datos
   - % de clientes que no firman después de ver contrato

4. **Contratos editados**
   - Número de versiones por contrato
   - Motivos de edición

5. **Tiempo de autorización**
   - Desde `contract_signed` hasta evento autorizado

---

## 🔄 Próximos Pasos

### Inmediatos

1. ✅ Testing del flujo completo
2. ✅ Revisión de casos edge
3. ⏳ Implementar notificaciones
4. ⏳ Documentar para usuarios finales

### Futuro

1. ⏳ Firma electrónica avanzada (e-signature)
2. ⏳ Exportar contratos a PDF
3. ⏳ Historial de cambios detallado
4. ⏳ Plantillas dinámicas con más variables
5. ⏳ Integración con sistemas de pago

---

## 📚 Archivos Clave

### Base de Datos
- `supabase/migrations/20251230000001_add_contract_workflow_fields.sql`
- `prisma/schema.prisma`

### Server Actions
- `src/lib/actions/cliente/contract.actions.ts`
- `src/lib/actions/studio/commercial/promises/authorize-event.actions.ts`
- `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts`

### Schemas
- `src/lib/actions/schemas/client-contract-schemas.ts`
- `src/lib/actions/schemas/cotizaciones-schemas.ts`

### Componentes Studio
- `src/app/[slug]/studio/commercial/promises/[promiseId]/components/PromiseContractCard.tsx`
- `src/app/[slug]/studio/commercial/promises/[promiseId]/components/AuthorizeEventModal.tsx`
- `src/app/[slug]/studio/commercial/promises/components/PromiseQuotesPanelCard.tsx`

### Componentes Cliente
- `src/app/[slug]/cliente/[clientId]/[eventId]/components/ConfirmClientDataCard.tsx`
- `src/app/[slug]/cliente/[clientId]/[eventId]/components/ClientContractViewCard.tsx`
- `src/app/[slug]/cliente/[clientId]/[eventId]/page.tsx`

---

## ✅ Checklist de Revisión

### Funcionalidad
- [ ] Flujo completo funciona de inicio a fin
- [ ] Estados de cotización se actualizan correctamente
- [ ] Contratos se generan correctamente
- [ ] Firmas se registran con IP
- [ ] Eventos se crean después de autorización
- [ ] Badges visuales correctos

### Seguridad
- [ ] IPs se registran correctamente
- [ ] Validaciones de permisos funcionan
- [ ] No se pueden modificar contratos firmados
- [ ] Solo un contrato activo por evento

### UX
- [ ] Mensajes claros para el cliente
- [ ] Mensajes claros para el studio
- [ ] Loading states apropiados
- [ ] Error handling completo
- [ ] Confirmaciones antes de acciones críticas

### Edge Cases
- [ ] Cliente sin email
- [ ] Sin plantilla default
- [ ] Múltiples intentos de firma
- [ ] Navegador cerrado a mitad de proceso
- [ ] Datos incompletos

### Performance
- [ ] Queries optimizadas
- [ ] Realtime updates funcionan
- [ ] No hay N+1 queries
- [ ] Índices de BD correctos

---

**Fecha de Implementación:** 29 de Diciembre, 2025  
**Rama:** `251229-studio-promise-contracts`  
**Estado:** ✅ Implementación Completa - Pendiente de Revisión y Testing

