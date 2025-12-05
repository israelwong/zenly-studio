# 📊 Sistema de Analytics de Contenido - Guía de Implementación

## 🎯 Objetivo

Sistema unificado de analytics para trackear interacciones con contenido público (posts, portfolios, ofertas, paquetes).

---

## 📐 Arquitectura

### Base de Datos

```prisma
model studio_content_analytics {
  studio_id     String
  content_type  ContentType         // POST | PORTFOLIO | OFFER | PACKAGE
  content_id    String
  event_type    AnalyticsEventType  // 20+ tipos de eventos
  
  // Contexto
  user_id       String?
  ip_address    String?
  user_agent    String?
  session_id    String?
  
  // Marketing
  referrer      String?
  utm_*         String?
  
  // Metadata flexible
  metadata      Json?
  
  created_at    DateTime
}
```

### Eventos Soportados

| Categoría | Eventos |
|-----------|---------|
| **Vistas** | `PAGE_VIEW`, `FEED_VIEW` |
| **Interacciones** | `MODAL_OPEN`, `MODAL_CLOSE` |
| **Navegación** | `NEXT_CONTENT`, `PREV_CONTENT` |
| **Compartir** | `LINK_COPY`, `SHARE_CLICK` |
| **Media** | `MEDIA_CLICK`, `MEDIA_VIEW`, `CAROUSEL_NEXT`, `CAROUSEL_PREV` |
| **CTAs** | `CTA_CLICK`, `WHATSAPP_CLICK`, `FORM_VIEW`, `FORM_SUBMIT` |
| **Engagement** | `SCROLL_50`, `SCROLL_100`, `TIME_30S`, `TIME_60S` |

---

## 🔧 Uso en Componentes

### 1. Tracking Básico

```typescript
import { useContentAnalytics } from '@/hooks/useContentAnalytics';

function PostDetailModal({ post, studioId }) {
  const analytics = useContentAnalytics({
    studioId,
    contentType: 'POST',
    contentId: post.id,
    sessionId: generateSessionId() // Opcional
  });

  const handleOpen = () => {
    analytics.trackModalOpen();
  };

  const handleClose = () => {
    analytics.trackModalClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    analytics.trackLinkCopy();
  };

  return (
    <Modal onClose={handleClose}>
      {/* ... */}
      <button onClick={handleCopyLink}>Copiar Link</button>
    </Modal>
  );
}
```

### 2. Track Once (Solo una vez por sesión)

```typescript
function PostFeedCard({ post, studioId }) {
  const analytics = useContentAnalytics({
    studioId,
    contentType: 'POST',
    contentId: post.id
  });

  useEffect(() => {
    // Se trackea solo una vez aunque el componente se re-renderice
    analytics.trackOnce('FEED_VIEW');
  }, []);

  return <div>...</div>;
}
```

### 3. Tracking Automático de Tiempo

```typescript
import { useTimeTracking } from '@/hooks/useContentAnalytics';

function PostPage({ post, studioId }) {
  // Auto-trackea TIME_30S y TIME_60S
  useTimeTracking({
    studioId,
    contentType: 'POST',
    contentId: post.id
  });

  return <div>...</div>;
}
```

### 4. Tracking Automático de Scroll

```typescript
import { useScrollTracking } from '@/hooks/useContentAnalytics';

function PostContent({ post, studioId }) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-trackea SCROLL_50 y SCROLL_100
  useScrollTracking({
    studioId,
    contentType: 'POST',
    contentId: post.id,
    elementRef: contentRef
  });

  return <div ref={contentRef}>...</div>;
}
```

### 5. Metadata Personalizada

```typescript
// Trackear click en media específica
analytics.track('MEDIA_CLICK', {
  media_id: 'media_123',
  media_type: 'video',
  media_order: 2
});

// Trackear CTA con tipo
analytics.trackCTAClick('whatsapp');

// Metadata compleja
analytics.track('FORM_SUBMIT', {
  form_fields: ['name', 'email', 'phone'],
  event_type_selected: 'boda',
  interested_package: 'package_123'
});
```

---

## 📊 Obtener Estadísticas

### Stats de un Contenido

```typescript
import { getContentStats } from '@/lib/actions/studio/analytics/analytics.actions';

const stats = await getContentStats(studioId, 'POST', postId);

console.log(stats.data);
// {
//   uniqueViews24h: 42,
//   totalViews: 156,
//   totalLinkCopies: 8,
//   totalMediaClicks: 23,
//   ctr: 12.5,  // Click-Through Rate
//   eventCounts: [...]
// }
```

### Analytics del Studio

```typescript
import { getStudioAnalytics } from '@/lib/actions/studio/analytics/analytics.actions';

const analytics = await getStudioAnalytics(
  studioId,
  new Date('2024-01-01'),  // Desde
  new Date('2024-12-31')   // Hasta
);

console.log(analytics.data);
// {
//   topContent: [
//     { contentType: 'POST', contentId: 'xxx', interactions: 450 },
//     ...
//   ],
//   eventsByType: [
//     { eventType: 'MODAL_OPEN', count: 1200 },
//     ...
//   ],
//   contentByType: [
//     { contentType: 'POST', count: 500 },
//     ...
//   ]
// }
```

---

## 🎨 Componentes con Analytics

### PostFeedCard (Actualizado)

```typescript
// ✅ Ya implementado
<PostFeedCard 
  post={post}
  studioId={studioId}
  onPostClick={(slug) => {
    // Trackea automáticamente al abrir modal
    router.push(`?post=${slug}`);
  }}
/>
```

