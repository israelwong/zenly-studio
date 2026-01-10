# 📋 Auditoría e Implementación: ZEN Conversations (ManyChat Integration)

**Fecha:** 2025-01-09  
**Versión:** 1.0  
**Estado:** Plan de Implementación

---

## 🎯 Resumen Ejecutivo

Este documento detalla la auditoría técnica y el plan de implementación para el módulo **ZEN Conversations**, un sistema de comunicaciones unificado basado en ManyChat que permite:

- Trazabilidad completa del ciclo de vida del cliente (Prospecto → Cliente)
- Historial de conversaciones vinculado a Promesas y Eventos
- Interfaz de chat integrada en vistas de detalle
- Sincronización bidireccional con ManyChat
- Actualizaciones en tiempo real mediante Supabase Realtime

---

## 1. 📊 Modificaciones al Schema Prisma

### 1.1 Nuevas Tablas

```prisma
// ============================================
// TABLA: studio_manychat_config
// ============================================
// Almacena credenciales de ManyChat por Studio (encriptadas)
model studio_manychat_config {
  id                    String   @id @default(cuid())
  studio_id             String   @unique
  api_key               String   // Encriptado con encryptToken()
  page_id               String?  // ID de la página de Facebook conectada
  is_connected          Boolean  @default(false)
  connected_at          DateTime?
  last_sync_at          DateTime?
  webhook_url           String?  // URL del webhook configurado en ManyChat
  custom_fields_synced  Json?    // Estado de sincronización de Custom User Fields
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  
  studio                studios  @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  
  @@index([studio_id, is_connected])
}

// ============================================
// TABLA: studio_contacts
// ============================================
// Agregar campo manychat_user_id al modelo existente
model studio_contacts {
  // ... campos existentes ...
  manychat_user_id      String?  // ID del usuario en ManyChat
  manychat_synced_at   DateTime? // Última sincronización con ManyChat
  
  // ... relaciones existentes ...
  
  @@index([studio_id, manychat_user_id])
}

// ============================================
// TABLA: studio_conversations
// ============================================
// Mensajes de conversación vinculados a entidades (Promise/Event)
model studio_conversations {
  id                    String   @id @default(cuid())
  studio_id             String
  contact_id            String
  manychat_message_id  String?  // ID del mensaje en ManyChat (para evitar duplicados)
  
  // Contexto de la conversación (polimórfico)
  entity_type           String   // "promise" | "event" | "general"
  entity_id             String?  // ID de la Promise o Event (null si es general)
  
  // Contenido del mensaje
  message_text          String
  message_type          String   @default("text") // "text" | "image" | "file" | "audio"
  media_url             String?
  
  // Dirección
  direction             String   @default("inbound") // "inbound" | "outbound"
  sender_type           String   @default("contact") // "contact" | "studio" | "manychat_bot"
  
  // Metadatos
  manychat_tags         Json?    // Tags de ManyChat asociados al mensaje
  manychat_flow_id      String?  // ID del flow de ManyChat que generó el mensaje
  sent_at               DateTime @default(now())
  delivered_at          DateTime?
  read_at               DateTime?
  
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  
  studio                studios  @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  contact               studio_contacts @relation(fields: [contact_id], references: [id], onDelete: Cascade)
  promise               studio_promises? @relation(fields: [entity_id], references: [id], onDelete: SetNull)
  event                 studio_events? @relation(fields: [entity_id], references: [id], onDelete: SetNull)
  
  @@unique([studio_id, manychat_message_id])
  @@index([studio_id, contact_id])
  @@index([studio_id, entity_type, entity_id])
  @@index([studio_id, sent_at])
  @@index([contact_id, entity_type, entity_id])
}

// ============================================
// RELACIONES EN MODELOS EXISTENTES
// ============================================

// En studio_promises agregar:
model studio_promises {
  // ... campos existentes ...
  conversations         studio_conversations[]
}

// En studio_events agregar:
model studio_events {
  // ... campos existentes ...
  conversations         studio_conversations[]
}

// En studios agregar:
model studios {
  // ... campos existentes ...
  manychat_config       studio_manychat_config?
}
```

### 1.2 Migración SQL

