# Componentes Internos

Este directorio contiene componentes y utilidades para uso interno de ZEN Magic y desarrollo.

## HashNavigationInfo

Componente para mostrar información sobre navegación por hash. **Solo para uso interno de ZEN Magic.**

### Uso en ZEN Magic

Cuando el usuario pregunte sobre dónde cambiar elementos específicos, ZEN Magic puede responder con enlaces directos:

```typescript
// Ejemplo de respuesta de ZEN Magic
"Para cambiar tu logotipo, ve a:
http://localhost:3000/studio/demo-studio/builder/identidad#header"

"Para gestionar tus redes sociales, visita:
http://localhost:3000/studio/demo-studio/builder/identidad#social"

"Para agregar preguntas frecuentes, accede a:
http://localhost:3000/studio/demo-studio/builder/identidad#faq"
```

### Hashes Disponibles

- `#header` - Logo, nombre y slogan
- `#social` - Redes sociales
- `#faq` - Preguntas frecuentes
- `#footer` - Palabras clave y sitio web

### Implementación Futura

Este componente será integrado en ZEN Magic para proporcionar enlaces contextuales a los usuarios.
