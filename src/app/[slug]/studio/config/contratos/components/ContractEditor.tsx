"use client";

import React, { useRef, useCallback, useLayoutEffect, useImperativeHandle, forwardRef, useEffect, useState } from "react";
import { parseVariables } from "./utils/variable-utils";
import { ContractEditorToolbar } from "./ContractEditorToolbar";
import { ZenCard, ZenCardContent } from "@/components/ui/zen";
import { cn } from "@/lib/utils";

interface ContractEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables?: unknown[];
  readonly?: boolean;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
}

export interface ContractEditorRef {
  insertVariableAtCursor: (variable: string) => void;
  setContent: (content: string) => void;
  getContent: () => string;
}

export const ContractEditor = forwardRef<ContractEditorRef, ContractEditorProps>(({
  content,
  onChange,
  variables,
  readonly = false,
  placeholder = "Escribe el contenido del contrato...",
  className = "",
  showToolbar = false,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Historial para undo/redo (máximo 10 estados)
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const maxHistorySize = 10;
  const isUndoRedoRef = useRef(false);
  
  // Determinar si es un bloque especial (empieza con [)
  const isBlockVariable = (variable: string) => {
    return variable.trim().startsWith('[');
  };
  
  // Obtener clases CSS del badge según el tipo de variable
  const getBadgeClasses = (variable: string) => {
    const isBlock = isBlockVariable(variable);
    if (isBlock) {
      return 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-600/20 text-purple-400 text-xs font-mono border border-purple-600/30 variable-badge';
    }
    return 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/20 text-emerald-400 text-xs font-mono border border-emerald-600/30 variable-badge';
  };
  
  // Obtener clases CSS del botón de eliminar según el tipo de variable
  const getRemoveButtonClasses = (variable: string) => {
    const isBlock = isBlockVariable(variable);
    if (isBlock) {
      return 'ml-1 hover:text-purple-300 transition-colors variable-remove';
    }
    return 'ml-1 hover:text-emerald-300 transition-colors variable-remove';
  };

  const insertVariableAtCursor = useCallback(
    (variable: string) => {
      if (!editorRef.current) return;

      // Asegurar que el editor tenga foco
      editorRef.current.focus();

      // Obtener posición actual del cursor
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // Si no hay selección, insertar al final del contenido
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const newSelection = window.getSelection();
        if (newSelection) {
          newSelection.removeAllRanges();
          newSelection.addRange(range);
        }
      }

      const currentSelection = window.getSelection();
      if (!currentSelection || currentSelection.rangeCount === 0) return;

      const range = currentSelection.getRangeAt(0);

      // Si hay texto seleccionado, eliminarlo primero
      if (!range.collapsed) {
        range.deleteContents();
      }

      // Crear el badge de la variable
      const badge = document.createElement('span');
      badge.contentEditable = 'false';
      badge.className = getBadgeClasses(variable);
      badge.setAttribute('data-variable', variable);
      
      // Crear nodo de texto para la variable
      const variableText = document.createTextNode(variable);
      badge.appendChild(variableText);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = getRemoveButtonClasses(variable);
      removeBtn.setAttribute('aria-label', 'Eliminar variable');
      removeBtn.innerHTML = '<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
      
      // Agregar event listener para eliminar el badge
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (badge.parentNode) {
          badge.remove();
          // Disparar evento input para actualizar el contenido
          const event = new Event('input', { bubbles: true });
          if (editorRef.current) {
            editorRef.current.dispatchEvent(event);
          }
        }
      });
      
      badge.appendChild(removeBtn);

      // Insertar el badge en la posición del cursor
      try {
        range.insertNode(badge);

        // Insertar un espacio después del badge si es necesario
        const textNode = document.createTextNode(' ');
        range.setStartAfter(badge);
        range.collapse(true);
        range.insertNode(textNode);

        // Mover el cursor después del espacio
        range.setStartAfter(textNode);
        range.collapse(true);
        const finalSelection = window.getSelection();
        if (finalSelection) {
          finalSelection.removeAllRanges();
          finalSelection.addRange(range);
        }
      } catch (e) {
        // Si falla, insertar al final
        editorRef.current.appendChild(badge);
        const textNode = document.createTextNode(' ');
        editorRef.current.appendChild(textNode);
      }

      // Disparar evento input para actualizar el contenido
      const event = new Event('input', { bubbles: true });
      editorRef.current.dispatchEvent(event);
    },
    []
  );


  const setContentMethod = useCallback((newContent: string) => {
    if (!editorRef.current) return;
    // Pasar force=true para forzar la actualización incluso si isUpdatingRef está en true
    updateEditorContent(newContent, true);
    lastContentRef.current = newContent;
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
  }, []);

  const getContent = useCallback(() => {
    if (!editorRef.current) return '';
    
    // Extraer HTML del editor directamente (preservando todos los formatos)
    let html = editorRef.current.innerHTML;
    
    // Limpiar estilos inline no deseados que el navegador pueda agregar
    html = cleanInlineStyles(html);
    
    // Crear un elemento temporal para procesar
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Reemplazar badges con su texto plano (preservando el HTML alrededor)
    const badges = tempDiv.querySelectorAll('.variable-badge');
    badges.forEach((badge) => {
      const variable = badge.getAttribute('data-variable') || '';
      const textNode = document.createTextNode(variable);
      badge.parentNode?.replaceChild(textNode, badge);
    });
    
    // Obtener HTML final (con formatos preservados pero variables como texto)
    let finalHtml = tempDiv.innerHTML;
    
    // Limpiar saltos de línea entre tags de bloque y entre <li>
    finalHtml = cleanHtmlContent(finalHtml);
    
    return finalHtml;
  }, []);

  useImperativeHandle(ref, () => ({
    insertVariableAtCursor,
    setContent: setContentMethod,
    getContent,
  }));

  const cleanHtmlContent = (html: string) => {
    // Solo eliminar saltos de línea entre <li> tags (no agregar <br> adicionales)
    // Preservar el HTML tal como está para evitar saltos de línea adicionales
    let cleaned = html.replace(/(<\/li>)\s*\n\s*(<li>)/g, '$1$2');
    // Eliminar saltos de línea entre tags de cierre y apertura, pero sin agregar <br>
    cleaned = cleaned.replace(/(<\/[^>]+?>)\s*\n\s*(<[^/][^>]+?>)/g, '$1$2');
    return cleaned;
  };

  const updateEditorContent = (newContent: string, force: boolean = false) => {
    if (!editorRef.current) return;
    
    // Solo verificar isUpdating si no es una actualización forzada
    if (!force && isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    // Si el contenido es HTML, preservarlo directamente
    // Si es texto plano, convertirlo a HTML básico
    let html = newContent;

    // Si no parece HTML (no tiene tags), convertir saltos de línea a <br>
    if (!/<[^>]+>/.test(newContent)) {
      html = newContent.replace(/\n/g, '<br>');
    } else {
      // Limpiar saltos de línea entre tags de bloque y entre <li>
      html = cleanHtmlContent(html);
    }

    // Parsear variables y reemplazarlas con badges
    // Usar DOM para preservar mejor la estructura HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Obtener texto plano del DOM (esto preserva el orden pero sin tags)
    const plainText = tempDiv.textContent || '';
    
    // Parsear variables desde el texto plano
    // Esto detecta @variable, {variable} y [BLOQUE_ESPECIAL]
    const parsedVars = parseVariables(plainText);

    // Si hay variables, reemplazarlas en el DOM preservando estructura
    if (parsedVars.length > 0) {
      parsedVars.forEach((variable) => {
        // Buscar el texto de la variable en el DOM y reemplazarlo con badge
        const walker = document.createTreeWalker(
          tempDiv,
          NodeFilter.SHOW_TEXT,
          null
        );

        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            if (textNode.textContent?.includes(variable.fullMatch)) {
              textNodes.push(textNode);
            }
          }
        }

        // Reemplazar en cada nodo de texto encontrado
        textNodes.forEach((textNode) => {
          const text = textNode.textContent || '';
          if (text.includes(variable.fullMatch)) {
            const parts = text.split(variable.fullMatch);
            const fragment = document.createDocumentFragment();

            // Verificar si ya está dentro de un badge
            let parent = textNode.parentElement;
            while (parent && parent !== tempDiv) {
              if (parent.classList.contains('variable-badge')) {
                return; // Ya está en un badge, no reemplazar
              }
              parent = parent.parentElement;
            }

            parts.forEach((part, index) => {
              if (part) {
                fragment.appendChild(document.createTextNode(part));
              }
              if (index < parts.length - 1) {
                const badge = document.createElement('span');
                badge.contentEditable = 'false';
                badge.className = getBadgeClasses(variable.fullMatch);
                badge.setAttribute('data-variable', variable.fullMatch);
                
                // Crear nodo de texto para la variable
                const variableText = document.createTextNode(variable.fullMatch);
                badge.appendChild(variableText);

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = getRemoveButtonClasses(variable.fullMatch);
                removeBtn.setAttribute('aria-label', 'Eliminar variable');
                removeBtn.innerHTML = '<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
                
                // Agregar event listener para eliminar el badge
                removeBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (badge.parentNode) {
                    badge.remove();
                    // Disparar evento input para actualizar el contenido
                    const event = new Event('input', { bubbles: true });
                    if (editorRef.current) {
                      editorRef.current.dispatchEvent(event);
                    }
                  }
                });
                
                badge.appendChild(removeBtn);
                fragment.appendChild(badge);
              }
            });

            textNode.parentNode?.replaceChild(fragment, textNode);
          }
        });
      });

      html = tempDiv.innerHTML;
    }

    // Preservar la selección actual
    const selection = window.getSelection();
    let savedRange: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      try {
        savedRange = selection.getRangeAt(0).cloneRange();
      } catch (e) {
        // Si falla al clonar, no preservar selección
      }
    }

    // Solo actualizar si el HTML realmente cambió
    const currentHtml = editorRef.current.innerHTML;
    if (currentHtml !== html) {
      editorRef.current.innerHTML = html || '<br>';
    }

    // Restaurar selección si existe
    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch (e) {
        // Si falla, simplemente poner el cursor al final
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Actualizar estado de undo/redo
  const updateUndoRedoState = useCallback(() => {
    const history = historyRef.current;
    setCanUndo(history.length > 0 && historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < history.length - 1);
  }, []);
  
  // Guardar estado en el historial
  const saveToHistory = useCallback((state: string) => {
    if (isUndoRedoRef.current) return; // No guardar durante undo/redo
    
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;
    
    // Si estamos en medio del historial (no al final), eliminar estados futuros
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }
    
    // Agregar nuevo estado
    history.push(state);
    
    // Limitar tamaño del historial
    if (history.length > maxHistorySize) {
      history.shift();
    } else {
      historyIndexRef.current = history.length - 1;
    }
    
    updateUndoRedoState();
  }, [updateUndoRedoState]);
  
  // Undo
  const performUndo = useCallback(() => {
    if (readonly) return;
    
    const history = historyRef.current;
    if (history.length === 0 || historyIndexRef.current <= 0) return;
    
    isUndoRedoRef.current = true;
    historyIndexRef.current--;
    const previousState = history[historyIndexRef.current];
    
    if (previousState !== undefined && editorRef.current) {
      lastContentRef.current = previousState;
      onChange(previousState);
      updateEditorContent(previousState, true);
      updateUndoRedoState();
      
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [readonly, onChange, updateUndoRedoState]);
  
  const handleUndo = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    performUndo();
  }, [performUndo]);
  
  // Redo
  const performRedo = useCallback(() => {
    if (readonly) return;
    
    const history = historyRef.current;
    if (historyIndexRef.current >= history.length - 1) return;
    
    isUndoRedoRef.current = true;
    historyIndexRef.current++;
    const nextState = history[historyIndexRef.current];
    
    if (nextState !== undefined && editorRef.current) {
      lastContentRef.current = nextState;
      onChange(nextState);
      updateEditorContent(nextState, true);
      updateUndoRedoState();
      
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [readonly, onChange, updateUndoRedoState]);
  
  const handleRedo = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    performRedo();
  }, [performRedo]);

  const isUpdatingRef = useRef(false);
  const lastContentRef = useRef<string>("");
  const isMountedRef = useRef(false);

  // Inicializar contenido cuando se monta y hay contenido disponible
  useLayoutEffect(() => {
    if (!editorRef.current) return;
    
    const currentHtml = editorRef.current.innerHTML;
    const isEmpty = !currentHtml || currentHtml.trim() === '' || currentHtml === '<br>' || currentHtml.trim() === '<br>';
    const hasContent = content && content.trim() !== '';
    const contentChanged = content !== lastContentRef.current;
    
    // Si el editor está vacío y hay contenido, inicializar
    if (isEmpty && hasContent && !isUpdatingRef.current) {
      isMountedRef.current = true;
      updateEditorContent(content, true);
      lastContentRef.current = content;
      // Inicializar historial con el estado inicial
      historyRef.current = [content];
      historyIndexRef.current = 0;
      updateUndoRedoState();
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
      return;
    }
    
    // Si el contenido cambió y el editor ya está montado, actualizar
    if (isMountedRef.current && hasContent && contentChanged && !isUpdatingRef.current) {
      updateEditorContent(content, true);
      lastContentRef.current = content;
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
      return;
    }
    
    // Marcar como montado si el editor tiene contenido
    if (!isMountedRef.current && !isEmpty) {
      isMountedRef.current = true;
    }
  }, [content, updateUndoRedoState]);
  
  // Agregar event listeners para undo/redo (solo cuando el editor tiene foco)
  useEffect(() => {
    if (readonly || !editorRef.current) return;
    
    const editor = editorRef.current;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo procesar si el editor tiene foco
      if (document.activeElement !== editor && !editor.contains(document.activeElement)) {
        return;
      }
      
      // Verificar si es Ctrl o Cmd (metaKey es Cmd en Mac)
      const isModifierPressed = e.ctrlKey || e.metaKey;
      
      if (!isModifierPressed) return;
      
      // Ctrl+Z o Cmd+Z para undo
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo(e);
      }
      // Ctrl+Shift+Z o Cmd+Shift+Z para redo
      else if ((e.key === 'z' || e.key === 'Z') && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo(e);
      }
    };
    
    // Agregar listener directamente al editor para mejor captura
    editor.addEventListener('keydown', handleKeyDown);
    return () => {
      editor.removeEventListener('keydown', handleKeyDown);
    };
  }, [readonly, handleUndo, handleRedo]);


  const cleanInlineStyles = (html: string): string => {
    // Crear un elemento temporal para limpiar estilos inline no deseados
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remover estilos inline y atributos no deseados de elementos que no deberían tenerlos
    // (excepto de los badges que necesitan sus estilos)
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach((el) => {
      // No tocar los badges ni sus hijos
      if (el.classList.contains('variable-badge') || el.closest('.variable-badge')) {
        return;
      }

      // Remover estilos inline y atributos no deseados de elementos de formato
      // que pueden ser agregados por execCommand o el navegador
      const tagName = el.tagName.toLowerCase();
      const formatElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'div', 'span'];
      
      if (formatElements.includes(tagName)) {
        // Remover atributo style completo
        el.removeAttribute('style');
        
        // Remover atributos obsoletos que algunos navegadores agregan
        el.removeAttribute('font');
        el.removeAttribute('face');
        el.removeAttribute('size');
        el.removeAttribute('color');
        el.removeAttribute('align');
        el.removeAttribute('bgcolor');
        
        // Remover atributos de formato que no necesitamos
        if (tagName !== 'strong' && tagName !== 'b' && tagName !== 'em' && tagName !== 'i') {
          el.removeAttribute('font-weight');
          el.removeAttribute('font-style');
        }
      }
    });

    return tempDiv.innerHTML;
  };

  const handleEditorInput = () => {
    if (!editorRef.current || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    // Extraer HTML del editor directamente (preservando todos los formatos)
    let html = editorRef.current.innerHTML;

    // Limpiar estilos inline no deseados que el navegador pueda agregar
    html = cleanInlineStyles(html);

    // Crear un elemento temporal para procesar
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Reemplazar badges con su texto plano (preservando el HTML alrededor)
    const badges = tempDiv.querySelectorAll('.variable-badge');
    badges.forEach((badge) => {
      const variable = badge.getAttribute('data-variable') || '';
      const textNode = document.createTextNode(variable);
      badge.parentNode?.replaceChild(textNode, badge);
    });

    // Obtener HTML final (con formatos preservados pero variables como texto)
    let finalHtml = tempDiv.innerHTML;

    // Limpiar saltos de línea entre tags de bloque y entre <li>
    finalHtml = cleanHtmlContent(finalHtml);

    // Actualizar contenido con HTML preservado solo si cambió realmente
    // Comparar normalizado para evitar cambios mínimos
    const normalizeForCompare = (html: string) => {
      return html
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
    };

    const normalizedFinal = normalizeForCompare(finalHtml);
    const normalizedContent = normalizeForCompare(content);

    if (normalizedFinal !== normalizedContent) {
      // Actualizar la referencia ANTES de llamar onChange para evitar que useEffect se ejecute
      lastContentRef.current = finalHtml;
      
      // Guardar en historial antes de actualizar (solo si no es undo/redo)
      if (!isUndoRedoRef.current) {
        saveToHistory(content); // Guardar el estado anterior
      }
      
      onChange(finalHtml);
    }

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readonly) return;
    
    // Verificar si es Ctrl o Cmd (metaKey es Cmd en Mac)
    const isModifierPressed = e.ctrlKey || e.metaKey;
    
    if (!isModifierPressed) return;
    
    // Ctrl+Z o Cmd+Z para undo
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleUndo(e.nativeEvent);
    }
    // Ctrl+Shift+Z o Cmd+Shift+Z para redo
    else if ((e.key === 'z' || e.key === 'Z') && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleRedo(e.nativeEvent);
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Si click en botón de eliminar variable o en el SVG dentro del botón
    if (target.classList.contains('variable-remove') || target.closest('.variable-remove')) {
      e.preventDefault();
      e.stopPropagation();
      const button = target.classList.contains('variable-remove')
        ? target
        : target.closest('.variable-remove') as HTMLElement;
      
      // Encontrar el badge padre
      const badge = button.closest('.variable-badge') as HTMLElement;
      if (badge && badge.parentNode) {
        // Remover el badge del DOM
        badge.remove();
        // Disparar evento input para actualizar el contenido
        const event = new Event('input', { bubbles: true });
        if (editorRef.current) {
          editorRef.current.dispatchEvent(event);
        }
      }
      return;
    }
  };

  return (
    <div className={cn("relative h-full flex flex-col", className)}>
      {!readonly && showToolbar && (
        <ContractEditorToolbar 
          editorRef={editorRef}
          onUndo={performUndo}
          onRedo={performRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      )}
      <ZenCard variant="default" className="flex-1 flex flex-col relative min-h-0">
        <ZenCardContent className="p-0 flex flex-col flex-1 min-h-0">
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* Editor visual con badges */}
            <div
              ref={editorRef}
              contentEditable={!readonly}
              onInput={handleEditorInput}
              onClick={handleEditorClick}
              onKeyDown={handleEditorKeyDown}
              className={cn(
                "w-full h-full text-sm bg-zinc-950 text-zinc-300",
                "border-0 rounded-none focus-visible:ring-0 focus-visible:outline-none",
                "resize-none px-4 pt-4 pb-8 overflow-y-auto",
                "scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent",
                "contract-editor-content",
                !content && "text-zinc-600",
                readonly && "cursor-default"
              )}
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
              data-placeholder={placeholder}
            />
          </div>
        </ZenCardContent>
      </ZenCard>

      <style dangerouslySetInnerHTML={{
        __html: `
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(82, 82, 91);
        }
        .variable-badge button {
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }
        /* Resetear estilos inline que el navegador puede agregar */
        .contract-editor-content * {
          font-family: inherit !important;
        }
        /* Títulos H1 */
        .contract-editor-content h1 {
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 1rem !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding: 0 !important;
          color: rgb(244, 244, 245) !important;
          text-align: left !important;
        }
        .contract-editor-content h1:first-child {
          margin-top: 0 !important;
        }
        /* Títulos H2 */
        .contract-editor-content h2 {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.75rem !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding: 0 !important;
          color: rgb(244, 244, 245) !important;
          text-align: left !important;
        }
        .contract-editor-content h2:first-child {
          margin-top: 0 !important;
        }
        /* Párrafos */
        .contract-editor-content p {
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding: 0 !important;
          line-height: 1.6 !important;
          color: inherit !important;
          font-size: inherit !important;
          font-weight: normal !important;
          font-style: normal !important;
        }
        .contract-editor-content p:first-child {
          margin-top: 0 !important;
        }
        /* Negrita y cursiva */
        .contract-editor-content strong,
        .contract-editor-content b {
          font-weight: 600 !important;
          color: rgb(244, 244, 245) !important;
        }
        .contract-editor-content em,
        .contract-editor-content i {
          font-style: italic !important;
        }
        /* Listas */
        .contract-editor-content ul,
        .contract-editor-content ol {
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 1.5rem !important;
          padding-right: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          list-style-position: outside !important;
        }
        .contract-editor-content ul {
          list-style-type: disc !important;
        }
        .contract-editor-content ol {
          list-style-type: decimal !important;
        }
        .contract-editor-content li {
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0.5rem !important;
          padding-right: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          line-height: 1.5 !important;
          display: list-item !important;
          color: inherit !important;
        }
        /* Elementos dentro de listas */
        .contract-editor-content li p {
          margin: 0 !important;
        }
        .contract-editor-content li strong,
        .contract-editor-content li b {
          font-weight: 600 !important;
          color: rgb(244, 244, 245) !important;
        }
        .contract-editor-content li em,
        .contract-editor-content li i {
          font-style: italic !important;
        }
        /* Blockquotes */
        .contract-editor-content blockquote {
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 1rem !important;
          padding-right: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          border-left: 3px solid rgb(82, 82, 91) !important;
          border-top: none !important;
          border-right: none !important;
          border-bottom: none !important;
          color: rgb(161, 161, 170) !important;
          font-style: italic !important;
        }
        .contract-editor-content blockquote:first-child {
          margin-top: 0 !important;
        }
        .contract-editor-content blockquote p {
          margin: 0 !important;
          color: rgb(161, 161, 170) !important;
        }
        /* Elementos dentro de blockquotes */
        .contract-editor-content blockquote strong,
        .contract-editor-content blockquote b {
          font-weight: 600 !important;
          color: rgb(161, 161, 170) !important;
        }
        .contract-editor-content blockquote em,
        .contract-editor-content blockquote i {
          font-style: italic !important;
        }
        /* Evitar estilos inline no deseados */
        .contract-editor-content [style*="font-weight"] {
          font-weight: inherit !important;
        }
        .contract-editor-content [style*="font-size"]:not(.variable-badge) {
          font-size: inherit !important;
        }
        .contract-editor-content [style*="color"]:not(.variable-badge):not(.variable-badge *) {
          color: inherit !important;
        }
        `
      }} />
    </div>
  );
});

ContractEditor.displayName = "ContractEditor";