```sql
-- ============================================
-- MIGRACIÓN: ZEN Conversations (ManyChat)
-- ============================================

-- 1. Crear tabla studio_manychat_config
CREATE TABLE IF NOT EXISTS public.studio_manychat_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  page_id TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  webhook_url TEXT,
  custom_fields_synced JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_studio_manychat_config_studio
    FOREIGN KEY (studio_id)
    REFERENCES public.studios(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_studio_manychat_config_studio_connected 
  ON public.studio_manychat_config(studio_id, is_connected);

-- 2. Agregar campos a studio_contacts
ALTER TABLE public.studio_contacts
  ADD COLUMN IF NOT EXISTS manychat_user_id TEXT,
  ADD COLUMN IF NOT EXISTS manychat_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_studio_contacts_manychat_user 
  ON public.studio_contacts(studio_id, manychat_user_id);

-- 3. Crear tabla studio_conversations
CREATE TABLE IF NOT EXISTS public.studio_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  manychat_message_id TEXT,
  
  entity_type TEXT NOT NULL CHECK (entity_type IN ('promise', 'event', 'general')),
  entity_id TEXT,
  
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio')),
  media_url TEXT,
  
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL DEFAULT 'contact' CHECK (sender_type IN ('contact', 'studio', 'manychat_bot')),
  
  manychat_tags JSONB,
  manychat_flow_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_studio_conversations_studio
    FOREIGN KEY (studio_id)
    REFERENCES public.studios(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_studio_conversations_contact
    FOREIGN KEY (contact_id)
    REFERENCES public.studio_contacts(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_studio_conversations_promise
    FOREIGN KEY (entity_id)
    REFERENCES public.studio_promises(id)
    ON DELETE SET NULL
    CHECK ((entity_type = 'promise' AND entity_id IS NOT NULL) OR (entity_type != 'promise')),
    
  CONSTRAINT fk_studio_conversations_event
    FOREIGN KEY (entity_id)
    REFERENCES public.studio_events(id)
    ON DELETE SET NULL
    CHECK ((entity_type = 'event' AND entity_id IS NOT NULL) OR (entity_type != 'event'))
);

CREATE UNIQUE INDEX idx_studio_conversations_manychat_message 
  ON public.studio_conversations(studio_id, manychat_message_id) 
  WHERE manychat_message_id IS NOT NULL;

CREATE INDEX idx_studio_conversations_studio_contact 
  ON public.studio_conversations(studio_id, contact_id);

CREATE INDEX idx_studio_conversations_entity 
  ON public.studio_conversations(studio_id, entity_type, entity_id);

CREATE INDEX idx_studio_conversations_sent_at 
  ON public.studio_conversations(studio_id, sent_at DESC);

CREATE INDEX idx_studio_conversations_contact_entity 
  ON public.studio_conversations(contact_id, entity_type, entity_id);

-- 4. Habilitar RLS
ALTER TABLE public.studio_manychat_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_conversations ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para studio_manychat_config
CREATE POLICY "studio_manychat_config_read_studio"
  ON public.studio_manychat_config
  FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

CREATE POLICY "studio_manychat_config_update_studio"
  ON public.studio_manychat_config
  FOR UPDATE
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

CREATE POLICY "studio_manychat_config_insert_studio"
  ON public.studio_manychat_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

-- 6. Políticas RLS para studio_conversations
CREATE POLICY "studio_conversations_read_studio"
  ON public.studio_conversations
  FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

CREATE POLICY "studio_conversations_insert_studio"
  ON public.studio_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

CREATE POLICY "studio_conversations_update_studio"
  ON public.studio_conversations
  FOR UPDATE
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

-- 7. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_studio_manychat_config_updated_at
  BEFORE UPDATE ON public.studio_manychat_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_studio_conversations_updated_at
  BEFORE UPDATE ON public.studio_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Trigger para Realtime (broadcast de nuevos mensajes)
CREATE OR REPLACE FUNCTION notify_conversation_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'conversation_insert',
    json_build_object(
      'operation', 'INSERT',
      'studio_id', NEW.studio_id,
      'contact_id', NEW.contact_id,
      'entity_type', NEW.entity_type,
      'entity_id', NEW.entity_id,
      'id', NEW.id
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_insert_notify
  AFTER INSERT ON public.studio_conversations
  FOR EACH ROW
  EXECUTE FUNCTION notify_conversation_insert();

-- ============================================
-- TABLA: studio_chat_templates (Fase 1.5)
-- ============================================
CREATE TABLE IF NOT EXISTS public.studio_chat_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id TEXT, -- null = plantilla base de plataforma
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Contenido con variables {{variable}}
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('bienvenida', 'seguimiento', 'confirmacion', 'general')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false, -- Solo una plantilla por categoría puede ser default
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_studio_chat_templates_studio
    FOREIGN KEY (studio_id)
    REFERENCES public.studios(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_studio_chat_templates_studio 
  ON public.studio_chat_templates(studio_id);

CREATE INDEX idx_studio_chat_templates_studio_category 
  ON public.studio_chat_templates(studio_id, category);

CREATE INDEX idx_studio_chat_templates_studio_active 
  ON public.studio_chat_templates(studio_id, is_active);

CREATE INDEX idx_studio_chat_templates_category_default 
  ON public.studio_chat_templates(category, is_default);

CREATE INDEX idx_studio_chat_templates_studio_category_default 
  ON public.studio_chat_templates(studio_id, category, is_default);

-- Habilitar RLS
ALTER TABLE public.studio_chat_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para studio_chat_templates
CREATE POLICY "studio_chat_templates_read_studio"
  ON public.studio_chat_templates
  FOR SELECT
  TO authenticated
  USING (
    -- Plantillas base (studio_id IS NULL) visibles para todos
    studio_id IS NULL
    OR
    -- Plantillas del studio
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

CREATE POLICY "studio_chat_templates_insert_studio"
  ON public.studio_chat_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Solo pueden crear plantillas en su studio o plantillas base (requiere SUPER_ADMIN)
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
    OR studio_id IS NULL -- Plantillas base solo para admins (validar en aplicación)
  );

CREATE POLICY "studio_chat_templates_update_studio"
  ON public.studio_chat_templates
  FOR UPDATE
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

CREATE POLICY "studio_chat_templates_delete_studio"
  ON public.studio_chat_templates
  FOR DELETE
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  );

-- Trigger para actualizar updated_at
CREATE TRIGGER update_studio_chat_templates_updated_at
  BEFORE UPDATE ON public.studio_chat_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.3 Modelo Prisma para Plantillas

```prisma
model studio_chat_templates {
  id          String   @id @default(cuid())
  studio_id   String?  // null = plantilla base de plataforma
  name        String
  description String?
  content     String   // Contenido con variables {{variable}}
  category    String   @default("general") // "bienvenida" | "seguimiento" | "confirmacion" | "general"
  is_active   Boolean  @default(true)
  is_default  Boolean  @default(false) // Solo una plantilla por categoría puede ser default
  order       Int      @default(0)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  studio      studios? @relation(fields: [studio_id], references: [id], onDelete: Cascade)

  @@index([studio_id])
  @@index([studio_id, category])
  @@index([studio_id, is_active])
  @@index([category, is_default])
  @@index([studio_id, category, is_default])
}

