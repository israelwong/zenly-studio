# Análisis: Sistema de Tracking de Ofertas y Origen de Leads

**Fecha:** 29 Diciembre 2025  
**Versión:** 1.0  
**Contexto:** Análisis del flujo actual de ofertas comerciales y necesidad de tracking de origen de leads para campañas

---

## 🎯 PROBLEMA IDENTIFICADO

El studio necesita saber **de dónde viene cada lead** cuando hace campañas en múltiples canales:

- **Meta Ads** (Instagram/Facebook)
- **Google Ads**
- **Publicaciones orgánicas**
- **Banner en perfil público**
- **Campañas externas directas**

**Pregunta clave:** ¿Cómo diferenciamos si un lead vino de Instagram Ads vs Google Ads vs el perfil público?

---

## 📊 ESTADO ACTUAL DEL SISTEMA

### 1. Flujo de Navegación Existente

#### A) Desde Perfil Público → Oferta
```
Usuario visita: /{slug}
  ↓
Ve banner de oferta en sidebar (OffersCard)
  ↓
Click en oferta → /{slug}/offer/{offerSlug}
  ↓
Landing page de oferta
  ↓
Submit leadform → Crea lead en CRM
```

**Archivo clave:** `src/components/profile/cards/OfferCard.tsx`
- Línea 119: `href={/${studioSlug}/offer/${offer.slug}}`
- **NO agrega parámetros UTM** al navegar

#### B) Desde Campaña Externa → Oferta
```
Usuario viene de Meta Ads con URL:
/{slug}/offer/{offerSlug}?utm_source=facebook&utm_campaign=boda2025
  ↓
Landing page de oferta (captura UTMs)
  ↓
Submit leadform → Guarda UTMs en submission
```

---

### 2. Sistema de Tracking Actual

#### ✅ LO QUE SÍ EXISTE

**A) Tabla `studio_offer_visits`** (Schema líneas 2853-2873)
```prisma
model studio_offer_visits {
  id           String   @id @default(cuid())
  offer_id     String
  visit_type   String   // 'landing' | 'leadform'
  
  // Tracking de origen
  referrer     String?
  utm_source   String?
  utm_medium   String?
  utm_campaign String?
  utm_term     String?
  utm_content  String?
  session_id   String?
  
  // Metadata
  ip_address   String?
  user_agent   String?
  created_at   DateTime @default(now())
}
```

**B) Tabla `studio_offer_submissions`** (Schema líneas 2875-2895)
```prisma
model studio_offer_submissions {
  id               String   @id @default(cuid())
  offer_id         String
  contact_id       String?
  visit_id         String?  // ← Relación con visit
  
  // Tracking UTM
  utm_source       String?
  utm_medium       String?
  utm_campaign     String?
  
  form_data        Json
  ip_address       String?
  user_agent       String?
  created_at       DateTime @default(now())
}
```

**C) Captura de UTMs en Landing Page**

`src/components/offers/OfferLandingPage.tsx` (líneas 106-129):
```typescript
// Obtener parámetros UTM de la URL
const urlParams = new URLSearchParams(window.location.search);
const utmParams = {
  utm_source: urlParams.get("utm_source") || undefined,
  utm_medium: urlParams.get("utm_medium") || undefined,
  utm_campaign: urlParams.get("utm_campaign") || undefined,
  utm_term: urlParams.get("utm_term") || undefined,
  utm_content: urlParams.get("utm_content") || undefined,
};

// Generar session_id único
let sessionId = localStorage.getItem(`offer_session_${offerId}`);
if (!sessionId) {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(`offer_session_${offerId}`, sessionId);
}

// Trackear visita con UTMs
await trackOfferVisit({
  offer_id: offerId,
  visit_type: "landing",
  referrer: document.referrer || undefined,
  ...utmParams,
  session_id: sessionId,
});
```

**D) Captura de UTMs en Submit de Leadform**

`src/components/offers/OfferLeadForm.tsx` (líneas 211-238):
```typescript
// Obtener parámetros UTM de la URL
const urlParams = new URLSearchParams(window.location.search);
const sessionId = localStorage.getItem(`offer_session_${offerId}`);

const result = await submitOfferLeadform(studioSlug, {
  offer_id: offerId,
  name: data.name,
  phone: data.phone,
  email: data.email || "",
  interest_date: data.interest_date,
  event_type_id: data.event_type_id || eventTypeId || undefined,
  custom_fields: customFields,
  
  // ✅ UTMs capturados
  utm_source: urlParams.get("utm_source") || undefined,
  utm_medium: urlParams.get("utm_medium") || undefined,
  utm_campaign: urlParams.get("utm_campaign") || undefined,
  utm_term: urlParams.get("utm_term") || undefined,
  utm_content: urlParams.get("utm_content") || undefined,
  
  session_id: sessionId || undefined,
  is_test: effectiveIsPreview,
});
```

