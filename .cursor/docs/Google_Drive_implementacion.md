Especificación Técnica: Integración Google Drive + De Sen (Next.js & Supabase)

1. Visión General del Proyecto
   De Sen busca optimizar la entrega de contenido multimedia (fotos y videos) mediante una integración con Google Drive API. El objetivo es delegar el almacenamiento pesado a Google, manteniendo una experiencia de usuario premium dentro de nuestra plataforma.

Objetivos clave:
Estudio: Vincular carpetas existentes de Drive a proyectos en De Sen.

Cliente Final: Visualizar una galería estética (thumbnails) y descargar archivos directamente de los servidores de Google.

Negocio: Costo de almacenamiento $0 y mínima carga de ancho de banda en el servidor (Vercel/Supabase).

2. Arquitectura de Datos (Supabase / Postgres)
   Debemos actualizar el modelo de datos para persistir la conexión y el mapeo de archivos.

A. Entidad: Perfil del Estudio (profiles o organizations)
Para mantener la conexión "offline" y no pedir login cada hora.

google_refresh_token: (Text, Encrypted) Token persistente para generar nuevos access tokens.

google_email: (Text) El correo vinculado para mostrar en la interfaz.

is_google_connected: (Boolean) Flag de estado de la conexión.

B. Entidad: Proyectos / Galerías (projects)
Para vincular cada entrega con su contenido en la nube.

google_folder_id: (Text) ID único de la carpeta de Google Drive.

delivery_mode: (Enum) ['native', 'google_drive'].

drive_metadata_cache: (JSONB - Opcional) Para guardar nombres de archivos y acelerar la carga inicial.

3. Flujo Funcional
   Fase 1: Vinculación (Lado del Estudio)
   Auth: El usuario otorga permisos vía OAuth2 (Scope: drive.metadata.readonly).

Mapeo: El usuario usa un explorador (Google Picker) para seleccionar la carpeta donde subió sus fotos/videos.

Registro: Se guarda el google_folder_id en el registro del proyecto dentro de Supabase.

Fase 2: Visualización (Portal del Cliente)
Request: Al entrar al link de la galería, el servidor de Next.js usa el refresh_token del estudio para pedir los archivos de esa carpeta a la API de Google.

Rendering: Se muestran las miniaturas (thumbnailLink) en una cuadrícula de React.

Delivery: \* Vista: Los archivos se ven en el portal de De Sen.

Acción: El botón "Descargar" utiliza el webContentLink de Google.

4. Implementación Técnica
   Herramientas Requeridas:
   SDK Oficial: googleapis

Auth: NextAuth.js o Supabase Auth (Google Provider).

UI: React (para el Picker) y Tailwind CSS (para la galería).

Seguridad de Tokens:
Se recomienda usar la extensión pgcrypto en Supabase o una librería de encriptación simétrica (AES-256) en el servidor de Next.js para proteger el refresh_token en la base de datos.

5. Plan de Trabajo para Cursor (Prompt Sugerido)
   Copia y pega este prompt en el chat de Cursor para iniciar la programación:

Contexto: Estoy desarrollando un módulo de entrega multimedia en Next.js. Misión: > 1. Analiza mis modelos en schema.prisma (o tipos de Supabase) y añade los campos necesarios para guardar el google_folder_id en los proyectos y el google_refresh_token en el perfil del usuario. 2. Crea un Server Action en Next.js llamado getDriveFolderContent(projectId) que:

Recupere el token del estudio desde la DB.

Use la librería googleapis para listar los archivos de la carpeta vinculada.

Retorne un JSON con name, id, thumbnailLink y mimeType.

Implementa un componente de React básico para mostrar estos elementos en una cuadrícula.

Asegura que el flujo no descargue los archivos al servidor, sino que use los links directos de Google.

Configuración Necesaria (Variables de Entorno)
Fragmento de código

GOOGLE_CLIENT_ID=tu_cliente_id
GOOGLE_CLIENT_SECRET=tu_secreto
GOOGLE_REDIRECT_URI=https://tudominio.com/api/auth/callback/google
ENCRYPTION_KEY=tu_llave_maestra_para_tokens