// Agregar relación en studios
model studios {
  // ... campos existentes ...
  chat_templates  studio_chat_templates[]
}
```

---

## 2. 🔄 Diagrama de Flujo: Mensaje WhatsApp → Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE MENSAJE WHATSAPP                    │
└─────────────────────────────────────────────────────────────────┘

1. CLIENTE ENVÍA MENSAJE EN WHATSAPP
   │
   ├─> ManyChat recibe mensaje
   │
   ├─> ManyChat procesa con Flow/Bot
   │
   └─> ManyChat envía webhook a ZENLY
       │
       │ POST /api/webhooks/manychat
       │ Body: {
       │   "subscriber_id": "123456",
       │   "message": {
       │     "text": "Hola, quiero información",
       │     "type": "text"
       │   },
       │   "custom_fields": {
       │     "zen_promise_id": "promise_abc123",
       │     "zen_event_id": "event_xyz789"
       │   }
       │ }
       │
       ▼
2. WEBHOOK HANDLER (Server Action)
   │
   ├─> Validar firma del webhook (si ManyChat lo soporta)
   │
   ├─> Identificar studio_id desde subscriber_id
   │    └─> Buscar contacto por manychat_user_id
   │        └─> Obtener studio_id del contacto
   │
   ├─> Crear/Actualizar registro en studio_conversations
   │    ├─> entity_type: "promise" | "event" | "general"
   │    ├─> entity_id: ID de Promise/Event (desde custom_fields)
   │    └─> direction: "inbound"
   │
   ├─> Emitir evento Realtime
   │    └─> pg_notify('conversation_insert', {...})
   │
   └─> Responder 200 OK a ManyChat
       │
       ▼
3. SUPABASE REALTIME
   │
   ├─> Canal: studio:{studioSlug}:conversations:{contactId}
   │
   ├─> Broadcast evento INSERT
   │
   └─> Clientes suscritos reciben actualización
       │
       ▼
4. UI ACTUALIZA AUTOMÁTICAMENTE
   │
   ├─> ChatSidebar detecta nuevo mensaje
   │
   ├─> Agrega mensaje a la lista sin recargar
   │
   └─> Muestra notificación si el sidebar está cerrado
       │
       ▼
5. USUARIO RESPONDE DESDE ZENLY
   │
   ├─> Usuario escribe mensaje en ChatSidebar
   │
   ├─> Click en "Enviar"
   │
   ├─> Server Action: sendMessageToManyChat()
   │    ├─> Obtener credenciales ManyChat del studio
   │    ├─> Llamar API ManyChat: POST /v2/sendContent
   │    ├─> Guardar mensaje en studio_conversations
   │    │   └─> direction: "outbound"
   │    └─> Emitir evento Realtime
   │
   └─> ManyChat envía mensaje a WhatsApp
       │
       └─> Cliente recibe mensaje en WhatsApp
```

---

## 3. 🚀 Plan de Onboarding Técnico

