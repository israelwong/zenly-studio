'use client';

import React, { useState } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenInput } from '@/components/ui/zen';
import { Bot, Send, Crown, Sparkles } from 'lucide-react';

interface ProfileAIChatProps {
    isProPlan: boolean;
}

/**
 * ProfileAIChat - Componente reutilizable para chat IA del perfil
 * Migrado desde ZenAIChat del perfil público con mejor naming
 * 
 * Usado en:
 * - Perfil público (chat IA o upgrade)
 * - Builder preview (preview de chat IA)
 */
export function ProfileAIChat({ isProPlan }: ProfileAIChatProps) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: '¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?',
            isBot: true,
            timestamp: new Date(),
        }
    ]);

    const handleSendMessage = () => {
        if (!message.trim()) return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            text: message,
            isBot: false,
            timestamp: new Date(),
        };

        // Add bot response (placeholder)
        const botResponse = {
            id: Date.now() + 1,
            text: 'Gracias por tu mensaje. Estoy aquí para ayudarte con cualquier consulta sobre nuestros servicios.',
            isBot: true,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage, botResponse]);
        setMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isProPlan) {
        // Upsell view for non-Pro plans
        return (
            <ZenCard className="lg:sticky lg:top-4">
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2 text-purple-400">
                        <Crown className="h-5 w-5" />
                        ZEN Magic AI
                    </ZenCardTitle>
                </ZenCardHeader>
                <ZenCardContent className="space-y-4">
                    {/* Hero Image */}
                    <div className="aspect-video bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                        <div className="text-center text-white">
                            <Sparkles className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm font-medium">Asistente IA</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-zinc-100">
                            Potencia tu negocio con IA
                        </h3>

                        <p className="text-sm text-zinc-400">
                            Chatea con nuestro asistente inteligente para resolver dudas,
                            agendar citas y obtener recomendaciones personalizadas.
                        </p>

                        {/* Features */}
                        <ul className="space-y-2 text-sm text-zinc-300">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                                Respuestas instantáneas 24/7
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                                Agendamiento automático
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                                Recomendaciones personalizadas
                            </li>
                        </ul>
                    </div>

                    {/* Upgrade Button */}
                    <ZenButton
                        className="w-full flex items-center gap-2"
                        onClick={() => console.log('Upgrade to Pro clicked')}
                    >
                        <Crown className="h-4 w-4" />
                        Actualizar a Pro
                    </ZenButton>

                    {/* Additional Info */}
                    <p className="text-xs text-zinc-500 text-center">
                        Disponible en planes Pro y Enterprise
                    </p>
                </ZenCardContent>
            </ZenCard>
        );
    }

    // Pro plan - Chat interface
    return (
        <ZenCard className="lg:sticky lg:top-4 h-[600px] flex flex-col">
            <ZenCardHeader>
                <ZenCardTitle className="flex items-center gap-2 text-purple-400">
                    <Bot className="h-5 w-5" />
                    ZEN Magic AI
                </ZenCardTitle>
            </ZenCardHeader>

            <ZenCardContent className="flex-1 flex flex-col space-y-4">
                {/* Messages Area */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-96">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                        >
                            <div
                                className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.isBot
                                    ? 'bg-zinc-800 text-zinc-100'
                                    : 'bg-purple-600 text-white'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="flex gap-2">
                    <ZenInput
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1"
                    />
                    <ZenButton
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        size="sm"
                        className="px-3"
                    >
                        <Send className="h-4 w-4" />
                    </ZenButton>
                </div>

                {/* Status */}
                <p className="text-xs text-zinc-500 text-center">
                    Asistente IA activo
                </p>
            </ZenCardContent>
        </ZenCard>
    );
}
