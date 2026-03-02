'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Heading1, Heading2, Bold, List } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

interface SimpleTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
}

export function SimpleTextEditor({
  value,
  onChange,
  placeholder = 'Escribe tus términos y condiciones...',
  rows = 15,
  error,
}: SimpleTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Detectar formatos activos
  const checkActiveFormats = useCallback(() => {
    if (!editorRef.current) return;

    const formats = new Set<string>();
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let container: Node = range.commonAncestorContainer;
      
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement || container;
      }

      let element: Element | null = container.nodeType === Node.ELEMENT_NODE 
        ? container as Element 
        : (container as Node).parentElement;
      
      while (element && element !== editorRef.current && element.parentElement) {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'h1') {
          formats.add('h1');
          break;
        } else if (tagName === 'h2') {
          formats.add('h2');
          break;
        } else if (tagName === 'p') {
          formats.add('p');
          break;
        } else if (tagName === 'ul' || tagName === 'ol') {
          formats.add('ul');
          break;
        }
        
        element = element.parentElement;
      }

      // Verificar bold
      try {
        if (document.queryCommandState('bold')) {
          formats.add('bold');
        }
      } catch (e) {
        const elementToCheck = container.nodeType === Node.ELEMENT_NODE 
          ? container as Element 
          : (container as Node).parentElement;
        
        if (elementToCheck && elementToCheck.nodeType === Node.ELEMENT_NODE) {
          const style = window.getComputedStyle(elementToCheck);
          const fontWeight = parseInt(style.fontWeight) || 0;
          if (fontWeight >= 600 || style.fontWeight === 'bold') {
            formats.add('bold');
          }
        }
      }
    }

    setActiveFormats(formats);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const handleSelectionChange = () => {
      checkActiveFormats();
    };

    const handleClick = () => {
      setTimeout(checkActiveFormats, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    if (editorRef.current) {
      editorRef.current.addEventListener('click', handleClick);
      editorRef.current.addEventListener('mouseup', handleClick);
      editorRef.current.addEventListener('keyup', handleSelectionChange);
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (editorRef.current) {
        editorRef.current.removeEventListener('click', handleClick);
        editorRef.current.removeEventListener('mouseup', handleClick);
        editorRef.current.removeEventListener('keyup', handleSelectionChange);
      }
    };
  }, [checkActiveFormats]);

  // Limpiar HTML: eliminar <br> innecesarios en listas (similar a ContractEditor)
  const cleanHTML = useCallback((html: string): string => {
    if (!html) return html;
    
    // Crear un elemento temporal para manipular el HTML de forma más precisa
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Eliminar todos los <br> dentro de <li>
    const listItems = tempDiv.querySelectorAll('li');
    listItems.forEach((li) => {
      // Obtener el contenido de texto del li
      const textContent = li.textContent || '';
      
      // Eliminar todos los <br> del li
      const brs = li.querySelectorAll('br');
      brs.forEach(br => br.remove());
      
      // Si el li quedó vacío después de eliminar los br, restaurar el texto
      if (!li.textContent?.trim() && textContent) {
        li.textContent = textContent;
      }
    });
    
    return tempDiv.innerHTML;
  }, []);

  const handleEditorInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      const cleanedHTML = cleanHTML(editorRef.current.innerHTML);
      if (cleanedHTML !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = cleanedHTML;
      }
      onChange(cleanedHTML);
    }
  }, [onChange, cleanHTML]);

  const applyFormat = (format: string) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    const selection = window.getSelection();
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
        case "ul": {
          if (isActive) {
            // Convertir lista a párrafos
            const range = selection?.getRangeAt(0);
            if (range && editorRef.current) {
              const container = range.commonAncestorContainer;
              const list = container.nodeType === Node.TEXT_NODE 
                ? (container.parentElement?.closest('ul'))
                : (container as Element).closest('ul');
              
              if (list && list.tagName.toLowerCase() === 'ul') {
                const listItems = Array.from(list.querySelectorAll('li'));
                const parent = list.parentNode;
                
                if (parent && listItems.length > 0) {
                  const paragraphs: HTMLElement[] = [];
                  listItems.forEach((li) => {
                    const p = document.createElement('p');
                    // Limpiar <br> del contenido del <li>
                    let content = li.innerHTML.replace(/<br\s*\/?>/gi, ' ').trim();
                    p.innerHTML = content;
                    paragraphs.push(p);
                  });
                  
                  parent.replaceChild(paragraphs[0], list);
                  paragraphs.slice(1).forEach((p) => {
                    parent.insertBefore(p, paragraphs[0].nextSibling);
                  });
                }
              }
            }
          } else {
            document.execCommand("insertUnorderedList", false, undefined);
            // Limpiar <br> después de crear la lista
            setTimeout(() => {
              if (editorRef.current) {
                const cleanedHTML = cleanHTML(editorRef.current.innerHTML);
                if (cleanedHTML !== editorRef.current.innerHTML) {
                  editorRef.current.innerHTML = cleanedHTML;
                  onChange(cleanedHTML);
                }
              }
            }, 10);
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error applying format:", error);
    }

    requestAnimationFrame(() => {
      if (editorRef.current) {
        const event = new Event('input', { bubbles: true });
        editorRef.current.dispatchEvent(event);
      }
      setTimeout(() => {
        checkActiveFormats();
        editorRef.current?.focus();
      }, 10);
    });
  };

  // Inicializar contenido cuando cambia el value externo o cuando se monta
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML || '';
      const newContent = value || '';
      
      // Solo actualizar si el contenido es diferente
      // Evitar actualizar si el usuario está escribiendo
      if (currentContent !== newContent && !editorRef.current.matches(':focus')) {
        // Limpiar el contenido antes de cargarlo en el editor
        const cleanedContent = cleanHTML(newContent);
        editorRef.current.innerHTML = cleanedContent;
        // Si se limpió el contenido, actualizar el valor padre
        if (cleanedContent !== newContent) {
          onChange(cleanedContent);
        }
      }
    }
  }, [value, cleanHTML, onChange]);

  // Inicializar al montar
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      // Limpiar el contenido al inicializar
      const cleanedContent = cleanHTML(value);
      editorRef.current.innerHTML = cleanedContent;
      if (cleanedContent !== value) {
        onChange(cleanedContent);
      }
    }
  }, [value, cleanHTML, onChange]);

  return (
    <div className="space-y-2">
      {/* Toolbar simple */}
      <div className="flex items-center gap-1 flex-wrap p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
        <button
          type="button"
          onClick={() => applyFormat("h1")}
          className={cn(
            "p-1.5 rounded transition-colors flex items-center gap-1.5",
            activeFormats.has("h1")
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Título"
        >
          <Heading1 className="h-4 w-4" />
          <span className="text-xs">Título</span>
        </button>
        <button
          type="button"
          onClick={() => applyFormat("h2")}
          className={cn(
            "p-1.5 rounded transition-colors flex items-center gap-1.5",
            activeFormats.has("h2")
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Subtítulo"
        >
          <Heading2 className="h-4 w-4" />
          <span className="text-xs">Subtítulo</span>
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
      </div>

      {/* Editor contentEditable */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleEditorInput}
          className={cn(
            "w-full p-4 bg-zinc-800 border rounded-lg text-zinc-300 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none min-h-[350px] overflow-y-auto",
            error ? 'border-red-500' : 'border-zinc-700',
            !value && "text-zinc-600"
          )}
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
          data-placeholder={placeholder}
        />
      </div>

      {/* Estilos para el editor */}
      <style dangerouslySetInnerHTML={{
        __html: `
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(82, 82, 91);
        }
        [contenteditable] h1 {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.75rem !important;
          color: rgb(244, 244, 245) !important;
        }
        [contenteditable] h1:first-child {
          margin-top: 0 !important;
        }
        [contenteditable] h2 {
          font-size: 1.125rem !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          margin-top: 1rem !important;
          margin-bottom: 0.5rem !important;
          color: rgb(244, 244, 245) !important;
        }
        [contenteditable] h2:first-child {
          margin-top: 0 !important;
        }
        [contenteditable] p {
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          line-height: 1.6 !important;
        }
        [contenteditable] p:first-child {
          margin-top: 0 !important;
        }
        [contenteditable] strong,
        [contenteditable] b {
          font-weight: 600 !important;
          color: rgb(244, 244, 245) !important;
        }
        [contenteditable] ul,
        [contenteditable] ol {
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          padding-left: 1.5rem !important;
          list-style-position: outside !important;
          display: block !important;
        }
        [contenteditable] ul {
          list-style-type: disc !important;
        }
        [contenteditable] ol {
          list-style-type: decimal !important;
        }
        [contenteditable] li {
          margin: 0 !important;
          margin-bottom: 0.25rem !important;
          padding-left: 0.25rem !important;
          line-height: 1.5 !important;
          display: list-item !important;
          list-style-position: outside !important;
        }
        [contenteditable] li:last-child {
          margin-bottom: 0 !important;
        }
        [contenteditable] li br {
          display: none !important;
        }
        `
      }} />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