### 3.1 Flujo de Configuración

```
PASO 1: Usuario accede a Configuración > Integraciones
   │
   ├─> Ve tarjeta "ManyChat" con estado "No conectado"
   │
   └─> Click en "Conectar ManyChat"
       │
       ▼
PASO 2: Modal de Configuración
   │
   ├─> Input: ManyChat API Key
   │    └─> Placeholder: "Ingresa tu API Key de ManyChat"
   │
   ├─> Botón: "Validar Conexión"
   │    └─> Server Action: validateManyChatConnection()
   │        ├─> Llamar ManyChat API: GET /v2/account/info
   │        ├─> Verificar respuesta 200
   │        └─> Mostrar éxito/error
   │
   ├─> Información: Custom User Fields requeridos
   │    └─> Lista de campos que deben existir en ManyChat
   │
   └─> Botón: "Guardar y Conectar"
       │
       ▼
PASO 3: Guardar Configuración
   │
   ├─> Server Action: connectManyChat()
   │    ├─> Encriptar API Key con encryptToken()
   │    ├─> Crear/Actualizar studio_manychat_config
   │    ├─> Obtener Page ID desde ManyChat API
   │    ├─> Generar webhook_url
   │    └─> Guardar configuración
   │
   ├─> Mostrar instrucciones de Webhook
   │    └─> URL: https://zenly.mx/api/webhooks/manychat?studio={studioSlug}
   │
   └─> Sincronizar Contactos existentes
       │
       ▼
PASO 4: Sincronización Inicial
   │
   ├─> Server Action: syncContactsWithManyChat()
   │    ├─> Obtener todos los contactos del studio
   │    ├─> Para cada contacto:
   │    │   ├─> Buscar en ManyChat por teléfono
   │    │   ├─> Si existe: vincular manychat_user_id
   │    │   └─> Si no existe: crear subscriber en ManyChat
   │    └─> Actualizar manychat_synced_at
   │
   └─> Mostrar éxito: "ManyChat conectado correctamente"
```

### 3.2 Server Actions Requeridos

```typescript
// src/lib/actions/studio/integrations/manychat.actions.ts

"use server";

import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/utils/encryption";
import { ManyChatClient } from "@/lib/integrations/manychat/client";

/**
 * Valida la conexión con ManyChat
 */
export async function validateManyChatConnection(
  studioSlug: string,
  apiKey: string
): Promise<ActionResponse<{ pageId: string; pageName: string }>> {
  try {
    const client = new ManyChatClient(apiKey);
    const accountInfo = await client.getAccountInfo();
    
    return {
      success: true,
      data: {
        pageId: accountInfo.page_id,
        pageName: accountInfo.page_name,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "No se pudo conectar con ManyChat. Verifica tu API Key.",
    };
  }
}

/**
 * Conecta ManyChat al studio
 */
export async function connectManyChat(
  studioSlug: string,
  apiKey: string
): Promise<ActionResponse<void>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Validar conexión
    const validation = await validateManyChatConnection(studioSlug, apiKey);
    if (!validation.success) {
      return validation;
    }

    // Encriptar API Key
    const encryptedApiKey = await encryptToken(apiKey);

    // Generar webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/manychat?studio=${studioSlug}`;

    // Guardar configuración
    await prisma.studio_manychat_config.upsert({
      where: { studio_id: studio.id },
      create: {
        studio_id: studio.id,
        api_key: encryptedApiKey,
        page_id: validation.data?.pageId,
        is_connected: true,
        connected_at: new Date(),
        webhook_url: webhookUrl,
      },
      update: {
        api_key: encryptedApiKey,
        page_id: validation.data?.pageId,
        is_connected: true,
        connected_at: new Date(),
        webhook_url: webhookUrl,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[connectManyChat] Error:", error);
    return {
      success: false,
      error: "Error al conectar ManyChat",
    };
  }
}

/**
 * Sincroniza contactos con ManyChat
 */
export async function syncContactsWithManyChat(
  studioSlug: string
): Promise<ActionResponse<{ synced: number; created: number }>> {
  // Implementación...
}
```

---

## 4. 🎨 Estructura de Componentes

### 4.1 Árbol de Archivos

```
src/
├── app/
│   ├── [slug]/
│   │   └── studio/
│   │       ├── config/
│   │       │   └── integraciones/
│   │       │       └── components/
│   │       │           └── ManychatIntegrationCard.tsx ✅ (ya existe, actualizar)
│   │       ├── commercial/
│   │       │   └── promises/
│   │       │       └── [promiseId]/
│   │       │           └── components/
│   │       │               └── ConversationSidebar.tsx 🆕
│   │       └── business/
│   │           └── events/
│   │               └── [eventId]/
│   │                   └── components/
│   │                       └── ConversationSidebar.tsx 🆕
│   └── api/
│       └── webhooks/
│           └── manychat/
│               └── route.ts ✅ (ya existe, implementar)
│
├── components/
│   └── conversations/ 🆕
│       ├── ConversationSidebar.tsx
│       ├── MessageList.tsx
│       ├── MessageItem.tsx
│       ├── MessageInput.tsx
│       └── ConversationFilter.tsx
│
├── lib/
│   ├── actions/
│   │   └── studio/
│   │       ├── integrations/
│   │       │   └── manychat.actions.ts 🆕
│   │       └── conversations/
│   │           └── templates.actions.ts 🆕
│   ├── integrations/
│   │   └── manychat/ 🆕
│   │       ├── client.ts
│   │       ├── types.ts
│   │       └── webhook-handler.ts
│   └── utils/
│       └── template-parser.ts 🆕
│
└── hooks/
    └── useConversationsRealtime.ts 🆕
```

### 4.2 Componente Principal: ConversationSidebar

```typescript
// src/components/conversations/ConversationSidebar.tsx

"use client";

import { useState, useEffect } from "react";
import { ZenSheet, ZenSheetContent, ZenSheetHeader, ZenSheetTitle } from "@/components/ui/zen";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationFilter } from "./ConversationFilter";
import { useConversationsRealtime } from "@/hooks/useConversationsRealtime";
import { getConversations, sendMessage } from "@/lib/actions/studio/conversations";