**E) Persistencia en Base de Datos**

`src/lib/actions/studio/offers/offer-submissions.actions.ts` (líneas 422-434):
```typescript
submission = await prisma.studio_offer_submissions.create({
  data: {
    offer_id: offer.id,
    contact_id: contact.id,
    visit_id: visitId,
    form_data: formData,
    ip_address: ipAddress,
    user_agent: userAgent,
    
    // ✅ UTMs guardados en submission
    utm_source: validatedData.utm_source || null,
    utm_medium: validatedData.utm_medium || null,
    utm_campaign: validatedData.utm_campaign || null,
  },
});
```

---

### ❌ LO QUE NO EXISTE

#### A) UTMs en navegación desde perfil público
Cuando un usuario hace click en el banner de oferta desde `/{slug}`, **NO se agregan parámetros UTM** para identificar que vino del perfil.

**Archivo:** `src/components/profile/cards/OfferCard.tsx` (línea 119)
```typescript
<a
  href={`/${studioSlug}/offer/${offer.slug}`}  // ← Sin UTMs
  onClick={handleClick}
  className="block"
>
```

**Problema:** No podemos diferenciar:
- Lead que vino del perfil público (navegación orgánica interna)
- Lead que vino de campaña externa sin UTMs

#### B) Diferenciación de origen "orgánico"
No hay forma de marcar automáticamente que un lead vino de:
- Banner en perfil público
- Navegación directa
- Compartido en redes sin UTMs

#### C) Persistencia de UTMs en navegación interna
Si un usuario llega con UTMs desde campaña externa:
```
/{slug}?utm_source=facebook&utm_campaign=boda2025
```

Y luego navega al banner de oferta, **los UTMs se pierden** porque el link interno no los propaga.

---

## 🔍 ANÁLISIS DE CASOS DE USO

### Caso 1: Campaña en Meta Ads
```
URL de campaña:
/{slug}/offer/boda-2025?utm_source=facebook&utm_medium=cpc&utm_campaign=boda_invierno_2025

✅ Estado actual: FUNCIONA
- UTMs capturados en landing
- Guardados en visit y submission
- Identificable en analytics
```

### Caso 2: Campaña en Google Ads
```
URL de campaña:
/{slug}/offer/boda-2025?utm_source=google&utm_medium=cpc&utm_campaign=boda_invierno_2025

✅ Estado actual: FUNCIONA
- UTMs capturados correctamente
- Diferenciable de Meta Ads por utm_source
```

### Caso 3: Usuario llega al perfil desde campaña, luego ve oferta
```
1. Usuario llega: /{slug}?utm_source=facebook&utm_campaign=brand_awareness
2. Navega en perfil público
3. Click en banner de oferta → /{slug}/offer/boda-2025

❌ Problema: UTMs se pierden
- La navegación interna NO propaga UTMs
- El lead aparece como "sin origen"
- No podemos atribuir a la campaña original
```

### Caso 4: Usuario llega directo al perfil, ve oferta
```
1. Usuario llega: /{slug} (sin UTMs)
2. Click en banner de oferta → /{slug}/offer/boda-2025

❌ Problema: No hay diferenciación
- Submission sin UTMs
- No sabemos si vino de:
  * Búsqueda orgánica
  * Enlace compartido
  * Perfil público
  * Campaña sin tracking
```

### Caso 5: Publicación orgánica en Instagram
```
Studio comparte en Instagram stories:
/{slug}/offer/boda-2025

❌ Problema: Sin identificación
- No hay UTMs (es orgánico)
- Se mezcla con tráfico directo
- No podemos medir ROI de esfuerzo orgánico
```

---

## 💡 SOLUCIONES PROPUESTAS

### Opción 1: UTMs Automáticos en Navegación Interna (RECOMENDADA)

**Concepto:** Agregar UTMs predefinidos cuando se navega desde el perfil a una oferta.

#### Implementación:

**A) Modificar `OfferCard.tsx`**
```typescript
<a
  href={`/${studioSlug}/offer/${offer.slug}?utm_source=profile&utm_medium=banner&utm_campaign=organic`}
  onClick={handleClick}
  className="block"
>
```

**B) Modificar `MobilePromotionsSection.tsx`** (carousel mobile)
```typescript
<a
  href={`/${studioSlug}/offer/${offer.slug}?utm_source=profile&utm_medium=carousel&utm_campaign=organic`}
>
```

**Ventajas:**
- ✅ Diferencia tráfico de perfil vs campañas externas
- ✅ No requiere cambios en DB
- ✅ Compatible con sistema actual
- ✅ Fácil de implementar

**Desventajas:**
- ⚠️ No propaga UTMs de campaña original si usuario llegó con ellos

---

### Opción 2: Propagación de UTMs + Fallback (ÓPTIMA)

**Concepto:** Propagar UTMs originales si existen, o usar UTMs de fallback.

#### Implementación:

**A) Hook personalizado `useUTMPropagation`**
```typescript
// src/hooks/useUTMPropagation.ts
export function useUTMPropagation() {
  const searchParams = useSearchParams();
  
  // Capturar UTMs de URL actual
  const currentUTMs = {
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
    utm_term: searchParams.get('utm_term'),
    utm_content: searchParams.get('utm_content'),
  };
  
  // Guardar en sessionStorage para persistencia
  useEffect(() => {
    if (currentUTMs.utm_source) {
      sessionStorage.setItem('original_utms', JSON.stringify(currentUTMs));
    }
  }, [currentUTMs]);
  
  // Función para construir URL con UTMs
  const buildURLWithUTMs = (baseUrl: string, fallback: {
    source: string;
    medium: string;
    campaign: string;
  }) => {
    // Intentar recuperar UTMs originales
    const storedUTMs = sessionStorage.getItem('original_utms');
    const utms = storedUTMs 
      ? JSON.parse(storedUTMs)
      : {
          utm_source: fallback.source,
          utm_medium: fallback.medium,
          utm_campaign: fallback.campaign,
        };
    
    const params = new URLSearchParams();
    Object.entries(utms).forEach(([key, value]) => {
      if (value) params.set(key, value as string);
    });
    
    return `${baseUrl}?${params.toString()}`;
  };
  
  return { buildURLWithUTMs, currentUTMs };
}
```

**B) Usar en `OfferCard.tsx`**
```typescript
export function OfferCard({ offer, studioSlug, ... }) {
  const { buildURLWithUTMs } = useUTMPropagation();
  
  const offerUrl = buildURLWithUTMs(
    `/${studioSlug}/offer/${offer.slug}`,
    {
      source: 'profile',
      medium: 'banner',
      campaign: 'organic'
    }
  );
  
  return (
    <a href={offerUrl} onClick={handleClick}>
      {/* ... */}
    </a>
  );
}
```

**Ventajas:**
- ✅ Propaga UTMs de campaña original
- ✅ Fallback a UTMs de perfil si no hay originales
- ✅ Atribución completa del journey
- ✅ Mide campañas multi-touch

**Desventajas:**
- ⚠️ Más complejo de implementar
- ⚠️ Depende de sessionStorage (se borra al cerrar pestaña)

---

### Opción 3: Tabla de Attribution Journey (AVANZADA)

**Concepto:** Guardar todo el journey del usuario en una tabla dedicada.

#### Schema propuesto:
```prisma
model studio_attribution_journeys {
  id              String   @id @default(cuid())
  studio_id       String
  session_id      String   @unique
  
  // Primer touchpoint
  first_source    String?
  first_medium    String?
  first_campaign  String?
  first_referrer  String?
  first_page      String?
  first_timestamp DateTime
  
  // Último touchpoint
  last_source     String?
  last_medium     String?
  last_campaign   String?
  last_referrer   String?
  last_page       String?
  last_timestamp  DateTime
  
  // Journey completo
  touchpoints     Json     // Array de todos los puntos de contacto
  
  // Conversión
  converted       Boolean  @default(false)
  conversion_id   String?  // ID del submission
  
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  @@index([studio_id, session_id])
  @@index([studio_id, converted])
}
```

**Ventajas:**
- ✅ Atribución multi-touch completa
- ✅ Análisis de journey del usuario
- ✅ First-touch y last-touch attribution
- ✅ Datos para ML/IA en el futuro

