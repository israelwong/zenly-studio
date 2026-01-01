# Análisis: Checkboxes para Reutilizar Datos en Formulario de Contrato

## Propuesta del Usuario

Agregar checkboxes en el formulario "Completar Datos del Estudio" para reutilizar datos existentes:

1. **Nombre del estudio**: Check "es el mismo que el de mi estudio"
2. **Dirección**: Check "es la misma que la del estudio"
3. **Correo**: 
   - Check "es el mismo que el del estudio"
   - Check "es el mismo que el de mi perfil"
4. **Teléfono**: Check "es el mismo que el de mi perfil"

Cuando un checkbox está marcado:
- El valor se copia automáticamente al input
- El input se vuelve readonly
- Ese valor es el que se guardará en la propiedad

## Datos Disponibles

### Datos del Estudio (`studios`)
- `studio_name` - Nombre del estudio
- `email` - Correo del estudio
- `address` - Dirección del estudio
- `phone` - Teléfono del estudio (nuevo campo)

### Datos del Perfil del Usuario (`platform_leads`)
- `name` - Nombre del usuario
- `email` - Correo del usuario
- `phone` - Teléfono del usuario

**Acceso**: `obtenerPerfil(studioSlug)` en `src/lib/actions/studio/account/perfil.actions.ts`

## Análisis de la Propuesta

### ✅ Ventajas

1. **Reduce duplicación**: Evita que el usuario tenga que escribir datos que ya existen
2. **Mejora UX**: Facilita el llenado del formulario
3. **Flexibilidad**: Permite usar datos existentes o ingresar nuevos
4. **Consistencia**: Si el usuario marca un checkbox, garantiza que se use el mismo valor

### ⚠️ Consideraciones

1. **Nombre del estudio**: 
   - El check "es el mismo que el de mi estudio" no tiene mucho sentido porque ya estamos editando el estudio
   - El nombre del estudio siempre será editable (es el nombre del estudio mismo)
   - **Propuesta**: No agregar check para nombre del estudio, solo campo editable

2. **Dirección**:
   - ✅ Tiene sentido: Si el estudio ya tiene dirección, puede reutilizarla
   - Check: "Usar la dirección del estudio"

3. **Correo**:
   - ✅ Tiene sentido: Puede usar el correo del estudio o el de su perfil
   - Checks: 
     - "Usar el correo del estudio" (studio.email)
     - "Usar el correo de mi perfil" (platform_leads.email)
   - **Nota**: Solo uno puede estar marcado a la vez (radio buttons o lógica exclusiva)

4. **Teléfono**:
   - ✅ Tiene sentido: Puede usar el teléfono del estudio o el de su perfil
   - Checks:
     - "Usar el teléfono del estudio" (studio.phone)
     - "Usar el teléfono de mi perfil" (platform_leads.phone)
   - **Nota**: Solo uno puede estar marcado a la vez

## Propuesta Refinada

### Campos del Formulario

1. **Nombre del Estudio**
   - Campo editable siempre
   - Sin checkbox (es el nombre del estudio mismo)
   - Valor inicial: `studio.studio_name`

2. **Nombre del Representante Legal**
   - Campo editable siempre
   - Sin checkbox (es específico para contratos)
   - Valor inicial: `studio.representative_name`

3. **Dirección**
   - Campo editable
   - Checkbox: "Usar la dirección del estudio"
   - Si marcado: muestra `studio.address` readonly
   - Si desmarcado: permite editar

4. **Correo**
   - Campo editable
   - Radio buttons o checks exclusivos:
     - "Usar el correo del estudio" → `studio.email` readonly
     - "Usar el correo de mi perfil" → `platform_leads.email` readonly
     - "Usar otro correo" → editable
   - Valor inicial: `studio.email` (si existe)

5. **Teléfono**
   - Campo editable
   - Radio buttons o checks exclusivos:
     - "Usar el teléfono del estudio" → `studio.phone` readonly
     - "Usar el teléfono de mi perfil" → `platform_leads.phone` readonly
     - "Usar otro teléfono" → editable
   - Valor inicial: `studio.phone` (si existe)

## Implementación Técnica

### Estado del Componente

```typescript
interface FormData {
  studio_name: string;
  representative_name: string;
  address: string;
  email: string;
  phone: string;
}

interface CheckboxStates {
  useStudioAddress: boolean;
  emailSource: 'studio' | 'profile' | 'custom';
  phoneSource: 'studio' | 'profile' | 'custom';
}
```

### Lógica

1. Al cargar datos:
   - Obtener datos del estudio (`getStudioContractData`)
   - Obtener datos del perfil (`obtenerPerfil`)
   - Inicializar formulario con valores del estudio
   - Inicializar checkboxes según valores existentes

2. Al cambiar checkbox:
   - Si se marca "usar del estudio": copiar valor y hacer readonly
   - Si se marca "usar del perfil": copiar valor y hacer readonly
   - Si se desmarca: permitir edición

3. Al guardar:
   - Guardar los valores actuales del formulario (independientemente del origen)
   - Los valores readonly también se guardan

## Preguntas para Clarificar

1. ¿El nombre del estudio necesita checkbox o siempre es editable?
2. ¿Los checks de correo/teléfono deben ser mutuamente exclusivos (radio buttons) o pueden ser checkboxes independientes?
3. ¿Si el usuario marca un checkbox y luego lo desmarca, debe mantener el valor o limpiarlo?
4. ¿Qué pasa si el estudio no tiene dirección/correo/teléfono pero el perfil sí? ¿Debemos mostrar el check del perfil?

## Recomendación

✅ **Implementar con la propuesta refinada**:
- Nombre del estudio: siempre editable (sin checkbox)
- Dirección: checkbox para reutilizar del estudio
- Correo: radio buttons para elegir origen (studio/perfil/custom)
- Teléfono: radio buttons para elegir origen (studio/perfil/custom)

Esto proporciona flexibilidad sin complicar demasiado la UI.