interface ConversationSidebarProps {
  studioSlug: string;
  contactId: string;
  entityType: "promise" | "event" | "general";
  entityId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationSidebar({
  studioSlug,
  contactId,
  entityType,
  entityId,
  isOpen,
  onClose,
}: ConversationSidebarProps) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "promise" | "event">("all");

  // Cargar mensajes iniciales
  useEffect(() => {
    if (isOpen && contactId) {
      loadMessages();
    }
  }, [isOpen, contactId, entityType, entityId]);

  const loadMessages = async () => {
    setLoading(true);
    const result = await getConversations(studioSlug, {
      contactId,
      entityType: filter === "all" ? undefined : filter,
      entityId: filter === "all" ? undefined : entityId,
    });
    if (result.success && result.data) {
      setMessages(result.data);
    }
    setLoading(false);
  };

  // Realtime: Escuchar nuevos mensajes
  useConversationsRealtime({
    studioSlug,
    contactId,
    onMessageInserted: (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    },
  });

  const handleSendMessage = async (text: string) => {
    const result = await sendMessage(studioSlug, {
      contactId,
      messageText: text,
      entityType,
      entityId,
    });
    if (result.success) {
      // El mensaje se agregará automáticamente vía Realtime
    }
  };

  return (
    <ZenSheet open={isOpen} onOpenChange={onClose}>
      <ZenSheetContent side="right" className="w-full sm:max-w-lg">
        <ZenSheetHeader>
          <ZenSheetTitle>Conversación</ZenSheetTitle>
          <ConversationFilter value={filter} onChange={setFilter} />
        </ZenSheetHeader>
        
        <div className="flex flex-col h-full">
          <MessageList messages={messages} loading={loading} />
          <MessageInput 
            onSend={handleSendMessage}
            studioSlug={studioSlug}
            contactId={contactId}
            entityType={entityType}
            entityId={entityId}
          />
        </div>
      </ZenSheetContent>
    </ZenSheet>
  );
}
```

### 4.3 Componente MessageInput con Selector de Plantillas

```typescript
// src/components/conversations/MessageInput.tsx

"use client";

import { useState, useRef } from "react";
import { ZenInput, ZenButton, ZenSelect, ZenSelectTrigger, ZenSelectContent, ZenSelectItem } from "@/components/ui/zen";
import { FileText, Send } from "lucide-react";
import { getChatTemplates, parseChatTemplate } from "@/lib/actions/studio/conversations/templates";
import type { ChatTemplate } from "@/types/conversations";

interface MessageInputProps {
  onSend: (text: string) => void;
  studioSlug: string;
  contactId: string;
  entityType: "promise" | "event" | "general";
  entityId?: string;
}

