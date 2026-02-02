# Extracto: `studios` y relación con `user_studio_roles`

Referencia rápida para `subscription_status`, `subscription_end` y vinculación OWNER.

---

## 1. Enum `SubscriptionStatus` (valores permitidos)

```prisma
enum SubscriptionStatus {
  TRIAL
  ACTIVE
  CANCELLED
  PAUSED
  EXPIRED
  UNLIMITED
}
```

---

## 2. Campos en `studios` (suscripción y fechas)

```prisma
model studios {
  id                   String             @id @default(cuid())
  studio_name          String
  slug                 String             @unique
  email                String             @unique
  // ... otros campos ...

  subscription_status  SubscriptionStatus @default(TRIAL)   // ← Valores: TRIAL | ACTIVE | CANCELLED | PAUSED | EXPIRED | UNLIMITED
  subscription_start   DateTime?                            // ← Opcional, sin valor por defecto
  subscription_end     DateTime?                            // ← Opcional, sin valor por defecto (se setea al crear trial/plan)
  data_retention_until DateTime?                            // Fecha hasta la cual se mantienen datos tras cancelación (30 días)

  // ... stripe_*, is_active, etc. ...

  user_studio_roles    user_studio_roles[]                  // ← Relación 1:N con user_studio_roles

  @@index([subscription_status])
  // ...
}
```

- **subscription_status:** tipo `SubscriptionStatus`, valor por defecto **TRIAL**.
- **subscription_start:** `DateTime?` — opcional, sin `@default`; se inicializa en código (ej. al crear trial).
- **subscription_end:** `DateTime?` — opcional, sin `@default`; se inicializa en código (ej. `now() + 7 días` para trial).

---

## 3. Modelo `user_studio_roles` (vinculación usuario–estudio, OWNER)

```prisma
model user_studio_roles {
  id          String    @id @default(cuid())
  user_id     String
  studio_id   String
  role        StudioRole    // OWNER | ADMIN | MANAGER | PHOTOGRAPHER | EDITOR | ASSISTANT | PROVIDER | CLIENT
  permissions Json?
  is_active   Boolean   @default(true)
  invited_at  DateTime  @default(now())
  invited_by  String?
  accepted_at DateTime?     // ← Usado para ordenar “último estudio” (accepted_at desc)
  revoked_at  DateTime?

  studio      studios   @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  user        users     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, studio_id, role])
  @@index([user_id, is_active])
  @@index([studio_id, is_active])
  @@index([role, is_active])
  @@index([user_id, studio_id, is_active])
}
```

---

## 4. Enum `StudioRole` (rol en el estudio)

```prisma
enum StudioRole {
  OWNER
  ADMIN
  MANAGER
  PHOTOGRAPHER
  EDITOR
  ASSISTANT
  PROVIDER
  CLIENT
}
```

---

## 5. Cómo vincular OWNER al nuevo estudio

Al crear un estudio nuevo, hay que crear **una fila en `user_studio_roles`** que una al usuario creador con ese estudio como **OWNER**:

- **user_id:** `id` del usuario en la tabla `users` (no `supabase_id`).
- **studio_id:** `id` del estudio recién creado en `studios`.
- **role:** `OWNER`.
- **is_active:** `true`.
- **accepted_at:** `new Date()` (para que cuente como “estudio aceptado” y aparezca en el flujo de “último studio” por `accepted_at desc`).

Ejemplo en código (Prisma):

```ts
await prisma.user_studio_roles.create({
  data: {
    user_id: dbUser.id,
    studio_id: studio.id,
    role: 'OWNER',
    is_active: true,
    accepted_at: new Date(),
  },
});
```

La relación queda así: **studios** `1` → **user_studio_roles** `N` (por `studio_id`), y **users** `1` → **user_studio_roles** `N` (por `user_id`). El OWNER es la fila con `role: 'OWNER'` y `studio_id` del estudio creado.
