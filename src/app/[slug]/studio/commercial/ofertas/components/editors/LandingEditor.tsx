"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ZenButton } from "@/components/ui/zen";
import { ContentBlocksEditor } from "@/components/shared/content-blocks";
import { CategorizedComponentSelector, ComponentOption } from "@/app/[slug]/profile/portfolio/components/CategorizedComponentSelector";
import { useOfferEditor } from "../OfferEditorContext";
import { ContentBlock } from "@/types/content-blocks";

interface LandingEditorProps {
  studioSlug: string;
}

// Componente para inyectar botones entre cada bloque renderizado por ContentBlocksEditor
function InjectAddButtons({
  contentBlocks,
  activeBlockId,
  onInsertAt
}: {
  contentBlocks: ContentBlock[];
  activeBlockId: string | null;
  onInsertAt: (index: number) => void;
}) {
  // Ref para mantener siempre la versión más actualizada de contentBlocks
  const contentBlocksRef = useRef(contentBlocks);

  useEffect(() => {
    contentBlocksRef.current = contentBlocks;
  }, [contentBlocks]);

  useEffect(() => {
    // Remover todos los botones inyectados cuando se arrastra (solo cuando es 'dragging')
    // NO remover el botón persistente [data-persistent-add-button]
    if (activeBlockId === 'dragging') {
      document.querySelectorAll('[data-injected-add-button]').forEach(btn => btn.remove());
      return;
    }

    if (contentBlocks.length === 0) {
      return;
    }

    // Esperar a que el DOM se actualice
    const timeoutId = setTimeout(() => {
      // Primero, limpiar TODOS los botones inyectados y recrearlos para asegurar índices correctos
      document.querySelectorAll('[data-injected-add-button]').forEach(btn => btn.remove());

      // Para cada bloque, agregar botón después (entre bloques)
      contentBlocks.forEach((block) => {
        const blockElement = document.getElementById(block.id);
        if (!blockElement) {
          return;
        }

        // Buscar el contenedor del bloque (el div con bg-zinc-800 que contiene el bloque)
        let blockContainer = blockElement.closest('div.bg-zinc-800.border.rounded-lg');

        // Si no se encuentra con clases específicas, buscar cualquier div padre con bg-zinc-800
        if (!blockContainer) {
          blockContainer = blockElement.closest('div[class*="bg-zinc-800"]');
        }

        if (!blockContainer) {
          return;
        }

        // Crear botón usando React.createElement para mejor integración
        const button = document.createElement('button');
        button.setAttribute('data-injected-add-button', block.id);
        button.className = 'w-full py-2 px-4 mb-4 text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-md transition-all bg-zinc-900 hover:bg-zinc-400 hover:text-zinc-900 hover:border-zinc-400';

        // Crear el icono SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-4 h-4 inline mr-2');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('d', 'M12 4v16m8-8H4');
        svg.appendChild(path);

        button.appendChild(svg);
        button.appendChild(document.createTextNode('Agregar componente aquí'));

        // Calcular la posición actual del bloque al hacer click usando la ref actualizada
        button.onclick = () => {
          // Usar la ref para obtener siempre la versión más actualizada de contentBlocks
          const currentBlocks = contentBlocksRef.current;
          const blockId = block.id;

          // Buscar el índice actual del bloque en el array actualizado
          const currentIndex = currentBlocks.findIndex(b => b.id === blockId);

          if (currentIndex !== -1) {
            // Insertar después del bloque actual (índice + 1)
            onInsertAt(currentIndex + 1);
          } else {
            // Si el bloque no se encuentra (fue eliminado), agregar al final
            onInsertAt(currentBlocks.length);
          }
        };

        // Insertar después del contenedor del bloque (entre bloques, no dentro)
        blockContainer.insertAdjacentElement('afterend', button);
      });
    }, 200); // Delay para asegurar que el DOM esté listo

    return () => {
      clearTimeout(timeoutId);
      // NO remover botones aquí para evitar parpadeos durante interacciones
      // Solo se removerán cuando activeBlockId === 'dragging'
    };
  }, [contentBlocks, activeBlockId, onInsertAt]);

  return null;
}