### PostDetailModal (Actualizado)

```typescript
// ✅ Ya implementado
<PostDetailModal
  post={post}
  studioId={studioId}
  onClose={() => {
    // Trackea MODAL_CLOSE
  }}
/>
```

---

## 🚀 Próximos Pasos de Integración

### 1. PostRenderer

```typescript
// src/components/posts/PostRenderer.tsx

const analytics = useContentAnalytics({
  studioId,
  contentType: 'POST',
  contentId: post.id
});

useEffect(() => {
  analytics.trackOnce('PAGE_VIEW');
}, []);

useTimeTracking({ studioId, contentType: 'POST', contentId: post.id });

const handleCopyLink = () => {
  navigator.clipboard.writeText(url);
  analytics.trackLinkCopy(); // ✅ Ya implementado
  setLinkCopied(true);
};

const handleMediaClick = (mediaId: string) => {
  analytics.trackMediaClick(mediaId);
};
```

### 2. PortfolioDetailSection

```typescript
// src/components/profile/sections/PortfolioDetailSection.tsx

const analytics = useContentAnalytics({
  studioId,
  contentType: 'PORTFOLIO',
  contentId: portfolio.id
});

useEffect(() => {
  analytics.trackOnce('PAGE_VIEW');
}, []);

const handleCTAClick = () => {
  analytics.trackCTAClick(portfolio.cta_action); // 'whatsapp' | 'form' | etc
  // Ejecutar acción CTA
};
```

### 3. OfferLandingPage

```typescript
// Offers ya tienen studio_offer_visits, migrar a sistema unificado

const analytics = useContentAnalytics({
  studioId,
  contentType: 'OFFER',
  contentId: offer.id
});

useEffect(() => {
  analytics.trackOnce('PAGE_VIEW');
}, []);

const handleFormView = () => {
  analytics.track('FORM_VIEW');
};

const handleFormSubmit = async (data) => {
  analytics.track('FORM_SUBMIT', {
    form_fields: Object.keys(data),
    event_type_selected: data.eventType
  });
};
```

---

## 📈 Queries SQL Útiles

### Vistas únicas de un post (últimas 24h)

```sql
SELECT COUNT(DISTINCT ip_address) as unique_views
FROM studio_content_analytics
WHERE content_type = 'POST'
  AND content_id = 'xxx'
  AND event_type = 'MODAL_OPEN'
  AND created_at > NOW() - INTERVAL '24 hours';
```

### CTR (Click-Through Rate)

```sql
SELECT 
  COUNT(CASE WHEN event_type = 'FEED_VIEW' THEN 1 END) as views,
  COUNT(CASE WHEN event_type = 'MODAL_OPEN' THEN 1 END) as clicks,
  (COUNT(CASE WHEN event_type = 'MODAL_OPEN' THEN 1 END)::float / 
   NULLIF(COUNT(CASE WHEN event_type = 'FEED_VIEW' THEN 1 END), 0) * 100) as ctr
FROM studio_content_analytics
WHERE content_type = 'POST' AND content_id = 'xxx';
```

### Top 10 contenidos más populares

```sql
SELECT 
  content_type,
  content_id,
  COUNT(*) as total_interactions,
  COUNT(DISTINCT ip_address) as unique_visitors
FROM studio_content_analytics
WHERE studio_id = 'xxx'
  AND event_type IN ('MODAL_OPEN', 'PAGE_VIEW')
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY content_type, content_id
ORDER BY total_interactions DESC
LIMIT 10;
```

### Engagement Rate (scroll + tiempo)

```sql
SELECT 
  content_id,
  COUNT(DISTINCT CASE WHEN event_type IN ('TIME_30S', 'TIME_60S', 'SCROLL_50', 'SCROLL_100') 
        THEN session_id END) as engaged_sessions,
  COUNT(DISTINCT session_id) as total_sessions,
  (COUNT(DISTINCT CASE WHEN event_type IN ('TIME_30S', 'TIME_60S', 'SCROLL_50', 'SCROLL_100') 
        THEN session_id END)::float / 
   NULLIF(COUNT(DISTINCT session_id), 0) * 100) as engagement_rate
FROM studio_content_analytics
WHERE studio_id = 'xxx' AND content_type = 'POST'
GROUP BY content_id
ORDER BY engagement_rate DESC;
```

---

## ⚠️ Consideraciones

### Performance
- **Non-blocking**: Tracking se ejecuta en background sin esperar respuesta
- **Índices**: Optimizados para queries comunes
- **Batch processing**: Considerar batch inserts para alto tráfico

### Privacy
- **IP anónima**: Solo primeros 3 octetos si se requiere GDPR compliance
- **User ID opcional**: Solo si está autenticado
- **No PII**: Nunca guardar información personal identificable

### Testing
- **Dev mode**: Usar `sessionId` fijo para testing
- **Flag de test**: Considerar agregar `is_test: boolean` para filtrar datos de prueba

---

## 📚 Referencias

- **Schema**: `prisma/schema.prisma` → `studio_content_analytics`
- **Server Actions**: `src/lib/actions/studio/analytics/analytics.actions.ts`
- **Hooks**: `src/hooks/useContentAnalytics.ts`
- **Tipos**: Enums `ContentType` y `AnalyticsEventType`

---

**Última actualización**: 4 de diciembre de 2024
