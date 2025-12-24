# Análisis: Avisos de Privacidad para ZEN Platform

## 📋 Resumen Ejecutivo

**Conclusión:** Se requieren **DOS avisos de privacidad separados**:
1. **Aviso de Privacidad de la Plataforma** - Para datos de usuarios de la plataforma y estudios
2. **Aviso de Privacidad por Estudio** - Para datos de clientes/contactos de cada estudio

---

## 🔍 Análisis de Responsabilidades

### Plataforma ZEN (Responsable Principal)
**Datos recopilados:**
- Usuarios de la plataforma (`platform_user_profiles`, `studio_users`)
- Información de estudios (`studios`)
- Datos de suscripciones y pagos
- Configuración y preferencias de usuarios

**Finalidades:**
- Gestión de cuentas y autenticación
- Procesamiento de suscripciones
- Soporte técnico
- Análisis y mejora del servicio
- Cumplimiento legal y fiscal

### Estudio Fotográfico (Responsable Secundario)
**Datos recopilados:**
- Contactos/clientes (`studio_contacts`): nombre, teléfono, email, dirección
- Eventos (`studio_events`)
- Contratos (`studio_event_contracts`)
- Cotizaciones (`studio_cotizaciones`)
- Pagos (`studio_pagos`)
- Personal/crew (`studio_crew_members`)

**Finalidades:**
- Gestión de clientes y eventos
- Procesamiento de contratos y cotizaciones
- Gestión de pagos y facturación
- Comunicación con clientes
- Cumplimiento contractual

---

## ⚖️ Requisitos Legales (LFPDPPP - México)

Según la **Ley Federal de Protección de Datos Personales en Posesión de los Particulares**, todo aviso de privacidad debe incluir:

### 1. Identidad y Domicilio del Responsable
- Nombre completo o razón social
- Domicilio completo
- Datos de contacto (teléfono, email)

### 2. Finalidades del Tratamiento
- **Primarias:** Esenciales para la relación contractual
- **Secundarias:** No esenciales (requieren consentimiento explícito)

### 3. Opciones y Medios para Limitar el Uso o Divulgación
- Mecanismos para restringir uso de datos
- Procedimientos para revocar consentimiento

### 4. Medios para Ejercer los Derechos ARCO
- **Acceso:** Conocer qué datos se tienen
- **Rectificación:** Corregir datos incorrectos
- **Cancelación:** Eliminar datos
- **Oposición:** Oponerse al tratamiento

### 5. Transferencias de Datos
- Terceros con quienes se comparten datos
- Finalidad de las transferencias
- Consentimiento para transferencias

### 6. Procedimiento para Comunicar Cambios
- Cómo se notificarán modificaciones al aviso
- Medios de comunicación

---

## 🏗️ Estructura Propuesta

### Base de Datos

**Tabla: `studio_avisos_privacidad`**
- Similar a `studio_terminos_condiciones`
- Permite múltiples versiones por estudio
- Historial de cambios
- Versión activa

**Campo en `platform_config`:**
- `aviso_privacidad_plataforma` (String?) - Ya existe `politica_privacidad`, pero necesitamos campo específico para aviso

### Funcionalidades

1. **Gestión por Estudio:**
   - CRUD de avisos de privacidad
   - Versiones y historial
   - Activar/desactivar versión
   - Vista previa pública

2. **Gestión de Plataforma:**
   - Edición en admin/configuración
   - Versión única (o historial si se requiere)

3. **Visualización:**
   - Footer de plataforma (enlace a aviso)
   - Portal de cliente (enlace a aviso del estudio)
   - Formularios de registro (aceptación)

---

## 📝 Contenido Mínimo Requerido

### Aviso de Privacidad de la Plataforma

```markdown
1. IDENTIDAD Y DOMICILIO
   - Razón social: [Nombre de la empresa]
   - Domicilio: [Dirección completa]
   - Contacto: [Email, teléfono]

2. FINALIDADES PRIMARIAS
   - Gestión de cuentas de usuario
   - Procesamiento de suscripciones
   - Prestación del servicio SaaS
   - Facturación y cobro

3. FINALIDADES SECUNDARIAS
   - Marketing y promociones
   - Análisis y estadísticas
   - Mejora del servicio

4. DATOS RECOPILADOS
   - Datos de identificación
   - Datos de contacto
   - Datos financieros (Stripe)
   - Datos de uso

5. TRANSFERENCIAS
   - Proveedores de servicios (hosting, email, pagos)
   - Autoridades (cuando sea requerido)

6. DERECHOS ARCO
   - Procedimiento para ejercer derechos
   - Contacto: [Email de privacidad]

7. CAMBIOS AL AVISO
   - Notificación por email o en plataforma
```

### Aviso de Privacidad por Estudio

```markdown
1. IDENTIDAD Y DOMICILIO
   - Nombre del estudio: [studio_name]
   - Domicilio: [address]
   - Contacto: [email, teléfono]

2. FINALIDADES PRIMARIAS
   - Gestión de clientes y contactos
   - Procesamiento de eventos
   - Elaboración de contratos y cotizaciones
   - Gestión de pagos

3. FINALIDADES SECUNDARIAS
   - Marketing y promociones
   - Referencias y testimonios

4. DATOS RECOPILADOS
   - Nombre completo
   - Teléfono
   - Email
   - Dirección
   - Información de eventos
   - Datos financieros (pagos)

5. TRANSFERENCIAS
   - Plataforma ZEN (como procesador de datos)
   - Proveedores de servicios del estudio
   - Autoridades (cuando sea requerido)

6. DERECHOS ARCO
   - Procedimiento para ejercer derechos
   - Contacto del estudio

7. CAMBIOS AL AVISO
   - Notificación por email o en portal
```

---

## ✅ Recomendaciones

1. **Implementar ambos avisos** - Cumplimiento legal completo
2. **Versionado** - Permitir historial de cambios
3. **Aceptación explícita** - Checkbox en registros y formularios
4. **Acceso público** - Enlaces visibles en footer y portales
5. **Actualización automática** - Notificar cambios a usuarios/clientes
6. **Plantilla base** - Proporcionar template con requisitos mínimos

---

## 🔗 Referencias

- [LFPDPPP - Ley Federal de Protección de Datos Personales](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf)
- [INAI - Guías y Formatos](https://home.inai.org.mx/)
- [Secretaría de Economía - Guía de Avisos de Privacidad](https://www.economia.gob.mx/files/transparencia/gobmx/docs/anexo_guia_1_Informacionsobreelavisoolosavisosdeprivacidadintegrales.pdf)

