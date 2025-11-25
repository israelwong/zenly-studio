# 🛠️ Scripts de Utilidad

Scripts de desarrollo y mantenimiento para ZEN Platform.

---

## 📋 Scripts Activos

### Prisma & Base de Datos

#### `prisma-safe.ts`
**Propósito:** Ejecutar comandos de Prisma con timeouts y manejo de errores mejorado

**Uso:** Usado automáticamente por `npm run db:push` y `npm run db:migrate`

**Comandos soportados:**
- `db push` - Sincronizar schema con base de datos
- `migrate dev` - Crear y aplicar migraciones

---

#### `prisma-with-direct.ts`
**Propósito:** Ejecutar comandos de Prisma usando conexión directa (DIRECT_URL) para evitar problemas con el pooler de Supabase

**Uso:** Usado automáticamente por `npm run db:reset`

**Comandos soportados:**
- `migrate reset` - Resetear base de datos y aplicar migraciones
- `db push` - Sincronizar schema
- `migrate dev` / `migrate deploy` - Con `--skip-shadow-database` para Supabase

---

#### `execute-sql.ts`
**Propósito:** Ejecutar archivos SQL directamente en la base de datos usando DIRECT_URL

**Uso:**
```bash
npm run db:execute-sql <ruta-al-archivo.sql>
```

**Ejemplo:**
```bash
npm run db:execute-sql prisma/migrations/manual_fix.sql
```

---

### Setup & Validación

#### `01-setup-complete.sh`
**Propósito:** Setup completo del proyecto (migrations + seeds)

**Uso:**
```bash
bash scripts/01-setup-complete.sh
```

**Ejecuta:**
1. Reset DB + Migrations (`npx supabase db reset`)
2. Seed Maestro (Platform Core)
3. Seed Usuarios Demo
4. Seed Catálogo
5. Seed Promise Pipeline
6. Validación final

---

#### `02-setup-seeds-only.sh`
**Propósito:** Ejecutar solo seeds sin resetear la base de datos

**Uso:**
```bash
bash scripts/02-setup-seeds-only.sh
```

**Ejecuta:**
1. Seed Maestro
2. Seed Usuarios Demo
3. Seed Catálogo
4. Seed Promise Pipeline
5. Validación (opcional)

---

#### `validate-auth-setup.ts`
**Propósito:** Validar que el sistema Auth + Realtime esté configurado correctamente

**Ejecutar:**
```bash
npx tsx scripts/validate-auth-setup.ts
```

**Validaciones:**
1. ✅ Usuarios existen en `auth.users`
2. ✅ Perfiles tienen `supabase_id` en `studio_user_profiles`
3. ✅ Auth y Profiles están sincronizados
4. ✅ RLS habilitado en `studio_user_profiles`
5. ✅ Políticas RLS existen y son correctas
6. ✅ Políticas Realtime configuradas

**Cuándo ejecutar:**
- Después de `npx supabase db reset`
- Después de ejecutar seed
- Antes de probar Realtime
- Al hacer debug de auth issues

---

## 📁 Estructura

```
scripts/
├── prisma-safe.ts          # Prisma con timeouts
├── prisma-with-direct.ts   # Prisma con conexión directa
├── execute-sql.ts          # Ejecutor SQL
├── validate-auth-setup.ts  # Validación Auth
├── verify-seeds.ts         # Verificación de seeds
├── 01-setup-complete.sh    # Setup completo (orden 1)
├── 02-setup-seeds-only.sh  # Solo seeds (orden 2)
└── README.md              # Este archivo
```

---

## 🔧 Scripts NPM Relacionados

Ver `package.json` para comandos completos:

- `npm run db:push` - Usa `prisma-safe.ts`
- `npm run db:migrate` - Usa `prisma-safe.ts`
- `npm run db:execute-sql` - Usa `execute-sql.ts`
- `npm run db:reset` - Usa `prisma-with-direct.ts`

---

## 📝 Convenciones

**Naming:** `kebab-case.ts` para TypeScript, `kebab-case.sh` para bash  
**Shebang:** `#!/usr/bin/env tsx` para TS, `#!/bin/bash` para bash  
**Error handling:** Exit code 0 (success) / 1 (error)  
**Logs:** Usar emojis para clarity 🎯

---

**Última actualización: 2025-01-20**
