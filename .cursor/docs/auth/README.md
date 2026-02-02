# 📚 Documentación de Autenticación - Índice

**Última actualización:** 2 de febrero de 2026

---

## 🎯 Documentos Principales

### 1. [AUTENTICACION_MASTER.md](AUTENTICACION_MASTER.md) ⭐
**Fuente única de verdad para autenticación**

**Contenido:**
- Arquitectura completa del sistema de autenticación
- Login por contraseña (Server Actions)
- Login con Google OAuth (flujo PKCE detallado)
- Gestión de avatares con fallbacks múltiples
- Gestión de sesiones y timeouts
- 7+ problemas comunes con soluciones
- Mejores prácticas y anti-patrones
- Estructura de archivos completa

**Úsalo para:**
- ✅ Implementar login (password o Google)
- ✅ Resolver errores de OAuth/PKCE
- ✅ Configurar avatares
- ✅ Entender flujo de sesiones
- ✅ Troubleshooting de auth

---

### 2. [ONBOARDING.md](ONBOARDING.md) ⭐
**Sistema de registro y estructura multi-usuario**

**Contenido:**
- Flujo de onboarding (creación del primer estudio)
- Setup progresivo por secciones
- Estructura multi-usuario (user_studio_roles)
- Roles y permisos (StudioRole enum)
- Flujo completo end-to-end con ejemplos

**Úsalo para:**
- ✅ Implementar proceso de registro
- ✅ Crear estudios nuevos
- ✅ Entender roles y permisos
- ✅ Validar acceso por rol
- ✅ Setup progresivo

---

## 📖 Documentos Relacionados

### [../google-oauth-implementation.md](../google-oauth-implementation.md)
**OAuth directo para integraciones de Calendar y Drive**

**Diferencia con AUTENTICACION_MASTER.md:**
- AUTENTICACION_MASTER.md → Login del usuario (Supabase Auth)
- google-oauth-implementation.md → Conectar servicios (OAuth directo de Google)

**Úsalo para:**
- ✅ Conectar Google Calendar
- ✅ Conectar Google Drive
- ✅ Conectar Google Contacts
- ✅ OAuth unificado (múltiples servicios)

---

### [../PATRON_VALIDACION_USUARIO.md](../PATRON_VALIDACION_USUARIO.md)
**Patrón para validar usuario en Server Actions**

**Contenido:**
- Cómo obtener usuario autenticado
- Buscar en studio_user_profiles
- Buscar/crear studio_users
- Patrón completo con código

**Úsalo para:**
- ✅ Server Actions que requieren usuario
- ✅ Asociar registros al usuario actual
- ✅ Validación estándar de auth

---

## 🗂️ Estructura de Documentación

```
.cursor/docs/
├── auth/
│   ├── README.md                    ← Este archivo
│   ├── AUTENTICACION_MASTER.md      ⭐ Login + OAuth + Sesiones
│   └── ONBOARDING.md                ⭐ Registro + Roles
│
├── google-oauth-implementation.md    → Integraciones Calendar/Drive
└── PATRON_VALIDACION_USUARIO.md     → Validación en Server Actions
```

---

## 🔄 Flujo de Lectura Recomendado

### Nuevo Desarrollador

1. **[AUTENTICACION_MASTER.md](AUTENTICACION_MASTER.md)** - Entender cómo funciona el login
2. **[ONBOARDING.md](ONBOARDING.md)** - Entender registro y roles
3. **[../PATRON_VALIDACION_USUARIO.md](../PATRON_VALIDACION_USUARIO.md)** - Implementar validaciones

### Debugging de Auth

1. **[AUTENTICACION_MASTER.md](AUTENTICACION_MASTER.md)** → Sección "Problemas Comunes"
2. Si es sobre integraciones → **[../google-oauth-implementation.md](../google-oauth-implementation.md)**

### Implementar Funcionalidad

| Tarea | Documento |
|-------|-----------|
| Agregar nuevo método de login | AUTENTICACION_MASTER.md |
| Cambiar flujo de registro | ONBOARDING.md |
| Agregar nuevo rol | ONBOARDING.md → Roles y Permisos |
| Conectar otro servicio de Google | google-oauth-implementation.md |
| Validar usuario en Server Action | PATRON_VALIDACION_USUARIO.md |

---

## 🧹 Historial de Limpieza

**2 de febrero de 2026:**
- ✅ Creado AUTENTICACION_MASTER.md (fuente única de verdad)
- ✅ Creado ONBOARDING.md (extraído de AUTH_AND_ONBOARDING.md)
- ❌ Eliminado AUTH_AND_ONBOARDING.md (consolidado)
- ❌ Eliminado SESSION_MANAGEMENT.md (redundante)
- ❌ Eliminado SESSION_MANAGEMENT_RESUMEN.md (redundante)
- ✅ Actualizado google-oauth-implementation.md (referencia cruzada)
- ✅ Versionados todos los docs de .cursor/docs/

---

**Última revisión:** 2 de febrero de 2026  
**Mantenido por:** Israel Wong
