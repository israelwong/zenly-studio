"use client";

import React, { useState, useRef, useCallback } from "react";
// import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/shadcn/dialog";
import { ZenButton } from "@/components/ui/zen";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import { RotateCcw } from "lucide-react";
import "react-image-crop/dist/ReactCrop.css";

interface AvatarCropData {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCrop: (cropData: AvatarCropData, croppedImageUrl: string) => void;
  initialCrop?: AvatarCropData;
}

export function AvatarCropModal({
  isOpen,
  onClose,
  imageUrl,
  onCrop
}: AvatarCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 75,
    height: 75,
    x: 12.5,
    y: 12.5
  });

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;

    // Crear un crop centrado y cuadrado
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 75,
        },
        1, // Aspect ratio 1:1 para avatar circular
        naturalWidth,
        naturalHeight
      ),
      naturalWidth,
      naturalHeight
    );

    setCrop(crop);
  }, []);

  // Función corregida para obtener imagen cropeada
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

      // Avatar cuadrado 192x192
      const outputSize = 192;
      canvas.width = outputSize;
      canvas.height = outputSize;

      // Dibujar la imagen cropeada y redimensionada
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        outputSize,
        outputSize
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
  }, []);

  const handleCropComplete = useCallback(async () => {
    if (!imgRef.current || !crop.width || !crop.height) {
      console.error('❌ No hay imagen o crop incompleto');
      return;
    }

    try {
      console.log('🎯 Aplicando crop:', {
        crop,
        naturalSize: {
          width: imgRef.current.naturalWidth,
          height: imgRef.current.naturalHeight
        },
        displaySize: {
          width: imgRef.current.width,
          height: imgRef.current.height
        }
      });

      const croppedImageBlob = await getCroppedImg(imgRef.current, crop);

      if (croppedImageBlob) {
        const croppedUrl = URL.createObjectURL(croppedImageBlob);

        // Convertir crop data a nuestro formato
        const cropData: AvatarCropData = {
          x: crop.x || 0,
          y: crop.y || 0,
          scale: (crop.width || 50) / 100,
          rotation: 0
        };

        console.log('✅ Crop aplicado exitosamente');
        onCrop(cropData, croppedUrl);
        onClose();
      } else {
        console.error('❌ No se pudo generar la imagen cropeada');
      }
    } catch (error) {
      console.error("❌ Error al procesar el crop:", error);
    }
  }, [crop, onCrop, onClose, getCroppedImg]);

  const handleReset = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      const crop = centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: 75,
          },
          1,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Ajustar foto de perfil
          </DialogTitle>
          <DialogDescription>
            Arrastra y redimensiona el área circular para ajustar tu foto de perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Canvas de crop */}
          <div className="flex justify-center">
            <div className="relative">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={1}
                circularCrop
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
                variant="outline"
                onClick={onClose}
                className="text-sm"
              >
                Cancelar
              </ZenButton>
              <ZenButton
                onClick={handleCropComplete}
                className="text-sm"
              >
                Aplicar cambios
              </ZenButton>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="text-sm text-muted-foreground text-center">
            <p>• Arrastra para mover el área de recorte</p>
            <p>• Usa las esquinas para redimensionar</p>
            <p>• El área circular será tu foto de perfil</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}