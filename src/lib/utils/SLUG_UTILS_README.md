# Slug Utils - Librería Compartida

## 📝 Descripción

Librería unificada para generación y validación de slugs en ZENPro.
Usada por **Portfolios** y **Posts** para garantizar experiencia homogénea.

## 🎯 Funciones Principales

### `generateSlug(text: string): string`

Genera un slug normalizado desde cualquier texto.

```typescript
import { generateSlug } from "@/lib/utils/slug-utils";

generateSlug("Boda en Jardín 2024");
// → "boda-en-jardin-2024"

generateSlug("Sesión XV Años ❤️");
// → "sesion-xv-anos"
```

**Normalización:**

- Convierte a minúsculas
- Remueve acentos (NFD)
- Reemplaza espacios con guiones
- Remueve caracteres especiales
- Limita longitud a 100 caracteres

### `generateUniqueSlug(baseSlug, checkExists): Promise<string>`

Genera un slug único agregando sufijo numérico si es necesario.

```typescript
import { generateUniqueSlug } from "@/lib/utils/slug-utils";

// Función de verificación personalizada
const checkExists = async (slug: string) => {
  const exists = await prisma.posts.findUnique({ where: { slug } });
  return !!exists;
};

const uniqueSlug = await generateUniqueSlug("boda-maria", checkExists);
// Si "boda-maria" existe → "boda-maria-1"
// Si "boda-maria-1" existe → "boda-maria-2"
```

**Características:**

- Generic: funciona con cualquier tabla/modelo
- Límite de seguridad: 1000 intentos
- Fallback: timestamp si alcanza límite

### `isValidSlug(slug: string): boolean`

Valida formato correcto de slug.

```typescript
import { isValidSlug } from "@/lib/utils/slug-utils";

isValidSlug("boda-maria"); // ✓ true
isValidSlug("Boda Maria"); // ✗ false (mayúsculas, espacios)
isValidSlug("-boda"); // ✗ false (inicia con guion)
isValidSlug("boda-"); // ✗ false (termina con guion)
```

**Validaciones:**

- Solo minúsculas, números y guiones
- No puede iniciar o terminar con guion
- Longitud: 1-100 caracteres

### `normalizeSlug(slug: string): string`

Normaliza un slug existente.

```typescript
import { normalizeSlug } from "@/lib/utils/slug-utils";

normalizeSlug("  Boda--Maria  ");
// → "boda-maria"
```

### Funciones Auxiliares

```typescript
// Extraer base del slug (sin sufijo numérico)
getBaseSlug("boda-maria-3");
// → "boda-maria"

// Comparar si dos slugs son equivalentes
areSlugsEquivalent("boda-maria", "boda-maria-2");
// → true

// Generar sugerencias
generateSlugSuggestions("boda-maria", 3);
// → ["boda-maria-1", "boda-maria-2", "boda-maria-3", "boda-maria-202412"]
```

## 🔄 Uso en Actions

### Posts (posts.actions.ts)

```typescript
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug-utils";

export async function createStudioPost(studioId: string, data: PostFormData) {
  // 1. Generar slug base
  const baseSlug = generateSlug(data.title || "post");

  // 2. Crear función de verificación
  const checkExists = async (slug: string) => {
    const existing = await prisma.studio_posts.findUnique({
      where: { studio_id_slug: { studio_id: studioId, slug } },
    });
    return !!existing;
  };

  // 3. Obtener slug único
  const uniqueSlug = await generateUniqueSlug(baseSlug, checkExists);

  // 4. Crear con slug único
  await prisma.studio_posts.create({
    data: { ...data, slug: uniqueSlug },
  });
}
```

### Portfolios (portfolios.actions.ts)

```typescript
// Mismo patrón, diferente tabla
const checkExists = async (slug: string) => {
  const existing = await prisma.studio_portfolios.findUnique({
    where: { studio_id_slug: { studio_id: studioId, slug } },
  });
  return !!existing;
};

const uniqueSlug = await generateUniqueSlug(baseSlug, checkExists);
```

## 🎨 Uso en Componentes

### PostEditor / PortfolioEditor

```typescript
import { generateSlug } from "@/lib/utils/slug-utils";

// Al cambiar título, regenerar slug
onChange={(e) => setFormData(prev => ({
  ...prev,
  title: e.target.value,
  slug: generateSlug(e.target.value)
}))}

// Validación en tiempo real
useEffect(() => {
  const validateSlug = async () => {
    const exists = await checkPostSlugExists(studioSlug, formData.slug);
    setError(exists ? "Ya existe" : null);
  };
  validateSlug();
}, [formData.slug]);
```

## ✅ Beneficios

1. **Consistencia**: Mismo comportamiento en posts y portfolios
2. **Mantenibilidad**: Cambios centralizados
3. **Reutilizable**: Fácil agregar a nuevos módulos (ofertas, etc.)
4. **Testeado**: Lógica probada y estable
5. **Documentado**: Código autoexplicativo

## 🔧 Testing

```typescript
// Tests sugeridos
describe("slug-utils", () => {
  it("genera slug desde título", () => {
    expect(generateSlug("Boda María")).toBe("boda-maria");
  });

  it("genera slug único con sufijo", async () => {
    const checkExists = async (slug: string) => slug === "boda";
    const unique = await generateUniqueSlug("boda", checkExists);
    expect(unique).toBe("boda-1");
  });

  it("valida formato correcto", () => {
    expect(isValidSlug("boda-maria")).toBe(true);
    expect(isValidSlug("Boda Maria")).toBe(false);
  });
});
```

## 📦 Módulos que lo usan

- ✅ Posts (`posts.actions.ts`, `PostEditor.tsx`)
- ✅ Portfolios (`portfolios.actions.ts`, `PortfolioEditor.tsx`)
- 🔜 Ofertas (próximamente)
- 🔜 Eventos (próximamente)

## 🚀 Migración

Si un módulo usa su propia función `generateSlug`, migrar a:

```typescript
// Antes ❌
function generateSlug(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-");
}

// Después ✅
import { generateSlug } from "@/lib/utils/slug-utils";
```

## 📝 Convenciones

- **Slugs únicos por studio**: Usar constraint `(studio_id, slug)`
- **Slugs limpios**: No incluir IDs en el slug final
- **Validación real-time**: Usar debounce de 500ms
- **Feedback visual**: Mostrar "✓ Disponible" o error
- **Botón copiar**: Incluir en modo edición

---

**Ubicación**: `/src/lib/utils/slug-utils.ts`
**Documentación**: Este archivo
**Tests**: Próximamente en `/tests/slug-utils.test.ts`