export function MessageInput({
  onSend,
  studioSlug,
  contactId,
  entityType,
  entityId,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<ChatTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cargar plantillas disponibles
  useEffect(() => {
    loadTemplates();
  }, [studioSlug, entityType]);

  const loadTemplates = async () => {
    const result = await getChatTemplates(studioSlug, {
      category: getCategoryForEntityType(entityType),
      isActive: true,
    });
    if (result.success && result.data) {
      setTemplates(result.data);
    }
  };

  const getCategoryForEntityType = (
    type: "promise" | "event" | "general"
  ): string => {
    switch (type) {
      case "promise":
        return "seguimiento";
      case "event":
        return "confirmacion";
      default:
        return "bienvenida";
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setLoading(true);
    try {
      // Parsear plantilla con datos del contexto
      const parsed = await parseChatTemplate(studioSlug, templateId, {
        contactId,
        promiseId: entityType === "promise" ? entityId : undefined,
        eventId: entityType === "event" ? entityId : undefined,
      });

      if (parsed.success && parsed.data) {
        setMessage(parsed.data);
        inputRef.current?.focus();
      }
    } finally {
      setLoading(false);
      setSelectedTemplateId("");
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="border-t border-zinc-800 p-4 space-y-3">
      {/* Selector de plantillas */}
      {templates.length > 0 && (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          <ZenSelect
            value={selectedTemplateId}
            onValueChange={handleTemplateSelect}
            disabled={loading}
          >
            <ZenSelectTrigger className="w-full">
              <span className="text-sm text-zinc-400">
                {loading ? "Cargando..." : "Usar plantilla..."}
              </span>
            </ZenSelectTrigger>
            <ZenSelectContent>
              {templates.map((template) => (
                <ZenSelectItem key={template.id} value={template.id}>
                  {template.name}
                </ZenSelectItem>
              ))}
            </ZenSelectContent>
          </ZenSelect>
        </div>
      )}

      {/* Input de mensaje */}
      <div className="flex items-end gap-2">
        <ZenInput
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escribe un mensaje..."
          multiline
          rows={3}
          className="flex-1"
        />
        <ZenButton
          onClick={handleSend}
          disabled={!message.trim() || loading}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </ZenButton>
      </div>
    </div>
  );
}
```

### 4.3 Hook de Realtime

```typescript
// src/hooks/useConversationsRealtime.ts

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { setupRealtimeAuth, createRealtimeChannel, subscribeToChannel } from "@/lib/realtime/utils";

export function useConversationsRealtime({
  studioSlug,
  contactId,
  onMessageInserted,
}: {
  studioSlug: string;
  contactId: string;
  onMessageInserted: (message: any) => void;
}) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!studioSlug || !contactId) return;

    const setupRealtime = async () => {
      const authResult = await setupRealtimeAuth(supabase, false);
      if (!authResult.success) return;

      const channel = createRealtimeChannel(supabase, {
        channelName: `studio:${studioSlug}:conversations:${contactId}`,
        isPrivate: false,
        requiresAuth: false,
        self: true,
        ack: true,
      });

      channel.on("broadcast", { event: "INSERT" }, (payload) => {
        onMessageInserted(payload.payload);
      });

      await subscribeToChannel(channel);
      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [studioSlug, contactId]);
}
```

---

## 5. 🔧 Blueprint de ManyChat

### 5.1 Custom User Fields (CUFs) Requeridos

El usuario debe crear estos Custom User Fields en ManyChat para que la sincronización funcione:

| Campo | Tipo | Descripción | Uso |
|-------|------|-------------|-----|
| `zen_promise_id` | Text | ID de la Promesa en ZENLY | Vincular mensajes a una Promesa específica |
| `zen_event_id` | Text | ID del Evento en ZENLY | Vincular mensajes a un Evento específico |
| `zen_contact_id` | Text | ID del Contacto en ZENLY | Identificar contacto (backup si manychat_user_id falla) |
| `zen_studio_slug` | Text | Slug del Studio | Identificar el studio (seguridad) |

### 5.2 Configuración de Webhook en ManyChat

1. **URL del Webhook:**
   ```
   https://zenly.mx/api/webhooks/manychat?studio={studioSlug}
   ```

2. **Eventos a suscribir:**
   - `message_received` - Cuando llega un mensaje
   - `message_sent` - Cuando se envía un mensaje (opcional)

3. **Formato del Payload:**
   ```json
   {
     "subscriber_id": "123456",
     "page_id": "987654",
     "message": {
       "text": "Hola",
       "type": "text"
     },
     "custom_fields": {
       "zen_promise_id": "promise_abc123",
       "zen_event_id": "event_xyz789"
     }
   }
   ```

### 5.3 Flows Recomendados en ManyChat

**Flow 1: Bienvenida con Context ID**
- Trigger: Nuevo suscriptor
- Acción: Establecer `zen_contact_id` con el ID del contacto creado en ZENLY
- Mensaje: "¡Hola! Bienvenido a [Studio Name]"

**Flow 2: Respuesta Automática con Contexto**
- Trigger: Mensaje recibido
- Condición: Si `zen_promise_id` existe
- Acción: Responder con información de la promesa
- Mensaje: "Veo que estás interesado en [Event Type]. ¿En qué te puedo ayudar?"

---

## 6. 🔐 Seguridad y RLS

### 6.1 Políticas RLS Implementadas

Las políticas RLS ya están definidas en la migración SQL (Sección 1.2). Resumen:

- **studio_manychat_config**: Solo usuarios del studio pueden leer/actualizar su configuración
- **studio_conversations**: Solo usuarios del studio pueden ver conversaciones de su studio

### 6.2 Validación de Webhook

```typescript
// src/app/api/webhooks/manychat/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleManyChatWebhook } from "@/lib/integrations/manychat/webhook-handler";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studioSlug = searchParams.get("studio");

    if (!studioSlug) {
      return NextResponse.json(
        { error: "studio parameter required" },
        { status: 400 }
      );
    }

    // Verificar que el studio existe y tiene ManyChat conectado
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      include: {
        manychat_config: {
          where: { is_connected: true },
        },
      },
    });

    if (!studio || !studio.manychat_config) {
      return NextResponse.json(
        { error: "Studio not found or ManyChat not connected" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = await handleManyChatWebhook(studio.id, body);

    if (result.success) {
      return NextResponse.json({ received: true });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[ManyChat Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 7. 📝 Checklist de Implementación

### Fase 1: Infraestructura Base
- [ ] Crear migración SQL para nuevas tablas
- [ ] Actualizar schema.prisma
- [ ] Ejecutar migración en desarrollo
- [ ] Verificar RLS policies

### Fase 1.5: Módulo de Plantillas (NUEVO)
- [ ] Crear migración SQL para `studio_chat_templates`
- [ ] Agregar modelo `studio_chat_templates` a schema.prisma
- [ ] Crear seed data con 3 plantillas por defecto
- [ ] Crear `template-parser.ts` utility
- [ ] Crear Server Actions para plantillas (`templates.actions.ts`)
- [ ] Implementar selector de plantillas en MessageInput
- [ ] Probar parsing de variables

### Fase 2: Integración ManyChat
- [ ] Crear ManyChatClient (lib/integrations/manychat/client.ts)
- [ ] Implementar validateManyChatConnection()
- [ ] Implementar connectManyChat()
- [ ] Implementar syncContactsWithManyChat()
- [ ] Crear webhook handler

### Fase 3: UI Components
- [ ] Actualizar ManychatIntegrationCard
- [ ] Crear ConversationSidebar
- [ ] Crear MessageList, MessageItem, MessageInput
- [ ] Crear ConversationFilter
- [ ] Integrar selector de plantillas en MessageInput
- [ ] Integrar sidebar en Promise detail page
- [ ] Integrar sidebar en Event detail page

### Fase 4: Realtime
- [ ] Crear useConversationsRealtime hook
- [ ] Configurar triggers de Realtime en DB
- [ ] Probar actualizaciones en tiempo real

### Fase 5: Testing
- [ ] Probar flujo completo de onboarding
- [ ] Probar recepción de mensajes vía webhook
- [ ] Probar envío de mensajes desde ZENLY
- [ ] Probar filtrado por Promise/Event
- [ ] Probar Realtime updates
- [ ] Probar selección y parsing de plantillas

---

## 8. 🚨 Consideraciones Importantes

### 8.1 Rate Limits de ManyChat
- ManyChat tiene límites de API calls por minuto
- Implementar rate limiting en el cliente
- Cachear respuestas cuando sea posible

### 8.2 Sincronización de Contactos
- La sincronización inicial puede tardar varios minutos
- Implementar proceso en background (queue)
- Mostrar progreso al usuario

### 8.3 Manejo de Errores
- Si ManyChat API falla, mostrar mensaje claro
- Guardar mensajes en cola si el webhook falla
- Reintentar automáticamente

### 8.4 Privacidad
- No almacenar contenido sensible sin encriptar
- Cumplir con políticas de WhatsApp Business API
- Permitir a usuarios desconectar ManyChat

---

## 9. 📚 Referencias

- [ManyChat API Documentation](https://manychat.github.io/dynamic_block_docs/)
- [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Prisma Multi-tenant Patterns](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

---

## 10. 📋 Módulo de Plantillas de Chat (Fase 1.5)

### 10.1 Descripción

Sistema de plantillas de mensajes predefinidos que permite a los usuarios enviar mensajes rápidos con variables dinámicas que se reemplazan automáticamente con datos del contacto, promesa o evento.

### 10.2 Variables Soportadas

#### Variables de Contacto
- `{{contact_name}}` - Nombre del contacto
- `{{contact_phone}}` - Teléfono del contacto
- `{{contact_email}}` - Email del contacto
- `{{contact_address}}` - Dirección del contacto

#### Variables de Promesa
- `{{promise_name}}` - Nombre de la promesa
- `{{promise_event_type}}` - Tipo de evento
- `{{promise_event_date}}` - Fecha del evento (formato largo)
- `{{promise_event_date_short}}` - Fecha del evento (formato corto)
- `{{promise_event_location}}` - Ubicación del evento

#### Variables de Evento
- `{{event_date}}` - Fecha del evento (formato largo)
- `{{event_date_short}}` - Fecha del evento (formato corto)
- `{{event_type}}` - Tipo de evento
- `{{event_status}}` - Estado del evento

#### Variables de Studio
- `{{studio_name}}` - Nombre del estudio
- `{{studio_phone}}` - Teléfono del estudio
- `{{studio_email}}` - Email del estudio

### 10.3 Plantillas por Defecto

#### 1. Bienvenida
```text
¡Hola {{contact_name}}! 👋

Gracias por contactarnos. Estamos aquí para ayudarte a hacer de {{promise_event_type}} un día especial.

¿En qué podemos ayudarte hoy?
```

#### 2. Seguimiento de Cotización
```text
Hola {{contact_name}},

Te escribo para dar seguimiento a tu cotización para {{promise_event_type}} el {{promise_event_date_short}}.

¿Tienes alguna pregunta o necesitas ajustar algo?

Saludos,
{{studio_name}}
```

#### 3. Confirmación de Evento
```text
¡Hola {{contact_name}}!

Confirmamos tu evento de {{event_type}} para el {{event_date}}.

Estamos emocionados de trabajar contigo. Si tienes alguna pregunta, no dudes en contactarnos.

{{studio_name}}
Tel: {{studio_phone}}
```

### 10.4 Utilidad de Parsing

```typescript
// src/lib/utils/template-parser.ts

/**
 * Parsea una plantilla reemplazando variables con datos reales
 */
export function parseChatTemplate(
  template: string,
  data: {
    contact?: ContactData;
    promise?: PromiseData;
    event?: EventData;
    studio?: StudioData;
  }
): string;

/**
 * Extrae todas las variables de una plantilla
 */
export function extractTemplateVariables(template: string): string[];

/**
 * Valida que todas las variables requeridas estén presentes
 */
export function validateTemplateData(
  template: string,
  data: {...}
): { valid: boolean; missing: string[] };
```

### 10.5 Server Actions para Plantillas

```typescript
// src/lib/actions/studio/conversations/templates.actions.ts

/**
 * Obtiene plantillas disponibles para un studio
 */
export async function getChatTemplates(
  studioSlug: string,
  filters?: {
    category?: string;
    isActive?: boolean;
  }
): Promise<ActionResponse<ChatTemplate[]>>;

/**
 * Obtiene una plantilla específica
 */
export async function getChatTemplate(
  studioSlug: string,
  templateId: string
): Promise<ActionResponse<ChatTemplate>>;

/**
 * Parsea una plantilla con datos del contexto
 */
export async function parseChatTemplate(
  studioSlug: string,
  templateId: string,
  context: {
    contactId: string;
    promiseId?: string;
    eventId?: string;
  }
): Promise<ActionResponse<string>>;

/**
 * Crea una nueva plantilla
 */
export async function createChatTemplate(
  studioSlug: string,
  data: {
    name: string;
    description?: string;
    content: string;
    category: string;
    isDefault?: boolean;
  }
): Promise<ActionResponse<ChatTemplate>>;

/**
 * Actualiza una plantilla existente
 */
export async function updateChatTemplate(
  studioSlug: string,
  templateId: string,
  data: Partial<{
    name: string;
    description: string;
    content: string;
    category: string;
    isActive: boolean;
    isDefault: boolean;
  }>
): Promise<ActionResponse<ChatTemplate>>;
```

### 10.6 Seed Data

```typescript
// prisma/06-seed-chat-templates.ts

const DEFAULT_TEMPLATES = [
  {
    name: "Bienvenida",
    description: "Mensaje de bienvenida para nuevos contactos",
    category: "bienvenida",
    content: "¡Hola {{contact_name}}! 👋\n\nGracias por contactarnos...",
    isDefault: true,
    order: 1,
  },
  {
    name: "Seguimiento de Cotización",
    description: "Seguimiento para promesas con cotización pendiente",
    category: "seguimiento",
    content: "Hola {{contact_name}},\n\nTe escribo para dar seguimiento...",
    isDefault: true,
    order: 1,
  },
  {
    name: "Confirmación de Evento",
    description: "Confirmación de evento programado",
    category: "confirmacion",
    content: "¡Hola {{contact_name}}!\n\nConfirmamos tu evento...",
    isDefault: true,
    order: 1,
  },
];

// Crear plantillas base (studio_id = null) para todos los studios
```

### 10.7 Integración en MessageInput

El componente `MessageInput` incluye un selector de plantillas que:

1. Carga plantillas disponibles según el contexto (Promise/Event/General)
2. Muestra un dropdown con las plantillas
3. Al seleccionar una plantilla, parsea las variables y rellena el input
4. El usuario puede editar el mensaje antes de enviarlo

---

**Fin del Documento**
