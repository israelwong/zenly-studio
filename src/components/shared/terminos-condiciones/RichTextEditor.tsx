'use client';

import React, { useRef, useState } from 'react';
import { Heading1, Heading2, Bold, Italic, Minus, Type, List, Indent } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  error?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe tus términos y condiciones...',
  rows = 15,
  maxLength,
  error,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const handleSelectionChange = () => {
    if (textareaRef.current) {
      setSelectionStart(textareaRef.current.selectionStart);
      setSelectionEnd(textareaRef.current.selectionEnd);
    }
  };

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newText);

    // Restaurar selección
    setTimeout(() => {
      textarea.focus();
      const newStart = start + before.length;
      const newEnd = newStart + selectedText.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const applyFormat = (format: 'titulo' | 'subtitulo' | 'contenido' | 'bold' | 'italic' | 'list' | 'indent' | 'separator') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    switch (format) {
      case 'titulo': {
        // Si hay texto seleccionado, convertirlo a título
        if (selectedText) {
          // Remover formato existente y convertir a título
          let cleanedText = selectedText
            .replace(/^#+\s+/gm, '') // Remover headers existentes
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remover bold
            .replace(/\*(.*?)\*/g, '$1') // Remover italic
            .trim();
          
          // Si hay múltiples líneas, convertir solo la primera
          const firstLine = cleanedText.split('\n')[0];
          const formattedText = '# ' + firstLine;
          
          onChange(beforeText + formattedText + afterText);
          
          setTimeout(() => {
            textarea.focus();
            const newStart = start;
            const newEnd = start + formattedText.length;
            textarea.setSelectionRange(newStart, newEnd);
          }, 0);
        } else {
          // Sin selección: insertar título al inicio de la línea
          insertText('# ', '');
        }
        break;
      }
      case 'subtitulo': {
        // Si hay texto seleccionado, convertirlo a subtítulo
        if (selectedText) {
          let cleanedText = selectedText
            .replace(/^#+\s+/gm, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .trim();
          
          const firstLine = cleanedText.split('\n')[0];
          const formattedText = '## ' + firstLine;
          
          onChange(beforeText + formattedText + afterText);
          
          setTimeout(() => {
            textarea.focus();
            const newStart = start;
            const newEnd = start + formattedText.length;
            textarea.setSelectionRange(newStart, newEnd);
          }, 0);
        } else {
          insertText('## ', '');
        }
        break;
      }
      case 'contenido': {
        // Remover todo el formato Markdown del texto seleccionado
        if (selectedText) {
          let cleanedText = selectedText
            .replace(/^#+\s+/gm, '') // Remover headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remover bold
            .replace(/\*(.*?)\*/g, '$1') // Remover italic
            .replace(/^-\s+/gm, '') // Remover list bullets
            .replace(/^>\s+/gm, '') // Remover quotes
            .replace(/`(.*?)`/g, '$1') // Remover código
            .trim();
          
          onChange(beforeText + cleanedText + afterText);
          
          setTimeout(() => {
            textarea.focus();
            const newStart = start;
            const newEnd = start + cleanedText.length;
            textarea.setSelectionRange(newStart, newEnd);
          }, 0);
        }
        break;
      }
      case 'bold':
        insertText('**', '**');
        break;
      case 'italic':
        insertText('*', '*');
        break;
      case 'list': {
        // Si hay múltiples líneas seleccionadas, agregar bullet a cada línea
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const formattedLines = lines.map(line => {
            // Si la línea ya tiene bullet, no agregar otro
            if (line.trim().startsWith('- ')) {
              return line;
            }
            // Si la línea está vacía, no agregar bullet
            if (line.trim() === '') {
              return line;
            }
            // Agregar bullet al inicio de la línea (respetando indentación)
            const indentMatch = line.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            return indent + '- ' + line.trimStart();
          });
          const formattedText = formattedLines.join('\n');
          onChange(beforeText + formattedText + afterText);
          
          // Restaurar selección
          setTimeout(() => {
            textarea.focus();
            const newStart = start;
            const newEnd = start + formattedText.length;
            textarea.setSelectionRange(newStart, newEnd);
          }, 0);
        } else {
          // Una sola línea o sin selección: agregar bullet al inicio
          insertText('- ', '');
        }
        break;
      }
      case 'indent': {
        // Agregar sangría (2 espacios) a las líneas seleccionadas
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const formattedLines = lines.map(line => {
            if (line.trim() === '') return line;
            return '  ' + line;
          });
          const formattedText = formattedLines.join('\n');
          onChange(beforeText + formattedText + afterText);
          
          setTimeout(() => {
            textarea.focus();
            const newStart = start;
            const newEnd = start + formattedText.length;
            textarea.setSelectionRange(newStart, newEnd);
          }, 0);
        } else {
          // Una sola línea: agregar sangría al inicio
          insertText('  ', '');
        }
        break;
      }
      case 'separator': {
        // Insertar separador en una nueva línea
        const needsNewlineBefore = beforeText.length > 0 && !beforeText.endsWith('\n');
        const needsNewlineAfter = afterText.length > 0 && !afterText.startsWith('\n');
        const separator = (needsNewlineBefore ? '\n' : '') + '---\n' + (needsNewlineAfter ? '' : '');
        onChange(beforeText + separator + afterText);
        
        setTimeout(() => {
          textarea.focus();
          const newPosition = start + separator.length;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
        break;
      }
    }
  };

  // Detectar y convertir URLs automáticamente al pegar
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    // Patrón para detectar URLs (http, https, www)
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    
    if (urlPattern.test(pastedText)) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const beforeText = value.substring(0, start);
      const afterText = value.substring(end);
      
      // Mantener las URLs tal cual (se detectarán automáticamente en el preview)
      // No convertimos a markdown, solo las dejamos como texto plano
      onChange(beforeText + pastedText + afterText);
      
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + pastedText.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const characterCount = value.length;
  const remainingChars = maxLength ? maxLength - characterCount : null;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
        <button
          type="button"
          onClick={() => applyFormat('titulo')}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Título"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('subtitulo')}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Subtítulo"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('contenido')}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Contenido (texto normal)"
        >
          <Type className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-zinc-700"></div>
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Negrita"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Cursiva"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-zinc-700"></div>
        <button
          type="button"
          onClick={() => applyFormat('list')}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Lista con viñetas"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('indent')}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Sangría (indentar)"
        >
          <Indent className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-zinc-700"></div>
        <button
          type="button"
          onClick={() => applyFormat('separator')}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Separador"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          handleSelectionChange();
        }}
        onSelect={handleSelectionChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`w-full p-4 bg-zinc-800 border rounded-lg text-zinc-300 placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm ${
          error ? 'border-red-500' : 'border-zinc-700'
        }`}
      />

      {/* Contador y error */}
      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : (
          <p className="text-xs text-zinc-400">
            Los enlaces se detectarán automáticamente y se mostrarán en azul.
          </p>
        )}
        <p className={`text-xs ${maxLength && remainingChars !== null && remainingChars < 50 ? 'text-amber-400' : 'text-zinc-400'}`}>
          {characterCount}{maxLength ? ` / ${maxLength}` : ''} caracteres
        </p>
      </div>
    </div>
  );
}

