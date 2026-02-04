"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Send,
  Bot,
  User,
  BrainCircuit,
  Sparkles,
  MessageSquare,
  ArrowDown,
  Trash2,
  Copy,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { sendChatMessage } from "@/ai/flows/workshop-chat-flow";

type Message = {
  role: "user" | "model";
  content: string;
  ts?: number;
};

const STORAGE_KEY = "ranoro_aihub_chat_v2";
const MAX_STORED_MESSAGES = 200; // local persistence
const MAX_HISTORY_TO_AI = 24; // context window to send

const INITIAL_MESSAGES: Message[] = [
  {
    role: "model",
    content:
      '¡Hola! Soy el asistente inteligente de Ranoro. Puedo analizar los datos de tu taller en tiempo real.\n\n• "¿Cuántas afinaciones hicimos el mes pasado?"\n• "¿Cómo va la rentabilidad de este mes?"\n• "¿Qué refacciones están por agotarse?"',
    ts: Date.now(),
  },
];

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getViewport(el: HTMLDivElement | null): HTMLDivElement | null {
  if (!el) return null;
  return el.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
}

function isNearBottom(viewport: HTMLDivElement, thresholdPx = 80) {
  const remaining = viewport.scrollHeight - (viewport.scrollTop + viewport.clientHeight);
  return remaining <= thresholdPx;
}

