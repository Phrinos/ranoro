
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User, BrainCircuit, Sparkles } from 'lucide-react';
import { sendChatMessage } from '@/ai/flows/workshop-chat-flow';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Message = {
    role: 'user' | 'model';
    content: string;
};

export default function AiChatPage() {
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: '¡Hola! Soy tu asistente de Ranoro. Puedo ayudarte a analizar los datos de tu taller. Por ejemplo, pregúntame por los coches más comunes o qué servicios se realizan más.' }
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
            // Pasamos el historial (excluyendo el primer mensaje de bienvenida si se desea, o todo)
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
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BrainCircuit className="h-6 w-6 text-primary" />
                        Asistente Inteligente
                    </h1>
                    <p className="text-sm text-muted-foreground">Analiza tu taller con el poder de Gemini 2.0</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
                    <Sparkles className="h-3 w-3" />
                    Powered by Google Gemini
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col shadow-lg border-primary/10">
                <CardContent className="p-0 flex-1 flex flex-col bg-muted/5">
                    <ScrollArea ref={scrollRef} className="flex-1 p-4 sm:p-6">
                        <div className="space-y-6">
                            {messages.map((m, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "flex gap-3 max-w-[85%] sm:max-w-[75%]",
                                        m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                        m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted border shadow-sm"
                                    )}>
                                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div className={cn(
                                        "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                        m.role === 'user' 
                                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                                            : "bg-card border rounded-tl-none text-foreground"
                                    )}>
                                        <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 mr-auto max-w-[75%] animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center shrink-0">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    </div>
                                    <div className="bg-card border rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm">
                                        <div className="flex gap-1">
                                            <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t bg-background">
                        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto">
                            <Input 
                                placeholder="Escribe tu pregunta aquí... (ej: ¿Cuáles son las afinaciones más comunes?)"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                                className="h-11 bg-muted/30 focus-visible:ring-primary shadow-inner"
                            />
                            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={isLoading || !input.trim()}>
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </Button>
                        </form>
                        <p className="text-[10px] text-center text-muted-foreground mt-2">
                            La I.A. puede cometer errores. Verifica siempre la información crítica en los reportes correspondientes.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