**Desventajas:**
- ❌ Requiere migración de DB
- ❌ Más complejo de implementar
- ❌ Overhead en storage
- ❌ Overkill para necesidad actual

---

## 📋 RECOMENDACIÓN FINAL

### Implementar **Opción 2: Propagación de UTMs + Fallback**

**Razones:**
1. **Balance perfecto** entre simplicidad y funcionalidad
2. **Resuelve todos los casos de uso** identificados
3. **No requiere cambios en DB** (usa infraestructura actual)
4. **Fácil de mantener** y extender
5. **Compatible** con sistema de tracking existente

### Plan de Implementación

#### Fase 1: Hook de Propagación (1-2 horas)
- [ ] Crear `useUTMPropagation` hook
- [ ] Tests unitarios del hook
- [ ] Documentación

#### Fase 2: Integración en Componentes (2-3 horas)
- [ ] Modificar `OfferCard.tsx`
- [ ] Modificar `MobilePromotionsSection.tsx`
- [ ] Modificar cualquier otro link a ofertas

#### Fase 3: Testing (1-2 horas)
- [ ] Test: Usuario llega con UTMs → navega a oferta → UTMs persisten
- [ ] Test: Usuario llega sin UTMs → navega a oferta → UTMs de fallback
- [ ] Test: Verificar submissions en DB con UTMs correctos

#### Fase 4: Analytics y Reportes (3-4 horas)
- [ ] Dashboard de origen de leads por oferta
- [ ] Filtros por utm_source, utm_medium, utm_campaign
- [ ] Comparación de performance por canal

**Tiempo total estimado:** 7-11 horas

---

## 🎯 CASOS DE USO RESUELTOS

### ✅ Caso 1: Campaña Meta Ads → Landing Directa
```
URL: /{slug}/offer/boda?utm_source=facebook&utm_campaign=boda2025
✅ UTMs capturados y guardados
```

### ✅ Caso 2: Campaña Google Ads → Landing Directa
```
URL: /{slug}/offer/boda?utm_source=google&utm_campaign=boda2025
✅ UTMs capturados y guardados
```

### ✅ Caso 3: Campaña → Perfil → Oferta
```
1. URL: /{slug}?utm_source=facebook&utm_campaign=brand
2. Click en banner → /{slug}/offer/boda?utm_source=facebook&utm_campaign=brand
✅ UTMs propagados desde campaña original
```

### ✅ Caso 4: Orgánico → Perfil → Oferta
```
1. URL: /{slug} (sin UTMs)
2. Click en banner → /{slug}/offer/boda?utm_source=profile&utm_medium=banner
✅ UTMs de fallback identifican origen
```

### ✅ Caso 5: Instagram Orgánico con UTM Manual
```
Studio comparte: /{slug}/offer/boda?utm_source=instagram&utm_medium=organic
✅ Identificable como tráfico orgánico de Instagram
```

---

## 📊 MÉTRICAS QUE SE PODRÁN MEDIR

Con esta implementación, el studio podrá responder:

1. **¿Cuántos leads vienen de cada canal?**
   - Facebook Ads vs Google Ads vs Orgánico vs Perfil

2. **¿Qué campaña genera más conversiones?**
   - Por utm_campaign

3. **¿Qué medio funciona mejor?**
   - CPC vs Orgánico vs Email vs Banner

4. **¿Cuál es el journey más común?**
   - Campaña → Perfil → Oferta vs Directo a Oferta

5. **ROI por canal**
   - Inversión en ads vs leads generados

---

## 🚀 PRÓXIMOS PASOS

1. **Aprobar solución** (Opción 2 recomendada)
2. **Crear hook** `useUTMPropagation`
3. **Integrar en componentes** de ofertas
4. **Testing exhaustivo** de flujos
5. **Documentar** para equipo
6. **Crear dashboard** de analytics

---

## 📝 NOTAS ADICIONALES

### Consideraciones de Privacy
- UTMs en sessionStorage (no cookies)
- No se trackea información personal
- Compatible con GDPR/CCPA

### Performance
- Overhead mínimo (solo lectura de sessionStorage)
- No afecta tiempo de carga
- No requiere requests adicionales

### Escalabilidad
- Fácil agregar más parámetros (gclid, fbclid, etc.)
- Compatible con futura implementación de attribution journey
- Preparado para integraciones con analytics externos

---

**Fin del análisis**

