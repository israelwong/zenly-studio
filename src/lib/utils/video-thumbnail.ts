/**
 * Genera un thumbnail (imagen) a partir del primer frame de un video
 * @param videoFile - Archivo de video
 * @param seekTo - Segundo del video para capturar (default: 1.0)
 * @returns Promise<File> - Archivo de imagen JPEG del thumbnail
 */
export async function generateVideoThumbnail(
  videoFile: File,
  seekTo: number = 1.0
): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      // Crear video element
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }

      // Crear URL del video
      const videoURL = URL.createObjectURL(videoFile);
      video.src = videoURL;
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      // Cuando el video carga los metadatos
      video.onloadedmetadata = () => {
        // Asegurar que no exceda la duración del video
        const seekTime = Math.min(seekTo, video.duration);
        video.currentTime = seekTime;
      };

      // Cuando el frame está listo
      video.onseeked = () => {
        try {
          // Configurar canvas con dimensiones del video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Dibujar frame en canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convertir canvas a blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('No se pudo generar el thumbnail'));
                return;
              }

              // Crear File a partir del blob
              const thumbnailFile = new File(
                [blob],
                `${videoFile.name.replace(/\.[^/.]+$/, '')}-thumb.jpg`,
                { type: 'image/jpeg' }
              );

              // Limpiar
              URL.revokeObjectURL(videoURL);

              resolve(thumbnailFile);
            },
            'image/jpeg',
            0.85 // Calidad 85%
          );
        } catch (error) {
          URL.revokeObjectURL(videoURL);
          reject(error);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoURL);
        reject(new Error('Error cargando el video'));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera una versión optimizada del thumbnail para mejor rendimiento
 * @param thumbnailFile - Archivo de thumbnail generado
 * @param maxSize - Tamaño máximo del lado más largo (default: 400px)
 * @returns Promise<File> - Thumbnail optimizado
 */
export async function optimizeVideoThumbnail(
  thumbnailFile: File,
  maxSize: number = 400
): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }

      img.onload = () => {
        try {
          // Calcular dimensiones manteniendo aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          // Dibujar imagen redimensionada
          context.drawImage(img, 0, 0, width, height);

          // Convertir a blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('No se pudo optimizar el thumbnail'));
                return;
              }

              const optimizedFile = new File([blob], thumbnailFile.name, {
                type: 'image/jpeg',
              });

              URL.revokeObjectURL(img.src);
              resolve(optimizedFile);
            },
            'image/jpeg',
            0.85
          );
        } catch (error) {
          URL.revokeObjectURL(img.src);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Error cargando la imagen'));
      };

      img.src = URL.createObjectURL(thumbnailFile);
    } catch (error) {
      reject(error);
    }
  });
}
