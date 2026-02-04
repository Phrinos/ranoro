"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Loader2, Send, Bot, User, BrainCircuit, Sparkles, 
    MessageSquare 
} from 'lucide-react';
import { sendChatMessage } from '@/ai/flows/workshop-chat-flow';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Message = {
    role: 'user' | 'model';
    content: string;
};

export default function AiHubPage() {
    const { toast } = useToast();
    
    // Chat States
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: '¡Hola! Soy el asistente inteligente de Ranoro. Puedo analizar los datos de tu taller en tiempo real. Pregúntame cosas como:\n\n• "¿Cuántas afinaciones hicimos el mes pasado?"\n• "¿Cómo va la rentabilidad de este mes?"\n• "¿Qué refacciones están por agotarse?"' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll al final del chat
    useEffect(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({
                    top: viewport.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await sendChatMessage(userMessage, messages);
            setMessages(prev => [...prev, { role: 'model', content: response }]);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No pude conectarme con el cerebro de la IA. Revisa tu conexión.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <BrainCircuit className="h-8 w-8 text-primary" />
                        </div>
                        Asistente Inteligente
                    </h1>
                    <p className="text-sm text-muted-foreground ml-1">Tu taller, analizado por inteligencia artificial avanzada</p>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-primary border border-primary/20 px-4 py-2 rounded-2xl text-xs font-bold shadow-sm">
                    <Sparkles className="h-4 w-4 animate-pulse text-purple-600" />
                    Gemini 1.5 Pro Business
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col shadow-2xl border-primary/10 bg-muted/5 rounded-3xl">
                <CardContent className="p-0 flex-1 flex flex-col">
                    <ScrollArea ref={scrollRef} className="flex-1 p-4 sm:p-8">
                        <div className="space-y-6 max-w-4xl mx-auto pb-10">
                            {messages.map((m, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "flex gap-4 max-w-[90%] sm:max-w-[85%]",
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
                                        "rounded-3xl px-6 py-4 text-sm shadow-md",
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
                                    <div className="bg-white border rounded-3xl rounded-tl-none px-6 py-4 shadow-md flex items-center">
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

                    <div className="p-6 border-t bg-white rounded-b-3xl">
                        <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto items-center">
                            <Input 
                                placeholder="Pregunta sobre finanzas, servicios o inventario..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                                className="h-16 text-lg bg-muted/20 border-none focus-visible:ring-primary shadow-inner rounded-2xl px-8"
                            />
                            <Button type="submit" size="icon" className="h-16 w-16 shrink-0 rounded-2xl shadow-lg transition-transform active:scale-95 bg-primary hover:bg-primary/90" disabled={isLoading || !input.trim()}>
                                {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Send className="h-8 w-8" />}
                            </Button>
                        </form>
                        <p className="text-[10px] text-center text-muted-foreground mt-3 italic flex items-center justify-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            La IA analiza los datos de tu taller para darte respuestas precisas.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
