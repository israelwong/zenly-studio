# 🌱 Seeds de Base de Datos - Zenly Studio

## 📋 Descripción

Sistema modular de seeds para inicializar la base de datos con datos de prueba y configuración.

**Ubicación:** Todos los seeds están en `/prisma/` (convención estándar de Prisma)

---

## 🚀 Seeds Disponibles

### 1. Seed Principal (`01-seed.ts`)

**Comando:** `npm run db:seed`

Inicializa la plataforma completa:

- ✅ Módulos de plataforma
- ✅ Redes sociales
- ✅ Canales de adquisición
- ✅ Planes con límites
- ✅ Demo Studio configurado
- ✅ Pipelines Marketing + Manager
- ✅ Catálogo de servicios
- ✅ Tipos de evento
- ✅ Demo Lead

---

### 2. Seed Usuarios Demo (`02-seed-demo-users.ts`)

**Comando:** `npm run db:seed-demo-users`

Crea usuarios de prueba con contraseñas hardcodeadas:

| Usuario      | Email                     | Contraseña | Rol                       | Acceso       |
| ------------ | ------------------------- | ---------- | ------------------------- | ------------ |
| Super Admin  | admin@prosocial.mx        | Admin123!  | SUPER_ADMIN               | /admin       |
| Studio Owner | owner@demo-studio.com     | Owner123!  | SUSCRIPTOR + OWNER        | /demo-studio |
| Fotógrafo    | fotografo@demo-studio.com | Foto123!   | SUSCRIPTOR + PHOTOGRAPHER | /demo-studio |

---

### 3. Seed Catálogo (`03-seed-catalogo.ts`)

**Comando:** `npm run db:seed-catalogo`

Crea el catálogo completo de servicios y productos para el demo studio.

**Uso:**

```bash
npm run db:seed-catalogo
```

---

### 4. Seed Promise Pipeline (`04-seed-promise-pipeline.ts`)

**Comando:** `npm run db:seed-promise-pipeline`

Crea las etapas del pipeline de promesas para un studio específico.

**Uso:**

```bash
npm run db:seed-promise-pipeline demo-studio
# O con parámetro:
npx tsx prisma/04-seed-promise-pipeline.ts demo-studio
```

---

### 5. Seed Contratos (`05-seed-contratos.ts`)

**Comando:** `npx tsx prisma/05-seed-contratos.ts`

Crea plantillas de contratos por defecto para todos los studios activos.

**Contenido:**
- ✅ Plantilla "Contrato General" por defecto
- ✅ Incluye estructura completa con variables dinámicas
- ✅ 8 variables mapeadas: @nombre_cliente, @fecha_evento, etc.
- ✅ Bloque especial [SERVICIOS_INCLUIDOS]

**Uso:**

```bash
npx tsx prisma/05-seed-contratos.ts
```

**Nota:** Solo crea plantilla si el studio no tiene una por defecto.

---

## 🔧 Uso Recomendado

### Para Desarrollo Completo

```bash
# 1. Inicializar plataforma
npm run db:seed

# 2. Crear usuarios demo
npm run db:seed-demo-users

# 3. Crear catálogo (opcional)
npm run db:seed-catalogo

# 4. Crear pipeline de promesas (opcional)
npm run db:seed-promise-pipeline

# 5. Crear plantillas de contratos
npx tsx prisma/05-seed-contratos.ts
```

### Para Reset Completo

```bash
# Reset completo con datos
npm run db:reset
```

### Solo Usuarios Demo

```bash
# Solo crear usuarios (requiere que exista el studio)
npm run db:seed-demo-users
```

---

## 🔐 Credenciales de Acceso

### Super Admin

- **Email:** admin@prosocial.mx
- **Contraseña:** Admin123!
- **URL:** /admin

### Studio Owner

- **Email:** owner@demo-studio.com
- **Contraseña:** Owner123!
- **URL:** /demo-studio

### Fotógrafo

- **Email:** fotografo@demo-studio.com
- **Contraseña:** Foto123!
- **URL:** /demo-studio

---

## 📝 Notas Importantes

1. **Supabase Auth:** Los usuarios se crean tanto en Supabase Auth como en la base de datos
2. **Orden de ejecución:** Los números al inicio del nombre indican el orden (01, 02, 03, 04)
3. **Idempotencia:** Los seeds son idempotentes (pueden ejecutarse múltiples veces sin duplicar datos)
4. **Ubicación:** Todos los seeds están en `/prisma/` según convención de Prisma

---

## 🗂️ Estructura de Seeds

```
prisma/
├── 01-seed.ts                 # Seed maestro (principal)
├── 02-seed-demo-users.ts      # Usuarios demo con auth
├── 03-seed-catalogo.ts        # Catálogo de servicios/productos
├── 04-seed-promise-pipeline.ts # Pipeline de promesas
├── 05-seed-contratos.ts       # Plantillas de contratos
└── README-seeds.md            # Este archivo
```

---

**Última actualización: 2025-12-01**