export function LandingEditor({ studioSlug }: LandingEditorProps) {
  const { contentBlocks, updateContentBlocks, formData, offerId } = useOfferEditor();

  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | undefined>(undefined);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Manejar cambio de estado de drag desde ContentBlocksEditor
  const handleDragStateChange = useCallback((isDragging: boolean) => {
    if (isDragging) {
      setActiveBlockId('dragging');
    } else {
      // Delay para permitir que la animación termine
      setTimeout(() => {
        setActiveBlockId(null);
      }, 300);
    }
  }, []);


  const handleAddComponentFromSelector = (component: ComponentOption) => {
    const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let config: Record<string, unknown> = {};

    switch (component.type) {
      case "text":
        config = {
          text: "",
          textType: "text",
          fontSize: "base",
          fontWeight: "normal",
          alignment: "left",
        };
        break;
      case "separator":
        config = { style: "space", height: 24 };
        break;
      case "media-gallery":
        config = {
          mode: component.mode || "grid",
          columns: component.mode === "grid" ? 3 : undefined,
          gap: 4,
          borderStyle: "rounded",
          aspectRatio: "auto",
          showCaptions: false,
          showTitles: false,
          lightbox: component.mode !== "slide",
          autoplay: component.mode === "slide" ? 3000 : undefined,
          perView: component.mode === "slide" ? 1 : undefined,
          showArrows: component.mode === "slide",
          showDots: component.mode === "slide",
        };
        break;
      case "video":
        config = {
          autoPlay: false,
          muted: true,
          loop: false,
          controls: true,
        };
        break;
      case "hero":
      case "hero-image":
      case "hero-video":
      case "hero-text":
      case "hero-contact":
        config = {
          title: "Tu Título Aquí",
          subtitle: "Subtítulo Impactante",
          description: "Descripción que cautive a tus prospectos",
          buttons: [
            {
              text: "Solicitar información",
              href: "#",
              variant: "primary",
              size: "lg",
            },
          ],
          overlay: true,
          overlayOpacity: 50,
          textAlignment: "center",
          verticalAlignment: "center",
          backgroundType: component.type === "hero-video" ? "video" : "image",
          containerStyle: "fullscreen",
          autoPlay: component.type === "hero-video" ? true : undefined,
          muted: component.type === "hero-video" ? true : undefined,
          loop: component.type === "hero-video" ? true : undefined,
        };
        break;
      default:
        config = {};
    }

    const newBlock: ContentBlock = {
      id: generateId(),
      type: component.type,
      order: insertAtIndex !== undefined ? insertAtIndex : contentBlocks.length,
      presentation: "block",
      media: [],
      config,
    };

    const indexToInsert = insertAtIndex !== undefined ? insertAtIndex : contentBlocks.length;

    updateContentBlocks((prev) => {
      if (indexToInsert < prev.length) {
        const newBlocks = [...prev];
        newBlocks.splice(indexToInsert, 0, newBlock);
        return newBlocks.map((block, index) => ({ ...block, order: index }));
      }
      return [...prev, newBlock];
    });

    setShowComponentSelector(false);
    setInsertAtIndex(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Cabecera informativa única - Siempre visible */}
      <div className="mb-6 pt-6 pb-4 border-t border-zinc-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-200">
              Componentes
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              {contentBlocks.length}
            </span>
          </div>
        </div>
        {contentBlocks.length > 0 && (
          <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
            Arrastra para reordenar o agrega nuevos componentes entre los existentes
          </p>
        )}
      </div>

      <div data-content-blocks-container className="space-y-4">
        {/* Botón persistente para agregar componente en posición 0 - Solo si hay componentes */}
        {contentBlocks.length > 0 && (
          <button
            type="button"
            data-persistent-add-button="true"
            onClick={() => {
              setInsertAtIndex(0);
              setShowComponentSelector(true);
            }}
            className="w-full py-2 px-4 text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-md transition-all bg-zinc-900 hover:bg-zinc-400 hover:text-zinc-900 hover:border-zinc-400"
          >
            <svg
              className="w-4 h-4 inline mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Agregar componente aquí
          </button>
        )}

        <ContentBlocksEditor
          blocks={contentBlocks}
          onBlocksChange={(updatedBlocksOrFn) => {
            // Manejar tanto array como función de actualización
            updateContentBlocks((prev) => {
              const updatedBlocks = typeof updatedBlocksOrFn === 'function'
                ? updatedBlocksOrFn(prev)
                : updatedBlocksOrFn;

              // Siempre actualizar con el array que viene de ContentBlocksEditor
              return updatedBlocks.map((block, index) => ({
                ...block,
                order: index
              }));
            });
          }}
          studioSlug={studioSlug}
          hideHeader={true}
          onAddComponentClick={() => {
            // Cuando se hace clic en agregar desde ContentBlocksEditor, usar nuestro selector completo
            setInsertAtIndex(undefined);
            setShowComponentSelector(true);
          }}
          onDragStateChange={handleDragStateChange}
          heroContext="offer"
          heroContextData={{
            offerSlug: formData.slug,
            offerId: offerId
          }}
        />

        {/* Inyectar botones después de cada bloque usando useEffect - Solo si hay componentes */}
        {contentBlocks.length > 0 && (
          <InjectAddButtons
            contentBlocks={contentBlocks}
            activeBlockId={activeBlockId}
            onInsertAt={(index) => {
              setInsertAtIndex(index);
              setShowComponentSelector(true);
            }}
          />
        )}
      </div>

      <CategorizedComponentSelector
        isOpen={showComponentSelector}
        onClose={() => {
          setShowComponentSelector(false);
          setInsertAtIndex(undefined);
        }}
        onSelect={handleAddComponentFromSelector}
      />
    </div>
  );
}
