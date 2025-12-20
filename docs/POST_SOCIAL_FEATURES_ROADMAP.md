# 📱 Post Social Features - Roadmap

## 🎯 Estado Actual (MVP - Fase 1)

**Implementado:**

- ✅ Visualización de posts públicos
- ✅ Contador de vistas (`view_count`)
- ✅ Copiar link del post
- ✅ Navegación entre posts
- ✅ Modal de detalle con query params

**UI Actual:**

```
[👁️ 125 vistas] [📋 Copiar link]
```

---

## 🚀 Fase 2: Sistema de Autenticación Pública

### Objetivo

Permitir que usuarios externos (no studios) puedan:

- Registrarse en la plataforma
- Dar "like" a posts
- Comentar posts
- Seguir studios

### Base de Datos

#### 1. Tabla de Usuarios Públicos

```prisma
model public_users {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatar_url    String?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  // Relaciones
  likes         post_likes[]
  comments      post_comments[]
  followers     studio_followers[]

  @@index([email])
}
```

#### 2. Sistema de Likes

```prisma
model post_likes {
  id         String   @id @default(cuid())
  post_id    String
  user_id    String
  created_at DateTime @default(now())

  post       studio_posts   @relation(fields: [post_id], references: [id], onDelete: Cascade)
  user       public_users   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([post_id, user_id])
  @@index([post_id])
  @@index([user_id])
}
```

#### 3. Sistema de Comentarios

```prisma
model post_comments {
  id         String   @id @default(cuid())
  post_id    String
  user_id    String
  comment    String
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  post       studio_posts   @relation(fields: [post_id], references: [id], onDelete: Cascade)
  user       public_users   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([post_id])
  @@index([user_id])
  @@index([created_at])
}
```

#### 4. Sistema de Seguidores (Opcional)

```prisma
model studio_followers {
  id         String   @id @default(cuid())
  studio_id  String
  user_id    String
  created_at DateTime @default(now())

  studio     studios       @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  user       public_users  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([studio_id, user_id])
  @@index([studio_id])
  @@index([user_id])
}
```

#### 5. Actualizar `studio_posts`

```prisma
model studio_posts {
  // ... campos existentes
  like_count    Int              @default(0)
  comment_count Int              @default(0)

  // Nuevas relaciones
  likes         post_likes[]
  comments      post_comments[]
}
```

---

## 🎨 UI Fase 2

### Botones de Interacción (Usuario No Autenticado)

```tsx
<div className="flex items-center justify-between">
  {/* Métricas */}
  <div className="flex items-center gap-4">
    <span className="text-sm text-zinc-500">
      <Heart className="w-4 h-4 inline" /> {post.like_count}
    </span>
    <span className="text-sm text-zinc-500">
      <MessageCircle className="w-4 h-4 inline" /> {post.comment_count}
    </span>
    <span className="text-sm text-zinc-500">
      <Eye className="w-4 h-4 inline" /> {post.view_count}
    </span>
  </div>

  {/* Acciones */}
  <button onClick={handleLoginPrompt} className="text-sm text-zinc-400">
    Iniciar sesión para interactuar
  </button>
</div>
```

### Botones de Interacción (Usuario Autenticado)

```tsx
<div className="flex items-center justify-between">
  {/* Acciones Interactivas */}
  <div className="flex items-center gap-4">
    {/* Like */}
    <button
      onClick={handleToggleLike}
      className={isLiked ? "text-red-500" : "text-zinc-400"}
    >
      <Heart className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`} />
    </button>

    {/* Comentar */}
    <button onClick={handleOpenComments}>
      <MessageCircle className="w-6 h-6 text-zinc-400" />
    </button>

    {/* Compartir */}
    <button onClick={handleShare}>
      <Share2 className="w-6 h-6 text-zinc-400" />
    </button>
  </div>

  {/* Contador de Vistas */}
  <span className="text-sm text-zinc-500">{post.view_count} vistas</span>
</div>;

{
  /* Sección de Comentarios (Expandible) */
}
{
  showComments && (
    <div className="border-t border-zinc-800 pt-4">
      {/* Lista de comentarios */}
      <CommentList comments={post.comments} />

      {/* Input para nuevo comentario */}
      <CommentInput onSubmit={handleAddComment} />
    </div>
  );
}
```

---

## 🔧 Server Actions Necesarias

### 1. Likes

```typescript
// src/lib/actions/public/post-interactions.actions.ts

"use server";

