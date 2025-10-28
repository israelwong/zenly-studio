# Kit de Botones UI - ProSocial App

Componente centralizado de botones que garantiza consistencia visual en toda la aplicación.

## 🎨 Características

- **Gradientes sofisticados**: Gradientes diagonales multi-color para mayor elegancia
- **Efectos de superposición**: Brillos sutiles activados en hover
- **5 variantes disponibles**: primary, secondary, outline, ghost, gradient
- **4 tamaños**: sm, md, lg, xl
- **Accesibilidad completa**: Focus states, ARIA compliance
- **Responsive**: Adaptable a todos los tamaños de pantalla
- **Dark/Light mode**: Soporte automático para tema oscuro

## 📦 Importación

```tsx
import { Button } from "@/app/components/shared/ui";
// o
import { Button } from "@/app/components/shared/ui/Button";
```

## 🔧 Uso Básico

```tsx
// Botón básico
<Button>Mi Botón</Button>

// Botón con enlace
<Button href="/contacto" variant="primary" size="lg">
  Contactar
</Button>

// Botón con evento
<Button onClick={() => console.log('Click!')} variant="secondary">
  Acción
</Button>
```

## 🎛️ Props Disponibles

| Prop         | Tipo                                                             | Default     | Descripción                  |
| ------------ | ---------------------------------------------------------------- | ----------- | ---------------------------- |
| `children`   | `ReactNode`                                                      | -           | Contenido del botón          |
| `variant`    | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'gradient'` | `'primary'` | Estilo visual del botón      |
| `size`       | `'sm' \| 'md' \| 'lg' \| 'xl'`                                   | `'md'`      | Tamaño del botón             |
| `href`       | `string`                                                         | -           | URL para convertir en enlace |
| `target`     | `'_blank' \| '_self'`                                            | `'_self'`   | Target del enlace            |
| `onClick`    | `() => void`                                                     | -           | Función al hacer click       |
| `disabled`   | `boolean`                                                        | `false`     | Deshabilitar el botón        |
| `fullWidth`  | `boolean`                                                        | `false`     | Botón de ancho completo      |
| `withBorder` | `boolean`                                                        | `false`     | Agregar borde adicional      |
| `className`  | `string`                                                         | `''`        | Clases CSS adicionales       |
| `type`       | `'button' \| 'submit' \| 'reset'`                                | `'button'`  | Tipo de botón HTML           |

## 🎨 Variantes

### Primary

Gradiente purple-pink principal para acciones importantes

```tsx
<Button variant="primary">Acción Principal</Button>
```

### Secondary

Gradiente zinc elegante para acciones secundarias

```tsx
<Button variant="secondary">Acción Secundaria</Button>
```

### Outline

Botón con borde para acciones alternativas

```tsx
<Button variant="outline">Cancelar</Button>
```

### Ghost

Botón transparente para acciones sutiles

```tsx
<Button variant="ghost">Ver más</Button>
```

### Gradient

Gradiente especial purple-fuchsia-pink para destacar

```tsx
<Button variant="gradient">¡Especial!</Button>
```

## 📏 Tamaños

```tsx
<Button size="sm">Pequeño</Button>
<Button size="md">Mediano</Button>
<Button size="lg">Grande</Button>
<Button size="xl">Extra Grande</Button>
```

## 🌟 Ejemplos Avanzados

### Botón con icono

```tsx
import { ArrowRight } from "lucide-react";

<Button variant="primary" size="lg">
  Ver Paquetes
  <ArrowRight className="w-5 h-5" />
</Button>;
```

### Botón de formulario

```tsx
<Button type="submit" variant="gradient" fullWidth>
  Enviar Formulario
</Button>
```

### Botón externo

```tsx
<Button href="https://external.com" target="_blank" variant="outline">
  Enlace Externo
</Button>
```

## 🔄 Migración desde botones personalizados

Para migrar botones existentes:

1. Importa el componente Button
2. Reemplaza elementos `<button>` o `<Link>` con `<Button>`
3. Convierte estilos CSS a props del componente
4. Elimina funciones de estilos personalizadas

### Antes:

```tsx
<Link
  href="/contacto"
  className="bg-gradient-to-r from-purple-600 to-pink-600..."
>
  Mi Botón
</Link>
```

### Después:

```tsx
<Button href="/contacto" variant="primary" size="lg">
  Mi Botón
</Button>
```

## 🎯 Beneficios

- ✅ **Consistencia**: Todos los botones siguen el mismo diseño
- ✅ **Mantenibilidad**: Un solo lugar para actualizar estilos
- ✅ **Rendimiento**: Estilos optimizados y reutilizables
- ✅ **Accesibilidad**: Estados de focus y keyboard navigation
- ✅ **Responsive**: Funciona en todos los dispositivos
- ✅ **TypeScript**: Tipado completo para mejor DX

## 🔧 Personalización

Para estilos específicos, usa la prop `className`:

```tsx
<Button variant="primary" className="my-custom-spacing bg-opacity-90">
  Botón Personalizado
</Button>
```

---

**Nota**: Este componente es parte del sistema de diseño ProSocial y sigue las especificaciones del `ESTILO_MAESTRO_MAIN.md`.
