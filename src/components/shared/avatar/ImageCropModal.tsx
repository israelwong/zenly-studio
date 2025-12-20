"use client";

import React, { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/shadcn/dialog";
import { ZenButton } from "@/components/ui/zen";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import { RotateCcw } from "lucide-react";
import "react-image-crop/dist/ReactCrop.css";

export interface ImageCropData {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCrop: (cropData: ImageCropData, croppedImageUrl: string) => void;
  initialCrop?: ImageCropData;
  // Configuración opcional
  title?: string;
  description?: string;
  initialCropSize?: number; // Porcentaje inicial del crop (default: 75)
  outputSize?: number; // Tamaño de salida en píxeles (default: 192)
  aspectRatio?: number; // Ratio de aspecto (default: 1 para cuadrado)
  circularCrop?: boolean; // Si es crop circular (default: true)
  instructions?: string[]; // Instrucciones personalizadas
}

export function ImageCropModal({
  isOpen,
  onClose,
  imageUrl,
  onCrop,
  title = "Ajustar imagen",
  description = "Arrastra y redimensiona el área para ajustar la imagen.",
  initialCropSize = 75,
  outputSize = 192,
  aspectRatio = 1,
  circularCrop = true,
  instructions = [
    "• Arrastra para mover el área de recorte",
    "• Usa las esquinas para redimensionar",
    "• El área seleccionada será tu imagen"
  ]
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: initialCropSize,
    height: initialCropSize,
    x: (100 - initialCropSize) / 2,
    y: (100 - initialCropSize) / 2
  });

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;

    // Crear un crop centrado
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: initialCropSize,
        },
        aspectRatio,
        naturalWidth,
        naturalHeight
      ),
      naturalWidth,
      naturalHeight
    );

    setCrop(crop);
  }, [initialCropSize, aspectRatio]);

  // Función para obtener imagen cropeada
  const getCroppedImg = useCallback((image: HTMLImageElement, crop: Crop): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Convertir coordenadas de porcentaje a píxeles
      let cropX: number, cropY: number, cropWidth: number, cropHeight: number;

      if (crop.unit === '%') {
        // Convertir porcentajes a píxeles reales
        cropX = (crop.x! / 100) * image.naturalWidth;
        cropY = (crop.y! / 100) * image.naturalHeight;
        cropWidth = (crop.width! / 100) * image.naturalWidth;
        cropHeight = (crop.height! / 100) * image.naturalHeight;
      } else {
        // Ya está en píxeles, solo escalar
        cropX = crop.x! * scaleX;
        cropY = crop.y! * scaleY;
        cropWidth = crop.width! * scaleX;
        cropHeight = crop.height! * scaleY;
      }

      // Tamaño de salida configurable
      const finalSize = outputSize;
      canvas.width = finalSize;
      canvas.height = finalSize;

      // Dibujar la imagen cropeada y redimensionada
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        finalSize,
        finalSize
      );

      // Convertir a blob con calidad alta
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  }, [outputSize]);

  const handleCropComplete = useCallback(async () => {
    if (!imgRef.current || !crop.width || !crop.height) {
      console.error('❌ No hay imagen o crop incompleto');
      return;
    }

    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, crop);

      if (croppedImageBlob) {
        const croppedUrl = URL.createObjectURL(croppedImageBlob);

        // Convertir crop data a nuestro formato
        const cropData: ImageCropData = {
          x: crop.x || 0,
          y: crop.y || 0,
          scale: (crop.width || initialCropSize) / 100,
          rotation: 0
        };

        onCrop(cropData, croppedUrl);
        onClose();
      } else {
        console.error('❌ No se pudo generar la imagen cropeada');
      }
    } catch (error) {
      console.error("❌ Error al procesar el crop:", error);
    }
  }, [crop, onCrop, onClose, getCroppedImg, initialCropSize]);

  const handleReset = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      const crop = centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: initialCropSize,
          },
          aspectRatio,
          naturalWidth,
          naturalHeight
        ),
        naturalWidth,
        naturalHeight
      );
      setCrop(crop);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl !z-[10001]" overlayZIndex={10000}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Canvas de crop */}
          <div className="flex justify-center">
            <div className="relative">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={aspectRatio}
                circularCrop={circularCrop}
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-96 object-contain rounded-lg"
                  crossOrigin="anonymous"
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ZenButton
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Resetear
              </ZenButton>
            </div>

            <div className="flex items-center gap-3">
              <ZenButton
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-sm"
              >
                Cancelar
              </ZenButton>
              <ZenButton
                type="button"
                onClick={handleCropComplete}
                className="text-sm"
              >
                Aplicar cambios
              </ZenButton>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="text-sm text-muted-foreground text-center">
            {instructions.map((instruction, index) => (
              <p key={index}>{instruction}</p>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

