# Análisis: Extracción de CoverDropzone Compartido

## 📋 Comparación de Componentes

### **PaqueteCoverDropzone** (Paquetes)

**Características:**

- ✅ Diseño compacto: Grid con preview pequeño (120px) + dropzone
- ✅ Validación robusta: Tipos específicos, tamaño máximo (100MB)
- ✅ Manejo de errores: Mensajes visibles con auto-dismiss
- ✅ Muestra tamaño del archivo
- ✅ Drag avanzado: dragCounter para mejor UX
- ✅ Preview pequeño y compacto
- ✅ Textos contextuales detallados

**Props:**

```typescript
interface PaqueteCoverDropzoneProps {
  media: MediaItem[]; // Array con file_url, file_type, filename, etc.
  onDropFiles: (files: File[]) => Promise<void>;
  onRemoveMedia: () => void;
  isUploading?: boolean;
}
```

---

### **BasicInfoEditor Portada** (Ofertas)

**Características:**

- ⚠️ Diseño grande: Preview aspect-video cuando hay media
- ⚠️ Validación básica: Solo verifica image/video
- ❌ Sin manejo de errores visible
- ❌ No muestra tamaño del archivo
- ⚠️ Drag simple
- ⚠️ Textos simples

**Estructura actual:**

- Usa `useMediaUpload` hook directamente
- Maneja estado local (`isUploadingCover`, `isDragOver`)
- Validación inline básica

---

## 🎯 Diferencias Clave

| Característica     | PaqueteCoverDropzone               | BasicInfoEditor           |
| ------------------ | ---------------------------------- | ------------------------- |
| **Diseño**         | Compacto (grid 120px + dropzone)   | Grande (aspect-video)     |
| **Validación**     | Robusta (tipos específicos, 100MB) | Básica (solo image/video) |
| **Errores**        | ✅ Mensajes visibles               | ❌ Sin mensajes           |
| **Tamaño archivo** | ✅ Muestra                         | ❌ No muestra             |
| **Drag handling**  | Avanzado (dragCounter)             | Simple                    |
| **Preview**        | Pequeño (120px)                    | Grande (aspect-video)     |

---

## 💡 Propuesta: Componente Compartido

### **CoverDropzone** (Componente Base)

**Props flexibles:**

```typescript
interface CoverDropzoneProps {
  // Media actual
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  filename?: string;
  fileSize?: number;

  // Callbacks
  onDropFiles: (files: File[]) => Promise<void>;
  onRemoveMedia: () => void;

  // Estado
  isUploading?: boolean;

  // Opciones de diseño
  variant?: "compact" | "large"; // compact = grid pequeño, large = aspect-video
  aspectRatio?: "video" | "square" | "auto"; // Para variant='large'

  // Opciones de validación
  maxFileSize?: number; // Default: 100MB
  acceptedImageTypes?: string[];
  acceptedVideoTypes?: string[];

  // Textos personalizables
  helpText?: string;
  placeholderText?: string;
  replaceText?: string;

  // Opciones de UI
  showFileSize?: boolean;
  showHelpText?: boolean;
}
```

**Ventajas:**

- ✅ Reutilizable para ambos casos
- ✅ Flexible con props opcionales
- ✅ Validación robusta por defecto
- ✅ Manejo de errores incluido
- ✅ Diseño adaptable (compact/large)

---

## 🔄 Plan de Refactorización

### **Paso 1: Crear componente compartido**

- Crear `/components/shared/CoverDropzone.tsx`
- Implementar con todas las características de PaqueteCoverDropzone
- Agregar props para variantes

### **Paso 2: Actualizar PaqueteCoverDropzone**

- Reemplazar implementación interna con CoverDropzone
- Pasar props apropiadas (variant='compact')

### **Paso 3: Actualizar BasicInfoEditor**

- Reemplazar código de portada con CoverDropzone
- Pasar props apropiadas (variant='large', aspectRatio='video')
- Mantener misma funcionalidad pero mejorada

---

## ✅ Factibilidad: **ALTA**

**Razones:**

1. Ambos componentes hacen lo mismo (subir portada)
2. PaqueteCoverDropzone ya tiene mejor implementación
3. Solo necesitamos hacerlo flexible
4. Beneficios claros: mejor validación, errores, UX

**Riesgos:**

- ⚠️ Cambiar diseño de BasicInfoEditor (de grande a compacto podría confundir)
- ✅ Mitigación: Usar variant='large' para mantener diseño actual

---

## 🎨 Diseño Propuesto

**Para Ofertas (variant='large'):**

- Preview grande aspect-video cuando hay media
- Dropzone grande cuando no hay media
- Mismo diseño visual actual pero con mejor validación

**Para Paquetes (variant='compact'):**

- Mantener diseño actual compacto
- Sin cambios visuales
