"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, BookOpen, Settings, GraduationCap, LifeBuoy, Target, Package, DollarSign, XCircle, TrendingUp } from "lucide-react";
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from "@/components/ui/zen";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/shadcn/tabs";

export function GuiaDeUso() {
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set(["que-es"]));

    const toggleAccordion = (id: string) => {
        setOpenAccordions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const AccordionItem = ({ id, title, children, icon: Icon }: { id: string; title: string; children: React.ReactNode; icon?: React.ElementType }) => {
        const isOpen = openAccordions.has(id);
        return (
            <div className="border border-zinc-800 rounded-lg overflow-hidden transition-all duration-200 hover:border-zinc-700">
                <button
                    onClick={() => toggleAccordion(id)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-zinc-800/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                        <span className="font-medium text-white text-sm leading-relaxed">{title}</span>
                    </div>
                    {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    )}
                </button>
                {isOpen && (
                    <div className="px-4 pb-4 border-t border-zinc-800 bg-zinc-900/30">
                        <div className="pt-3 space-y-3">
                            {children}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <ZenCard variant="default" padding="none">
            <ZenCardHeader className="border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                        <HelpCircle className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <ZenCardTitle>Guía de uso</ZenCardTitle>
                        <ZenCardDescription>
                            Aprende a gestionar tu catálogo
                        </ZenCardDescription>
                    </div>
                </div>
            </ZenCardHeader>

            <ZenCardContent className="p-6">
                <Tabs defaultValue="conceptos" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6 bg-zinc-800/50 p-1 rounded-lg">
                        <TabsTrigger
                            value="conceptos"
                            className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg transition-all duration-200 text-xs sm:text-sm"
                        >
                            <BookOpen className="h-4 w-4" />
                            <span className="hidden sm:inline">Conceptos</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="configuracion"
                            className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg transition-all duration-200 text-xs sm:text-sm"
                        >
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Configuración</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="aprende"
                            className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg transition-all duration-200 text-xs sm:text-sm"
                        >
                            <GraduationCap className="h-4 w-4" />
                            <span className="hidden sm:inline">Aprende</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="ayuda"
                            className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg transition-all duration-200 text-xs sm:text-sm"
                        >
                            <LifeBuoy className="h-4 w-4" />
                            <span className="hidden sm:inline">Ayuda</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* PESTAÑA 1: Conceptos Básicos */}
                    <TabsContent value="conceptos" className="space-y-4 max-h-[600px] overflow-y-auto">
                        <AccordionItem id="que-es" title="¿Qué es el catálogo?" icon={Target}>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-base font-semibold text-white mb-2">Tu Catálogo: El Cerebro de tus Precios</h4>
                                    <p className="text-zinc-300 text-sm leading-relaxed mb-3">
                                        El catálogo <strong className="text-white">NO es una tienda</strong> para tus clientes.
                                        Es tu biblioteca privada de productos y servicios que:
                                    </p>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2 text-zinc-300 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            <span>Calcula automáticamente tus utilidades</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-zinc-300 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            <span>Alimenta tus paquetes con precios inteligentes</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-zinc-300 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            <span>Te ayuda a cotizar sin errores</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-zinc-300 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            <span>Proyecta tu rentabilidad real</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-3">
                                    <p className="text-purple-200 text-sm italic">
                                        💡 Piénsalo como tu &quot;recetario de precios&quot;.
                                    </p>
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem id="para-que" title="Para qué sirve" icon={Target}>
                            <div className="space-y-3">
                                <p className="text-zinc-300 text-sm mb-4">Casos de Uso Reales</p>
                                <div className="space-y-3">
                                    {[
                                        { title: "Crear paquetes con precios calculados automáticamente", desc: 'Ejemplo: Paquete "Boda Premium" = Suma de 8 servicios con margen del 30%' },
                                        { title: "Cotizar rápido sin reinventar la rueda", desc: "Reutilizas items configurados en lugar de escribir desde cero" },
                                        { title: "Saber tu rentabilidad ANTES de entregar la cotización", desc: "El sistema te muestra: Costo $5,000 | Precio $8,500 | Utilidad $3,500" },
                                        { title: "Mantener consistencia en tus precios", desc: "Evitas cobrar $1,200 en enero y $800 en marzo por el mismo servicio" },
                                        { title: "Escalar tu operación", desc: "Tu equipo usa los mismos precios base sin improvisación" }
                                    ].map((caso, idx) => (
                                        <div key={idx} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-white text-sm font-medium">{caso.title}</p>
                                                    <p className="text-zinc-400 text-xs mt-1">{caso.desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem id="estructura" title="Cómo estructurar tu catálogo" icon={Settings}>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-base font-semibold text-white mb-3">Estructura Recomendada</h4>
                                    <p className="text-zinc-300 text-sm mb-4">Tu catálogo se organiza en 3 niveles:</p>
                                    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 font-mono text-xs text-zinc-300 space-y-1">
                                        <div>┌─ SECCIÓN (ej: &quot;Experiencias previas al evento&quot;)</div>
                                        <div>│  └─ CATEGORÍA (ej: &quot;Fotografía de sesión previa&quot;)</div>
                                        <div>│     └─ ITEMS (ej: &quot;Sesión en estudio 45min&quot;, &quot;Sesión en locación 2hrs&quot;)</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-base font-semibold text-white mb-3">💡 Ejemplo Real - Fotógrafo de Bodas:</h4>
                                    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-2 text-sm">
                                        <div className="text-white font-medium">Sección: &quot;Servicios de Fotografía&quot;</div>
                                        <div className="pl-4 space-y-2 text-zinc-300">
                                            <div>├─ Categoría: &quot;Cobertura de evento&quot;</div>
                                            <div className="pl-4 space-y-1">
                                                <div>├─ Item: Fotógrafo principal 6hrs</div>
                                                <div>├─ Item: Fotógrafo adicional 4hrs</div>
                                                <div>└─ Item: Asistente de fotografía 8hrs</div>
                                            </div>
                                            <div>├─ Categoría: &quot;Sesiones complementarias&quot;</div>
                                            <div className="pl-4 space-y-1">
                                                <div>├─ Item: Sesión preboda 2hrs</div>
                                                <div>├─ Item: Trash the dress</div>
                                                <div>└─ Item: Sesión familiar post-boda</div>
                                            </div>
                                            <div>└─ Categoría: &quot;Postproducción&quot;</div>
                                            <div className="pl-4 space-y-1">
                                                <div>├─ Item: Edición estándar (300 fotos)</div>
                                                <div>├─ Item: Retoque premium (100 fotos)</div>
                                                <div>└─ Item: Álbum digital diseñado</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
                                    <p className="text-blue-200 text-sm">
                                        🎯 <strong>Tip:</strong> Agrupa por tipo de servicio, no por evento. Así reutilizas items en diferentes paquetes.
                                    </p>
                                </div>
                            </div>
                        </AccordionItem>
                    </TabsContent>

                    {/* PESTAÑA 2: Configuración y Precios */}
                    <TabsContent value="configuracion" className="space-y-4 max-h-[600px] overflow-y-auto">
                        <AccordionItem id="items-paquetes" title="De items a paquetes inteligentes" icon={Package}>
                            <div className="space-y-4">
                                {[
                                    {
                                        paso: 1,
                                        titulo: "Configura tus ITEMS con datos reales",
                                        items: [
                                            { nombre: "Fotógrafo principal 8 horas", costo: "$2,000", gasto: "$300", tipo: "Servicio" },
                                            { nombre: "Álbum premium 30x30cm", costo: "$1,200", gasto: "$150", tipo: "Producto" }
                                        ]
                                    },
                                    {
                                        paso: 2,
                                        titulo: "Configura Márgenes Globales",
                                        items: [
                                            { nombre: "Utilidad Servicios", valor: "30%" },
                                            { nombre: "Utilidad Productos", valor: "10%" },
                                            { nombre: "Comisión de Venta", valor: "5%" },
                                            { nombre: "Sobreprecio/Descuento", valor: "10%" }
                                        ]
                                    },
                                    {
                                        paso: 3,
                                        titulo: "El Sistema Calcula Automáticamente",
                                        calculo: true
                                    },
                                    {
                                        paso: 4,
                                        titulo: "Crea Paquete 'Boda Clásica'",
                                        paquete: true
                                    }
                                ].map((seccion) => (
                                    <div key={seccion.paso} className="border-l-2 border-purple-600/50 pl-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-purple-600/20 border border-purple-600/50 flex items-center justify-center text-purple-400 text-xs font-bold">
                                                {seccion.paso}
                                            </div>
                                            <h5 className="text-white font-semibold text-sm">{seccion.titulo}</h5>
                                        </div>
                                        {seccion.items && !seccion.calculo && (
                                            <div className="space-y-2 ml-8">
                                                {seccion.items.map((item, idx) => (
                                                    <div key={idx} className="bg-zinc-800/50 rounded-lg p-3 text-sm">
                                                        <div className="text-white font-medium mb-2">Item: &quot;{item.nombre}&quot;</div>
                                                        <div className="space-y-1 text-zinc-300">
                                                            {'costo' in item && item.costo && <div>├─ Costo: {item.costo}</div>}
                                                            {'gasto' in item && item.gasto && <div>├─ Gasto: {item.gasto}</div>}
                                                            {'tipo' in item && item.tipo && <div>└─ Tipo: {item.tipo}</div>}
                                                            {'valor' in item && item.valor && <div>├─ {item.nombre}: {item.valor}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {seccion.calculo && (
                                            <div className="ml-8 space-y-3">
                                                <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
                                                    <div className="text-white font-medium mb-2">Fotógrafo 8hrs:</div>
                                                    <div className="space-y-1 text-zinc-300 font-mono text-xs">
                                                        <div>Costo: $2,000</div>
                                                        <div>Gasto: $300</div>
                                                        <div>Base: $2,300</div>
                                                        <div>+ Utilidad 30%: $690</div>
                                                        <div>+ Comisión 5%: $149.50</div>
                                                        <div>+ Sobreprecio 10%: $313.95</div>
                                                        <div className="border-t border-zinc-700 pt-1 mt-1 text-white font-semibold">PRECIO SUGERIDO: $3,453.45 ✓</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {seccion.paquete && (
                                            <div className="ml-8 bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-3">
                                                <p className="text-emerald-200 text-sm">
                                                    Seleccionas 6 items del catálogo y el sistema calcula automáticamente:
                                                </p>
                                                <div className="mt-2 text-white text-sm font-semibold">
                                                    TOTAL PAQUETE: $10,714.85
                                                </div>
                                                <div className="text-emerald-300 text-xs mt-1">
                                                    Utilidad proyectada: $3,214.46 (30%)
                                                </div>
                                                <p className="text-emerald-200 text-xs mt-2 italic">
                                                    🎯 Ahora puedes cotizar &quot;Boda Clásica&quot; en 1 click con precios rentables y profesionales.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>

                        <AccordionItem id="utilidad" title="Cálculo de utilidad: Por qué importa" icon={DollarSign}>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-base font-semibold text-white mb-3">Entendiendo la Utilidad Real</h4>
                                    <p className="text-zinc-300 text-sm mb-4">
                                        Muchos fotógrafos fijan precios al &quot;ojo&quot;: &quot;Cobro $10,000 porque es lo que cobran otros&quot;
                                    </p>
                                    <p className="text-zinc-400 text-sm mb-4"><strong className="text-white">Problema:</strong> ¿Cuánto ganas REALMENTE?</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-red-800/50 bg-red-950/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <XCircle className="w-5 h-5 text-red-400" />
                                            <h5 className="text-red-300 font-semibold">Sin Catálogo</h5>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div><strong className="text-white">Evento:</strong> Boda</div>
                                            <div><strong className="text-white">Precio cobrado:</strong> $10,000</div>
                                            <div className="mt-3 text-xs text-red-200">
                                                Gastos reales: $8,400<br />
                                                Utilidad: $1,600 (16%) 😱
                                            </div>
                                            <div className="mt-2 text-xs text-red-300 italic">
                                                &quot;Trabajaste 2 sábados + 20 horas de edición para ganar $1,600...&quot;
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border border-emerald-800/50 bg-emerald-950/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                            <h5 className="text-emerald-300 font-semibold">Con Catálogo</h5>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div><strong className="text-white">Evento:</strong> Boda</div>
                                            <div><strong className="text-white">Precio sugerido:</strong> $12,612.60</div>
                                            <div className="mt-3 text-xs text-emerald-200">
                                                Costo: $8,400<br />
                                                Utilidad: $4,212.60 (33%) ✓
                                            </div>
                                            <div className="mt-2 text-xs text-emerald-300 italic">
                                                &quot;Mismos servicios, pero ahora ganas $4,200 en lugar de $1,600...&quot;
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
                                    <h5 className="text-white font-semibold text-sm mb-3">🎯 El Catálogo Te Protege De:</h5>
                                    <ul className="space-y-1 text-zinc-300 text-sm">
                                        <li className="flex items-start gap-2">
                                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <span>Cotizar por debajo de tus costos</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <span>Regalar trabajo sin saberlo</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <span>Competir solo por precio bajo</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <span>Quemar a tu equipo por márgenes ridículos</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <span>Quebrar tu negocio a largo plazo</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem id="errores" title="Errores comunes (Y cómo evitarlos)" icon={AlertCircle}>
                            <div className="space-y-3">
                                {[
                                    {
                                        error: "Dejo todos los costos en $0 porque no sé",
                                        resultado: "Precios irreales, no sabes si ganas o pierdes",
                                        solucion: "Investiga tus costos reales, aunque sea estimado"
                                    },
                                    {
                                        error: "Pongo precios 'bonitos' ($5,000, $10,000)",
                                        resultado: "Números arbitrarios sin fundamento",
                                        solucion: "Deja que el sistema calcule, luego redondea"
                                    },
                                    {
                                        error: "Creo items genéricos sin detalle",
                                        resultado: "Cotizaciones ambiguas, expectativas confusas",
                                        solucion: "Sé específico: 'Fotógrafo 8hrs' vs 'Fotografía'"
                                    },
                                    {
                                        error: "No actualizo costos cuando suben precios",
                                        resultado: "Tus márgenes se evaporan sin darte cuenta",
                                        solucion: "Revisa costos cada trimestre"
                                    },
                                    {
                                        error: "Configuro márgenes muy bajos por miedo",
                                        resultado: "Trabajas gratis o casi gratis",
                                        solucion: "30% en servicios es estándar profesional"
                                    }
                                ].map((item, idx) => (
                                    <div key={idx} className="border border-zinc-700/50 rounded-lg p-3 bg-zinc-800/30">
                                        <div className="flex items-start gap-2 mb-2">
                                            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-white text-sm font-medium">{item.error}</p>
                                        </div>
                                        <div className="ml-6 space-y-1">
                                            <div className="flex items-start gap-2">
                                                <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-1" />
                                                <p className="text-zinc-400 text-xs"><strong>Resultado:</strong> {item.resultado}</p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-1" />
                                                <p className="text-zinc-300 text-xs"><strong>Solución:</strong> {item.solucion}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>
                    </TabsContent>

                    {/* PESTAÑA 3: Aprende y Mejora */}
                    <TabsContent value="aprende" className="space-y-4 max-h-[600px] overflow-y-auto">
                        <AccordionItem id="casos-exito" title="Casos de éxito" icon={TrendingUp}>
                            <div className="space-y-4">
                                {[
                                    {
                                        nombre: "Ana García",
                                        rol: "Fotógrafa de Bodas, Guadalajara",
                                        testimonio: "Antes tardaba 2 horas cotizando cada boda. Ahora tardo 5 minutos y sé que siempre gano 35%."
                                    },
                                    {
                                        nombre: "Carlos Mendoza",
                                        rol: "Videógrafo",
                                        testimonio: "Descubrí que estaba perdiendo $4,000 por evento porque no consideraba el tiempo de edición. El catálogo me salvó el negocio."
                                    },
                                    {
                                        nombre: "Laura Soto",
                                        rol: "Agencia de Eventos",
                                        testimonio: "Mi equipo ahora cotiza sin pedirme permiso. Todos usan los mismos precios y márgenes. Escalé sin caos."
                                    }
                                ].map((testimonio, idx) => (
                                    <div key={idx} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-semibold text-sm">
                                                {testimonio.nombre.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-white font-semibold text-sm">{testimonio.nombre}</div>
                                                <div className="text-zinc-400 text-xs mb-2">{testimonio.rol}</div>
                                                <p className="text-zinc-300 text-sm italic">&quot;{testimonio.testimonio}&quot;</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>

                        <AccordionItem id="recursos" title="Recursos de aprendizaje" icon={GraduationCap}>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: "🎥", titulo: "Video Tutorial", desc: "3:24 min", label: "Ver ahora" },
                                    { icon: "📄", titulo: "Plantilla PDF", desc: "PDF gratis", label: "Descargar" },
                                    { icon: "🧮", titulo: "Calculadora", desc: "Interactiva", label: "Calcular" },
                                    { icon: "💡", titulo: "Artículo", desc: "8 min lectura", label: "Leer" },
                                    { icon: "🎙️", titulo: "Podcast", desc: "15 min", label: "Escuchar" }
                                ].map((recurso, idx) => (
                                    <div key={idx} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 text-center hover:border-purple-700/50 transition-colors cursor-pointer">
                                        <div className="text-2xl mb-2">{recurso.icon}</div>
                                        <div className="text-white text-xs font-medium mb-1">{recurso.titulo}</div>
                                        <div className="text-zinc-400 text-xs mb-2">{recurso.desc}</div>
                                        <div className="text-purple-400 text-xs font-medium">{recurso.label} →</div>
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>

                        <AccordionItem id="checklist" title="Checklist de configuración" icon={CheckCircle2}>
                            <div className="space-y-4">
                                <div className="bg-zinc-800/50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white text-sm font-medium">Tu progreso:</span>
                                        <span className="text-purple-400 text-sm font-semibold">40%</span>
                                    </div>
                                    <div className="w-full bg-zinc-700 rounded-full h-2">
                                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: "40%" }}></div>
                                    </div>
                                </div>
                                <div>
                                    <h5 className="text-white font-semibold text-sm mb-3">Nivel 1: Básico</h5>
                                    <div className="space-y-2 ml-2">
                                        {[
                                            { label: "Creé al menos 1 sección", checked: true },
                                            { label: "Agregué 3 categorías", checked: true },
                                            { label: "Tengo 10+ items configurados", checked: false },
                                            { label: "Configuré costos reales (no $0)", checked: false },
                                            { label: "Definí márgenes globales", checked: false }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                {item.checked ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-zinc-600" />
                                                )}
                                                <span className={item.checked ? "text-zinc-300" : "text-zinc-500"}>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-3">
                                    <p className="text-purple-200 text-xs">
                                        💡 <strong>Siguiente paso recomendado:</strong> Agregar 5 items más para completar nivel básico
                                    </p>
                                </div>
                            </div>
                        </AccordionItem>
                    </TabsContent>

                    {/* PESTAÑA 4: Ayuda */}
                    <TabsContent value="ayuda" className="space-y-4 max-h-[600px] overflow-y-auto">
                        <AccordionItem id="antes-despues" title="Antes vs Después" icon={TrendingUp}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-700">
                                            <th className="text-left py-2 px-3 text-zinc-400 font-medium">Métrica</th>
                                            <th className="text-left py-2 px-3 text-red-300 font-medium">Antes (manual)</th>
                                            <th className="text-left py-2 px-3 text-emerald-300 font-medium">Después (catálogo)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-zinc-300">
                                        {[
                                            { metrica: "⏱️ Tiempo por cotización", antes: "1-2 horas", despues: "5 minutos" },
                                            { metrica: "💸 Utilidad promedio", antes: "12-18%", despues: "28-35%" },
                                            { metrica: "😰 Confianza en precios", antes: "Baja", despues: "Alta" },
                                            { metrica: "📉 Inconsistencia", antes: "30% variación", despues: "<5% variación" },
                                            { metrica: "🤷 Rentabilidad real", antes: "No sabes hasta cobrar", despues: "Sabes ANTES de cotizar" }
                                        ].map((row, idx) => (
                                            <tr key={idx} className="border-b border-zinc-800/50">
                                                <td className="py-2 px-3">{row.metrica}</td>
                                                <td className="py-2 px-3 text-red-400">{row.antes}</td>
                                                <td className="py-2 px-3 text-emerald-400">{row.despues}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </AccordionItem>

                        <AccordionItem id="faq" title="Preguntas frecuentes" icon={HelpCircle}>
                            <div className="space-y-3">
                                {[
                                    {
                                        pregunta: "¿Tengo que llenar TODO el catálogo de golpe?",
                                        respuesta: "No. Empieza con tus 10 servicios más vendidos. Expande conforme necesites. Es mejor tener 10 items bien configurados que 50 a medias."
                                    },
                                    {
                                        pregunta: "¿Qué pasa si mis costos cambian?",
                                        respuesta: "Actualiza el item, el sistema recalcula TODO automáticamente (cotizaciones futuras usan nuevo precio)."
                                    },
                                    {
                                        pregunta: "¿Puedo tener items privados que no uso en paquetes?",
                                        respuesta: "Sí. Marca como 'inactivo' para no verlo en paquetes pero mantener el historial."
                                    },
                                    {
                                        pregunta: "¿Debo configurar el catálogo antes de crear paquetes?",
                                        respuesta: "Sí. El catálogo ES la base. Paquetes sin catálogo = casa sin cimientos."
                                    },
                                    {
                                        pregunta: "¿Puedo importar mi lista de precios actual?",
                                        respuesta: "Próximamente. Por ahora, copia-pega item por item (vale la pena el esfuerzo inicial)."
                                    }
                                ].map((faq, idx) => (
                                    <div key={idx} className="border border-zinc-700/50 rounded-lg p-3 bg-zinc-800/30">
                                        <p className="text-white font-medium text-sm mb-2">{faq.pregunta}</p>
                                        <p className="text-zinc-300 text-xs leading-relaxed">{faq.respuesta}</p>
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>
                    </TabsContent>
                </Tabs>
            </ZenCardContent>
        </ZenCard>
    );
}

