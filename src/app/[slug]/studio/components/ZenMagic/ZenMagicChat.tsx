'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Sparkles } from 'lucide-react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { ChatMessageRenderer } from './ChatMessageRenderer';
import { useChatPersistence } from '@/hooks/useChatPersistence';

interface ZenMagicChatProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
}

/**
 * ZEN Magic Chat Component
 * 
 * TODO: Implementar funcionalidades futuras:
 * - Contexto automático basado en módulo actual
 * - Pestañas por contexto (Manager, Marketing, etc.)
 * - Integración con IA/LLM
 * - RAG para mantener contexto
 * - Capacidades dinámicas por módulo
 * - Persistencia de conversaciones
 * - Vector stores por contexto
 * - Auto-detección de cambios de módulo
 * - Actualización de contexto en pestañas existentes
 */
export function ZenMagicChat({ isOpen, onClose, studioSlug }: ZenMagicChatProps) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            content: '¡Hola! Soy ZEN Magic, tu asistente de IA. ¿En qué puedo ayudarte hoy?',
            timestamp: new Date()
        }
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { currentPath } = useChatPersistence();

    // Auto-scroll hacia abajo cuando se agregan nuevos mensajes
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // TODO: Implementar lógica de envío de mensajes
    const handleSendMessage = () => {
        if (!message.trim()) return;

        // Por ahora, solo agregamos el mensaje del usuario
        const newMessage = {
            id: Date.now(),
            type: 'user',
            content: message,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setMessage('');

        // TODO: Implementar respuesta de IA
        setTimeout(() => {
            const botResponse = {
                id: Date.now() + 1,
                type: 'bot',
                content: 'Perfecto, puedo ayudarte con eso. Puedes configurar tu utilidad <link>aquí</link> en la sección de precios y rentabilidad. También puedes revisar otros ajustes en <link>configuración</link>.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botResponse]);
        }, 1000);
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col md:w-80 sm:w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 h-14">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">ZEN Magic</h3>
                        <p className="text-xs text-zinc-400">Asistente de IA</p>
                    </div>
                </div>
                <ZenButton
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-zinc-400 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </ZenButton>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${msg.type === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-200'
                                }`}
                        >
                            {msg.type === 'bot' && (
                                <div className="flex items-center gap-2 mb-2">
                                    <Bot className="w-4 h-4" />
                                    <span className="text-xs text-zinc-400">ZEN Magic</span>
                                </div>
                            )}
                            <ChatMessageRenderer content={msg.content} type={msg.type as "user" | "bot"} />
                            <p className="text-xs opacity-70 mt-1">
                                {msg.timestamp.toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}
                {/* Elemento invisible para auto-scroll */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800">
                <div className="flex gap-2">
                    <ZenInput
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <ZenButton
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        size="icon"
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Send className="w-4 h-4" />
                    </ZenButton>
                </div>
            </div>
        </div>
    );
}
