"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Heading1, Heading2, Type, Bold, Italic, List, ListOrdered, Quote, Indent, Outdent, Undo, Redo } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractEditorToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function ContractEditorToolbar({
  editorRef,
  className = "",
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ContractEditorToolbarProps) {
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Detectar formatos activos
  const checkActiveFormats = useCallback(() => {
    if (!editorRef.current) return;

    const formats = new Set<string>();
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let container: Node = range.commonAncestorContainer;
      
      // Si el contenedor es un nodo de texto, obtener su elemento padre
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement || container;
      }

      // Verificar elementos de bloque (buscar desde el contenedor hacia arriba)
      // Priorizar elementos de bloque sobre elementos de lista
      let element: Element | null = container.nodeType === Node.ELEMENT_NODE 
        ? container as Element 
        : (container as Node).parentElement;
      
      // Primero buscar elementos de bloque principales (h1, h2, p, blockquote)
      let foundBlockElement = false;
      while (element && element !== editorRef.current && element.parentElement) {
        const tagName = element.tagName.toLowerCase();
        
        // Priorizar elementos de bloque principales
        if (tagName === 'h1') {
          formats.add('h1');
          foundBlockElement = true;
          break;
        } else if (tagName === 'h2') {
          formats.add('h2');
          foundBlockElement = true;
          break;
        } else if (tagName === 'p') {
          formats.add('p');
          foundBlockElement = true;
          break;
        } else if (tagName === 'blockquote') {
          formats.add('quote');
          foundBlockElement = true;
          break;
        }
        
        element = element.parentElement;
      }
      
      // Si no encontramos un elemento de bloque principal, buscar listas
      if (!foundBlockElement) {
        element = container.nodeType === Node.ELEMENT_NODE 
          ? container as Element 
          : (container as Node).parentElement;
        
        while (element && element !== editorRef.current && element.parentElement) {
          const tagName = element.tagName.toLowerCase();
          
          if (tagName === 'ul') {
            formats.add('ul');
            break;
          } else if (tagName === 'ol') {
            formats.add('ol');
            break;
          } else if (tagName === 'li') {
            // Si está en un li, verificar si es ul o ol
            const parent = element.parentElement;
            if (parent) {
              const parentTag = parent.tagName.toLowerCase();
              if (parentTag === 'ul') {
                formats.add('ul');
                break;
              } else if (parentTag === 'ol') {
                formats.add('ol');
                break;
              }
            }
          }
          
          element = element.parentElement;
        }
      }

      // Verificar formatos inline (bold, italic)
      try {
        // Intentar usar queryCommandState primero
        if (document.queryCommandState('bold')) {
          formats.add('bold');
        }
        if (document.queryCommandState('italic')) {
          formats.add('italic');
        }
      } catch (e) {
        // Fallback: verificar estilos inline del elemento
        const elementToCheck = container.nodeType === Node.ELEMENT_NODE 
          ? container as Element 
          : (container as Node).parentElement;
        
        if (elementToCheck && elementToCheck.nodeType === Node.ELEMENT_NODE) {
          const style = window.getComputedStyle(elementToCheck);
          const fontWeight = parseInt(style.fontWeight) || 0;
          if (fontWeight >= 600 || style.fontWeight === 'bold') {
            formats.add('bold');
          }
          if (style.fontStyle === 'italic') {
            formats.add('italic');
          }
        }
      }
    }

    setActiveFormats(formats);
  }, [editorRef]);

  // Verificar formatos activos cuando cambia la selección
  useEffect(() => {
    if (!editorRef.current) return;

    const handleSelectionChange = () => {
      checkActiveFormats();
    };

    const handleClick = () => {
      setTimeout(checkActiveFormats, 10);
    };

    const handleMouseUp = () => {
      setTimeout(checkActiveFormats, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    if (editorRef.current) {
      editorRef.current.addEventListener('click', handleClick);
      editorRef.current.addEventListener('mouseup', handleMouseUp);
      editorRef.current.addEventListener('keyup', handleSelectionChange);
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (editorRef.current) {
        editorRef.current.removeEventListener('click', handleClick);
        editorRef.current.removeEventListener('mouseup', handleMouseUp);
        editorRef.current.removeEventListener('keyup', handleSelectionChange);
      }
    };
  }, [editorRef, checkActiveFormats]);

  const applyFormat = (format: string) => {
    if (!editorRef.current) return;

    // Asegurar que el editor tenga foco
    editorRef.current.focus();

    const selection = window.getSelection();
    let hasSelection = selection && selection.rangeCount > 0 && !selection.isCollapsed;
    
    if (!hasSelection) {
      // Si no hay selección, crear un rango al final del contenido o en el cursor actual
      const range = document.createRange();
      if (selection && selection.rangeCount > 0) {
        // Usar la posición actual del cursor
        range.setStart(selection.anchorNode || editorRef.current, selection.anchorOffset);
        range.setEnd(selection.anchorNode || editorRef.current, selection.anchorOffset);
      } else {
        // Si no hay cursor, ponerlo al final
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    // Si el formato ya está activo, quitarlo (toggle)
    const isActive = activeFormats.has(format);
    
    try {
      switch (format) {
        case "h1": {
          if (isActive) {
            document.execCommand("formatBlock", false, "<p>");
          } else {
            document.execCommand("formatBlock", false, "<h1>");
          }
          break;
        }
        case "h2": {
          if (isActive) {
            document.execCommand("formatBlock", false, "<p>");
          } else {
            document.execCommand("formatBlock", false, "<h2>");
          }
          break;
        }
        case "p": {
          document.execCommand("formatBlock", false, "<p>");
          break;
        }
        case "bold": {
          document.execCommand("bold", false, undefined);
          break;
        }
        case "italic": {
          document.execCommand("italic", false, undefined);
          break;
        }
        case "ul": {
          // Verificar si está en una lista ordenada (ol) - si es así, convertir a ul
          const isInOl = activeFormats.has("ol");
          
          if (isInOl) {
            // Convertir de ol a ul preservando todo el contenido
            const range = selection?.getRangeAt(0);
            if (range && editorRef.current) {
              const container = range.commonAncestorContainer;
              const list = container.nodeType === Node.TEXT_NODE 
                ? (container.parentElement?.closest('ol'))
                : (container as Element).closest('ol');
              
              if (list && list.tagName.toLowerCase() === 'ol' && list.parentNode) {
                const ul = document.createElement('ul');
                // Clonar todos los li con su contenido completo
                Array.from(list.children).forEach(li => {
                  const clonedLi = li.cloneNode(true) as HTMLElement;
                  ul.appendChild(clonedLi);
                });
                list.parentNode.replaceChild(ul, list);
              }
            }
          } else if (isActive) {
            // Si está en ul y se presiona ul, toggle: convertir a párrafos
            const range = selection?.getRangeAt(0);
            if (range && editorRef.current) {
              const container = range.commonAncestorContainer;
              const list = container.nodeType === Node.TEXT_NODE 
                ? (container.parentElement?.closest('ul'))
                : (container as Element).closest('ul');
              
              if (list && list.tagName.toLowerCase() === 'ul') {
                // Convertir todos los li a párrafos preservando el contenido
                const listItems = Array.from(list.querySelectorAll('li'));
                const parent = list.parentNode;
                
                if (parent && listItems.length > 0) {
                  // Crear todos los párrafos primero
                  const paragraphs: HTMLElement[] = [];
                  listItems.forEach((li) => {
                    const p = document.createElement('p');
                    // Preservar todo el contenido HTML del li
                    p.innerHTML = li.innerHTML;
                    paragraphs.push(p);
                  });
                  
                  // Reemplazar la lista con el primer párrafo
                  parent.replaceChild(paragraphs[0], list);
                  
                  // Insertar los párrafos restantes después del primero
                  paragraphs.slice(1).forEach((p) => {
                    parent.insertBefore(p, paragraphs[0].nextSibling);
                  });
                }
              }
            }
          } else {
            // No está en lista, crear ul
            const range = selection?.getRangeAt(0);
            if (range && !range.collapsed && editorRef.current) {
              const allParagraphs = editorRef.current.querySelectorAll('p');
              const paragraphs: HTMLElement[] = [];
              
              allParagraphs.forEach((p) => {
                if (range.intersectsNode(p)) {
                  paragraphs.push(p as HTMLElement);
                }
              });
              
              if (paragraphs.length > 0) {
                const ul = document.createElement('ul');
                paragraphs.forEach((p, index) => {
                  const li = document.createElement('li');
                  li.innerHTML = p.innerHTML;
                  ul.appendChild(li);
                  
                  if (index === 0) {
                    p.parentNode?.replaceChild(ul, p);
                  } else {
                    p.remove();
                  }
                });
              } else {
                document.execCommand("insertUnorderedList", false, undefined);
              }
            } else {
              document.execCommand("insertUnorderedList", false, undefined);
            }
          }
          break;
        }
        case "ol": {
          // Verificar si está en una lista desordenada (ul) - si es así, convertir a ol
          const isInUl = activeFormats.has("ul");
          
          if (isInUl) {
            // Convertir de ul a ol preservando todo el contenido
            const range = selection?.getRangeAt(0);
            if (range && editorRef.current) {
              const container = range.commonAncestorContainer;
              const list = container.nodeType === Node.TEXT_NODE 
                ? (container.parentElement?.closest('ul'))
                : (container as Element).closest('ul');
              
              if (list && list.tagName.toLowerCase() === 'ul' && list.parentNode) {
                const ol = document.createElement('ol');
                // Clonar todos los li con su contenido completo
                Array.from(list.children).forEach(li => {
                  const clonedLi = li.cloneNode(true) as HTMLElement;
                  ol.appendChild(clonedLi);
                });
                list.parentNode.replaceChild(ol, list);
              }
            }
          } else if (isActive) {
            // Si está en ol y se presiona ol, toggle: convertir a párrafos
            const range = selection?.getRangeAt(0);
            if (range && editorRef.current) {
              const container = range.commonAncestorContainer;
              const list = container.nodeType === Node.TEXT_NODE 
                ? (container.parentElement?.closest('ol'))
                : (container as Element).closest('ol');
              
              if (list && list.tagName.toLowerCase() === 'ol') {
                // Convertir todos los li a párrafos preservando el contenido
                const listItems = Array.from(list.querySelectorAll('li'));
                const parent = list.parentNode;
                
                if (parent && listItems.length > 0) {
                  // Crear todos los párrafos primero
                  const paragraphs: HTMLElement[] = [];
                  listItems.forEach((li) => {
                    const p = document.createElement('p');
                    // Preservar todo el contenido HTML del li
                    p.innerHTML = li.innerHTML;
                    paragraphs.push(p);
                  });
                  
                  // Reemplazar la lista con el primer párrafo
                  parent.replaceChild(paragraphs[0], list);
                  
                  // Insertar los párrafos restantes después del primero
                  paragraphs.slice(1).forEach((p) => {
                    parent.insertBefore(p, paragraphs[0].nextSibling);
                  });
                }
              }
            }
          } else {
            // No está en lista, crear ol
            const range = selection?.getRangeAt(0);
            if (range && !range.collapsed && editorRef.current) {
              const allParagraphs = editorRef.current.querySelectorAll('p');
              const paragraphs: HTMLElement[] = [];
              
              allParagraphs.forEach((p) => {
                if (range.intersectsNode(p)) {
                  paragraphs.push(p as HTMLElement);
                }
              });
              
              if (paragraphs.length > 0) {
                const ol = document.createElement('ol');
                paragraphs.forEach((p, index) => {
                  const li = document.createElement('li');
                  li.innerHTML = p.innerHTML;
                  ol.appendChild(li);
                  
                  if (index === 0) {
                    p.parentNode?.replaceChild(ol, p);
                  } else {
                    p.remove();
                  }
                });
              } else {
                document.execCommand("insertOrderedList", false, undefined);
              }
            } else {
              document.execCommand("insertOrderedList", false, undefined);
            }
          }
          break;
        }
        case "quote": {
          if (isActive) {
            document.execCommand("formatBlock", false, "<p>");
          } else {
            document.execCommand("formatBlock", false, "<blockquote>");
          }
          break;
        }
        case "indent": {
          document.execCommand("indent", false, undefined);
          break;
        }
        case "outdent": {
          document.execCommand("outdent", false, undefined);
          break;
        }
      }
    } catch (error) {
      console.error("Error applying format:", error);
    }

    // Forzar actualización del contenido para que se reflejen los cambios visuales
    // Esto dispara el handleEditorInput que preserva el HTML
    // Usar requestAnimationFrame para asegurar que el DOM se actualizó primero
    requestAnimationFrame(() => {
      if (editorRef.current) {
        const event = new Event('input', { bubbles: true });
        editorRef.current.dispatchEvent(event);
      }
      
      // Actualizar formatos activos después de aplicar
      setTimeout(() => {
        checkActiveFormats();
        editorRef.current?.focus();
      }, 10);
    });
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-1 flex-wrap p-2 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 shrink-0",
        className
      )}
    >
      {/* Botones Undo/Redo */}
      {onUndo && onRedo && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onUndo();
            }}
            disabled={!canUndo}
            className={cn(
              "p-1.5 rounded transition-colors",
              canUndo
                ? "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                : "text-zinc-600 cursor-not-allowed opacity-50"
            )}
            title="Deshacer (Ctrl+Z / Cmd+Z)"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onRedo();
            }}
            disabled={!canRedo}
            className={cn(
              "p-1.5 rounded transition-colors",
              canRedo
                ? "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                : "text-zinc-600 cursor-not-allowed opacity-50"
            )}
            title="Rehacer (Ctrl+Shift+Z / Cmd+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-zinc-700" />
        </>
      )}
      <button
        type="button"
        onClick={() => applyFormat("h1")}
        className={cn(
          "p-1.5 rounded transition-colors",
          activeFormats.has("h1")
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        )}
        title="Título (H1)"
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyFormat("h2")}
        className={cn(
          "p-1.5 rounded transition-colors",
          activeFormats.has("h2")
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        )}
        title="Subtítulo (H2)"
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyFormat("p")}
        className={cn(
          "p-1.5 rounded transition-colors",
          activeFormats.has("p")
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        )}
        title="Párrafo normal"
      >
        <Type className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-zinc-700" />
      <button
        type="button"
        onClick={() => applyFormat("bold")}
        className={cn(
          "p-1.5 rounded transition-colors",
          activeFormats.has("bold")
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        )}
        title="Negrita"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyFormat("italic")}
        className={cn(
          "p-1.5 rounded transition-colors",
          activeFormats.has("italic")
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        )}
        title="Cursiva"
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-zinc-700" />
      <button
        type="button"
        onClick={() => applyFormat("ul")}
        className={cn(
          "p-1.5 rounded transition-colors",
          activeFormats.has("ul")
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        )}
        title="Lista con viñetas"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyFormat("ol")}
        className={cn(
          "p-1.5 rounded transition-colors",
          activeFormats.has("ol")
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        )}
        title="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyFormat("indent")}
        className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        title="Indentar (Tabulador)"
      >
        <Indent className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyFormat("outdent")}
        className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        title="Reducir tabulación"
      >
        <Outdent className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-zinc-700" />
      <button
        type="button"
        onClick={() => applyFormat("quote")}
        className={cn(
          "p-1.5 rounded transition-colors",
          activeFormats.has("quote")
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        )}
        title="Cita"
      >
        <Quote className="h-4 w-4" />
      </button>
    </div>
  );
}