export default function AiHubPage() {
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // UX / Scroll
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);

  // Context controls
  const [sendContext, setSendContext] = useState(true);

  // Error / Retry
  const [lastFailedUserMessage, setLastFailedUserMessage] = useState<string | null>(null);

  // Load persisted chat
  useEffect(() => {
    const saved = safeParseJSON<{ messages: Message[]; sendContext?: boolean }>(
      localStorage.getItem(STORAGE_KEY)
    );
    if (saved?.messages?.length) {
      setMessages(saved.messages.slice(-MAX_STORED_MESSAGES));
      if (typeof saved.sendContext === "boolean") setSendContext(saved.sendContext);
    }
  }, []);

  // Persist chat
  useEffect(() => {
    const payload = {
      messages: messages.slice(-MAX_STORED_MESSAGES),
      sendContext,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }, [messages, sendContext]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const viewport = getViewport(scrollRootRef.current);
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  // Track scroll position (enable "jump to latest" + unread counter)
  useEffect(() => {
    const viewport = getViewport(scrollRootRef.current);
    if (!viewport) return;

    const onScroll = () => {
      const near = isNearBottom(viewport);
      setAtBottom(near);
      if (near) setUnread(0);
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    // init
    onScroll();

    return () => viewport.removeEventListener("scroll", onScroll);
  }, []);

  // Smart auto-scroll:
  // - If user is at bottom -> keep at bottom
  // - If new message is from user -> scroll to show it
  // - If not at bottom and AI replies -> increase unread, do NOT force scroll
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;

    if (atBottom) {
      scrollToBottom("auto");
      return;
    }

    if (last.role === "user") {
      scrollToBottom("smooth");
      return;
    }

    if (last.role === "model") {
      setUnread((u) => u + 1);
    }
  }, [messages, atBottom, scrollToBottom]);

  const messagesForAi = useMemo(() => {
    // Send a bounded window as context (avoids huge prompts)
    if (!sendContext) return [];
    return messages.slice(-MAX_HISTORY_TO_AI).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }, [messages, sendContext]);

  const quickPrompts = useMemo(
    () => [
      "Dame un resumen del mes actual: ingresos, gastos y utilidad.",
      "¿Qué servicios entregados hubo la semana pasada y cuánto sumaron?",
      "Muéstrame los productos con stock bajo.",
      "¿Cuántas afinaciones hubo el mes pasado?",
    ],
    []
  );

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, { ...msg, ts: msg.ts ?? Date.now() }]);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage = text.trim();
      if (!userMessage || isLoading) return;

      setLastFailedUserMessage(null);
      setInput("");
      appendMessage({ role: "user", content: userMessage });

      setIsLoading(true);

      try {
        // IMPORTANT: pass fresh history INCLUDING the new user message
        const history = sendContext
          ? [...messagesForAi, { role: "user" as const, content: userMessage }].slice(-MAX_HISTORY_TO_AI)
          : [{ role: "user" as const, content: userMessage }];

        const response = await sendChatMessage(userMessage, history);
        appendMessage({ role: "model", content: response });
      } catch (error: any) {
        console.error(error);
        setLastFailedUserMessage(userMessage);
        toast({
          title: "Error",
          description: error?.message?.slice(0, 160) || "No pude conectarme con la IA.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [appendMessage, isLoading, messagesForAi, sendContext, toast]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSend(input);
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    setUnread(0);
    setLastFailedUserMessage(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    toast({ title: "Listo", description: "Conversación limpiada." });
    requestAnimationFrame(() => scrollToBottom("auto"));
  };

  const copyConversation = async () => {
    const md = messages
      .map((m) => `**${m.role === "user" ? "Tú" : "IA"}:** ${m.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(md);
      toast({ title: "Copiado", description: "Conversación copiada al portapapeles." });
    } catch {
      toast({ title: "Error", description: "No pude copiar al portapapeles.", variant: "destructive" });
    }
  };

  const retryLast = () => {
    if (!lastFailedUserMessage) return;
    void handleSend(lastFailedUserMessage);
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = enviar, Shift+Enter = salto de línea
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(input);
    }
  };

  const modelLabel = "Gemini (configurable)";

  return (
    <div className="mx-auto w-full max-w-6xl px-2">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 px-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <div className="rounded-xl bg-primary/10 p-2">
                <BrainCircuit className="h-8 w-8 text-primary" />
              </div>
              Asistente Inteligente
            </h1>
            <p className="ml-1 text-sm text-muted-foreground">
              Chat con contexto persistente, herramientas y análisis del taller
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 py-2 text-xs font-bold text-primary shadow-sm">
              <Sparkles className="h-4 w-4 animate-pulse text-purple-600" />
              {modelLabel}
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={copyConversation}
              title="Copiar conversación"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar
            </Button>

            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={clearChat}
              title="Limpiar conversación"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>

        {/* Card (IMPORTANT: min-h-0 for proper scroll in flex layouts) */}
        <Card className="flex h-[calc(100dvh-180px)] min-h-0 flex-col overflow-hidden rounded-3xl border-primary/10 bg-muted/5 shadow-2xl">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {/* Quick prompts */}
            <div className="border-b bg-white/70 px-4 py-3 backdrop-blur-sm sm:px-8">
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant="secondary"
                    className="h-8 rounded-2xl text-xs"
                    disabled={isLoading}
                    onClick={() => void handleSend(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            {/* Scroll region */}
            <div className="relative min-h-0 flex-1">
              <ScrollArea ref={scrollRootRef} className="h-full bg-white/40 backdrop-blur-sm">
                <div className="mx-auto max-w-5xl space-y-6 p-4 pb-28 sm:p-8">
                  {messages.map((m, i) => (
                    <div
                      key={`${m.ts ?? i}-${i}`}
                      className={cn(
                        "flex max-w-[92%] gap-4 sm:max-w-[85%]",
                        m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border bg-white text-primary"
                        )}
                      >
                        {m.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>

                      <div
                        className={cn(
                          "rounded-3xl px-6 py-4 text-sm shadow-md transition-all duration-300",
                          m.role === "user"
                            ? "rounded-tr-none bg-primary text-primary-foreground"
                            : "rounded-tl-none border border-primary/5 bg-white text-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="mr-auto flex max-w-[80%] gap-4 animate-pulse">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-white">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                      <div className="flex items-center rounded-3xl rounded-tl-none border bg-white px-6 py-4 shadow-md">
                        <div className="flex gap-1.5">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Jump to latest */}
              {!atBottom && (
                <div className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2">
                  <Button
                    type="button"
                    className="rounded-2xl shadow-lg"
                    onClick={() => scrollToBottom("smooth")}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Ir al final{unread > 0 ? ` (${unread})` : ""}
                  </Button>
                </div>
              )}
            </div>

            {/* Composer (sticky bottom) */}
            <div className="border-t bg-white px-4 py-4 sm:px-8">
              {/* Controls row */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>La IA usa herramientas para consultar datos reales del taller.</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("rounded-2xl", sendContext ? "border-primary/30" : "")}
                    onClick={() => setSendContext((v) => !v)}
                    title="Enviar historial como contexto"
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Contexto: {sendContext ? "ON" : "OFF"}
                  </Button>

                  {lastFailedUserMessage && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={retryLast}
                      title="Reintentar último mensaje"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reintentar
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={onSubmit} className="mx-auto flex max-w-5xl items-end gap-3">
                <textarea
                  placeholder='Escribe tu pregunta… (Enter = enviar, Shift+Enter = salto de línea)'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  disabled={isLoading}
                  rows={2}
                  className={cn(
                    "min-h-[64px] w-full flex-1 resize-none rounded-2xl bg-muted/20 px-6 py-4 text-base shadow-inner outline-none",
                    "border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                  )}
                />

                <Button
                  type="submit"
                  size="icon"
                  className="h-16 w-16 shrink-0 rounded-2xl shadow-lg transition-transform active:scale-95"
                  disabled={isLoading || !input.trim()}
                  title="Enviar"
                >
                  {isLoading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Send className="h-7 w-7" />}
                </Button>
              </form>

              <div className="mt-2 text-right text-[10px] text-muted-foreground">
                {input.trim().length} caracteres
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
