'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * Componente para renderizar preview de Markdown en tiempo real
 * Convierte Markdown básico a HTML y detecta URLs automáticamente
 */
export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className={`text-sm text-zinc-500 italic ${className}`}>
        El preview aparecerá aquí mientras escribes...
      </div>
    );
  }

  // Patrón para detectar URLs (http, https, www)
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  // Convertir Markdown básico a HTML
  const convertMarkdown = (text: string): React.ReactNode[] => {
    // Dividir por líneas
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let listKey = 0;

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Separador (---)
      if (trimmedLine === '---') {
        if (listItems.length > 0) {
          result.push(
            <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 mb-2 space-y-1 text-zinc-300">
              {listItems}
            </ul>
          );
          listItems = [];
        }
        result.push(
          <hr key={`hr-${lineIndex}`} className="my-4 border-zinc-700" />
        );
        return;
      }

      // Título (# Título)
      if (trimmedLine.startsWith('# ')) {
        if (listItems.length > 0) {
          result.push(
            <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 mb-2 space-y-1 text-zinc-300">
              {listItems}
            </ul>
          );
          listItems = [];
        }
        const titleText = trimmedLine.substring(2);
        result.push(
          <h1 key={`h1-${lineIndex}`} className="text-2xl font-bold text-white mt-6 mb-3 first:mt-0 break-words overflow-wrap-anywhere">
            {renderTextWithLinks(titleText)}
          </h1>
        );
        return;
      }

      // Subtítulo (## Subtítulo)
      if (trimmedLine.startsWith('## ')) {
        if (listItems.length > 0) {
          result.push(
            <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 mb-2 space-y-1 text-zinc-300">
              {listItems}
            </ul>
          );
          listItems = [];
        }
        const subtitleText = trimmedLine.substring(3);
        result.push(
          <h2 key={`h2-${lineIndex}`} className="text-xl font-semibold text-white mt-5 mb-2 first:mt-0 break-words overflow-wrap-anywhere">
            {renderTextWithLinks(subtitleText)}
          </h2>
        );
        return;
      }

      // Lista (- item)
      if (trimmedLine.startsWith('- ')) {
        const listItemText = trimmedLine.substring(2);
          listItems.push(
          <li key={`li-${lineIndex}`} className="text-sm break-words overflow-wrap-anywhere">
            {renderTextWithLinks(listItemText)}
          </li>
        );
        return;
      }

      // Párrafo normal
      if (trimmedLine) {
        if (listItems.length > 0) {
          result.push(
            <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 mb-2 space-y-1 text-zinc-300">
              {listItems}
            </ul>
          );
          listItems = [];
        }
        result.push(
          <p key={`p-${lineIndex}`} className="text-sm text-zinc-300 mb-3 leading-relaxed break-words overflow-wrap-anywhere">
            {renderTextWithLinks(trimmedLine)}
          </p>
        );
      } else {
        // Línea vacía
        if (listItems.length > 0) {
          result.push(
            <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 mb-2 space-y-1 text-zinc-300">
              {listItems}
            </ul>
          );
          listItems = [];
        }
        if (lineIndex < lines.length - 1) {
          result.push(<br key={`br-${lineIndex}`} />);
        }
      }
    });

    // Cerrar lista si queda abierta
    if (listItems.length > 0) {
      result.push(
        <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 mb-2 space-y-1 text-zinc-300">
          {listItems}
        </ul>
      );
    }

    return result;
  };

  // Renderizar texto con links y formato (bold, italic)
  const renderTextWithLinks = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Primero procesar formato Markdown (bold, italic)
    let processedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Luego procesar URLs
    const urlMatches = Array.from(processedText.matchAll(urlPattern));

    if (urlMatches.length === 0) {
      // No hay URLs, solo renderizar con formato
      return [<span key="text" dangerouslySetInnerHTML={{ __html: processedText }} />];
    }

    urlMatches.forEach((match, matchIndex) => {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;

      // Texto antes del match
      if (matchStart > lastIndex) {
        const beforeText = processedText.substring(lastIndex, matchStart);
        if (beforeText) {
          parts.push(
            <span key={`before-${matchIndex}`} dangerouslySetInnerHTML={{ __html: beforeText }} />
          );
        }
      }

      // URL
      const url = match[0];
      const href = url.startsWith('www.') ? `https://${url}` : url;
      parts.push(
        <Link
          key={`link-${matchIndex}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
          <ExternalLink className="w-3 h-3" />
        </Link>
      );

      lastIndex = matchEnd;
    });

    // Texto después del último match
    if (lastIndex < processedText.length) {
      const afterText = processedText.substring(lastIndex);
      if (afterText) {
        parts.push(
          <span key="after" dangerouslySetInnerHTML={{ __html: afterText }} />
        );
      }
    }

    return parts;
  };

  return (
    <div className={`prose prose-invert max-w-none break-words overflow-wrap-anywhere ${className}`}>
      <div className="text-sm text-zinc-300 leading-relaxed break-words overflow-wrap-anywhere word-break-break-word">
        {convertMarkdown(content)}
      </div>
    </div>
  );
}

