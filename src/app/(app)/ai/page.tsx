"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, Send, Bot, User, BrainCircuit, Sparkles, 
    ShoppingCart, PackageSearch, Calculator, MessageSquare 
} from 'lucide-react';
import { sendChatMessage } from '@/ai/flows/workshop-chat-flow';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';

const AnalisisIaContent = dynamic(() => import('./components/analisis-ia-content').then(m => ({ default: m.AnalisisIaContent })), { ssr: false });
const AsistenteComprasContent = dynamic(() => import('./components/asistente-compras-content'), { ssr: false });
const CotizadorIaContent = dynamic(() => import('./components/cotizador-ia-content'), { ssr: false });

type Message = {
    role: 'user' | 'model';
    content: string;
};

export default function AiHubPage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('chat');
    
    // Chat States
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: '¡Hola! Soy tu asistente de Ranoro. Puedo ayudarte a analizar los datos de tu taller. Por ejemplo, pregúntame por los coches más comunes, qué servicios se realizan más o cómo van las finanzas del mes.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll al final del chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await sendChatMessage(userMessage, messages.map(m => ({
                role: m.role,
                content: m.content
            })));
            
            setMessages(prev => [...prev, { role: 'model', content: response }]);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No pude procesar tu pregunta en este momento. Intenta de nuevo.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-w-6xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <BrainCircuit className="h-8 w-8 text-primary" />
                        </div>
                        Ranoro AI Hub
                    </h1>
                    <p className="text-sm text-muted-foreground ml-1">Potencia tu taller con inteligencia artificial avanzada</p>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-primary border border-primary/20 px-4 py-2 rounded-2xl text-xs font-bold shadow-sm">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Gemini 2.0 Pro Intelligence
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="bg-card border rounded-2xl p-1 mb-4 shadow-sm">
                    <TabsList className="grid w-full grid-cols-4 bg-transparent">
                        <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <MessageSquare className="h-4 w-4 mr-2 hidden sm:inline" />
                            Asistente
                        </TabsTrigger>
                        <TabsTrigger value="cotizador" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Calculator className="h-4 w-4 mr-2 hidden sm:inline" />
                            Cotizador
                        </TabsTrigger>
                        <TabsTrigger value="compras" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <ShoppingCart className="h-4 w-4 mr-2 hidden sm:inline" />
                            Compras
                        </TabsTrigger>
                        <TabsTrigger value="inventario" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <PackageSearch className="h-4 w-4 mr-2 hidden sm:inline" />
                            Análisis
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 min-h-0">
                    <TabsContent value="chat" className="h-full m-0 focus-visible:ring-0">
                        <Card className="h-full overflow-hidden flex flex-col shadow-xl border-primary/10 bg-muted/5 rounded-2xl">
                            <CardContent className="p-0 flex-1 flex flex-col">
                                <ScrollArea ref={scrollRef} className="flex-1 p-4 sm:p-8">
                                    <div className="space-y-6 max-w-4xl mx-auto">
                                        {messages.map((m, i) => (
                                            <div 
                                                key={i} 
                                                className={cn(
                                                    "flex gap-4 max-w-[85%] sm:max-w-[80%]",
                                                    m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                                    m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-white border text-primary"
                                                )}>
                                                    {m.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                                </div>
                                                <div className={cn(
                                                    "rounded-2xl px-5 py-3 text-sm shadow-md",
                                                    m.role === 'user' 
                                                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                        : "bg-white border rounded-tl-none text-foreground"
                                                )}>
                                                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex gap-4 mr-auto max-w-[80%] animate-pulse">
                                                <div className="h-10 w-10 rounded-2xl bg-white border flex items-center justify-center shrink-0">
                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                </div>
                                                <div className="bg-white border rounded-2xl rounded-tl-none px-5 py-3 shadow-md flex items-center">
                                                    <div className="flex gap-1.5">
                                                        <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-6 border-t bg-white rounded-b-2xl">
                                    <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto items-center">
                                        <Input 
                                            placeholder="Pregúntale cualquier cosa a la IA de Ranoro..."
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            disabled={isLoading}
                                            className="h-16 text-lg bg-muted/20 border-none focus-visible:ring-primary shadow-inner rounded-xl px-8"
                                        />
                                        <Button type="submit" size="icon" className="h-16 w-16 shrink-0 rounded-xl shadow-lg transition-transform active:scale-95" disabled={isLoading || !input.trim()}>
                                            {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Send className="h-8 w-8" />}
                                        </Button>
                                    </form>
                                    <p className="text-[10px] text-center text-muted-foreground mt-3 italic">
                                        La IA puede cometer errores. Verifica siempre la información crítica en tus reportes.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="cotizador" className="h-full m-0">
                        <CotizadorIaContent />
                    </TabsContent>

                    <TabsContent value="compras" className="h-full m-0">
                        <AsistenteComprasContent />
                    </TabsContent>

                    <TabsContent value="inventario" className="h-full m-0">
                        <AnalisisIaContent inventoryItems={[]} serviceRecords={[]} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