export async function togglePostLike(postId: string, userId: string) {
  const existing = await prisma.post_likes.findUnique({
    where: { post_id_user_id: { post_id: postId, user_id: userId } },
  });

  if (existing) {
    // Unlike
    await prisma.$transaction([
      prisma.post_likes.delete({ where: { id: existing.id } }),
      prisma.studio_posts.update({
        where: { id: postId },
        data: { like_count: { decrement: 1 } },
      }),
    ]);
    return { success: true, isLiked: false };
  } else {
    // Like
    await prisma.$transaction([
      prisma.post_likes.create({
        data: { post_id: postId, user_id: userId },
      }),
      prisma.studio_posts.update({
        where: { id: postId },
        data: { like_count: { increment: 1 } },
      }),
    ]);
    return { success: true, isLiked: true };
  }
}

export async function getPostLikeStatus(postId: string, userId: string) {
  const like = await prisma.post_likes.findUnique({
    where: { post_id_user_id: { post_id: postId, user_id: userId } },
  });
  return { isLiked: !!like };
}
```

### 2. Comments

```typescript
export async function addPostComment(
  postId: string,
  userId: string,
  comment: string
) {
  const newComment = await prisma.$transaction([
    prisma.post_comments.create({
      data: {
        post_id: postId,
        user_id: userId,
        comment,
      },
      include: {
        user: {
          select: { name: true, avatar_url: true },
        },
      },
    }),
    prisma.studio_posts.update({
      where: { id: postId },
      data: { comment_count: { increment: 1 } },
    }),
  ]);

  return { success: true, comment: newComment };
}

export async function getPostComments(postId: string) {
  const comments = await prisma.post_comments.findMany({
    where: { post_id: postId },
    include: {
      user: {
        select: { name: true, avatar_url: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return { success: true, comments };
}

export async function deletePostComment(commentId: string, userId: string) {
  const comment = await prisma.post_comments.findUnique({
    where: { id: commentId },
  });

  if (!comment || comment.user_id !== userId) {
    return { success: false, error: "No autorizado" };
  }

  await prisma.$transaction([
    prisma.post_comments.delete({ where: { id: commentId } }),
    prisma.studio_posts.update({
      where: { id: comment.post_id },
      data: { comment_count: { decrement: 1 } },
    }),
  ]);

  return { success: true };
}
```

---

## 🔐 Autenticación Pública

### Opciones de Implementación

#### Opción A: NextAuth.js con Providers Sociales

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Crear/actualizar usuario en public_users
      await prisma.public_users.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          name: user.name,
          avatar_url: user.image,
        },
        update: {
          name: user.name,
          avatar_url: user.image,
        },
      });
      return true;
    },
  },
});
```

#### Opción B: Supabase Auth

```typescript
// lib/supabase-public-auth.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
  });
  return { data, error };
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
```

---

## 📊 Métricas y Analytics

### Nuevas Métricas a Trackear

```typescript
interface PostAnalytics {
  post_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  unique_viewers: number;
  avg_time_viewed: number; // segundos
  engagement_rate: number; // (likes + comments) / views
}
```

### Dashboard para Studios

- 📈 Posts más populares
- 💬 Engagement rate por post
- 👥 Usuarios más activos
- 📊 Tendencias de interacción

---

## 🎯 Roadmap de Implementación

### Fase 2.1: Autenticación Básica (2-3 sprints)

- [ ] Setup NextAuth.js / Supabase Auth
- [ ] Crear tablas de usuarios públicos
- [ ] UI de login/registro
- [ ] Sesión persistente

### Fase 2.2: Sistema de Likes (1-2 sprints)

- [ ] Migración de base de datos (post_likes)
- [ ] Server actions para likes
- [ ] UI de botón like
- [ ] Contador en posts

### Fase 2.3: Sistema de Comentarios (2-3 sprints)

- [ ] Migración de base de datos (post_comments)
- [ ] Server actions para comentarios
- [ ] UI de lista de comentarios
- [ ] Input de nuevo comentario
- [ ] Notificaciones al studio (opcional)

### Fase 2.4: Analytics Avanzado (1-2 sprints)

- [ ] Dashboard de métricas
- [ ] Exportación de datos
- [ ] Insights de engagement

---

## 💡 Consideraciones Técnicas

### Performance

- Usar `like_count` y `comment_count` denormalizados para evitar COUNT queries
- Implementar paginación en comentarios
- Cache de contadores con Redis (opcional)

### Seguridad

- Rate limiting en likes/comments (ej: 10 likes/min)
- Validación de ownership en deletes
- Sanitización de contenido en comentarios
- Reportar contenido inapropiado

### UX

- Optimistic updates en likes (instant feedback)
- Loading states en comments
- Infinite scroll en comentarios
- Notificaciones push (opcional)

---

## 📝 Notas Adicionales

### Moderación

- Sistema de reportes de comentarios
- Auto-moderación con filtros de palabras
- Dashboard de moderación para studios

### Gamificación (Fase 3)

- Badges para usuarios activos
- Ranking de studios más populares
- Premios por engagement

---

**Última actualización:** Diciembre 2025
**Versión:** 1.0
**Status:** Documentación para implementación futura
