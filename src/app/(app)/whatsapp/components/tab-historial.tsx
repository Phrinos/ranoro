'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
  deleteDoc, doc, writeBatch, updateDoc, getDocs, where,
} from 'firebase/firestore';
import { db as firestore } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Search, X, Link2, Trash2, AlertTriangle,
  Bot, Loader2, UserCheck, RefreshCw, ChevronRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────

interface LinkedPatient { id: string; name: string; }

interface Conversation {
  id: string;
  pushName?: string;
  tutorPhone?: string;
  lastMessageAt?: any;
  messageCount?: number;
  humanTakeover?: boolean;
  needsAttention?: boolean;
  linkedPatients?: LinkedPatient[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: any;
  source?: string;
}

function relativeTime(ts: any): string {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days}d`;
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

// ── Chat Panel ────────────────────────────────────────────────────────

function ChatPanel({
  conversation, onClose, onLinkPatient,
}: {
  conversation: Conversation;
  onClose: () => void;
  onLinkPatient: (conv: Conversation) => void;
}) {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!firestore || !conversation.id) return;
    setIsLoading(true);
    const q = query(
      collection(firestore, `whatsapp-conversations/${conversation.id}/messages`),
      orderBy('timestamp', 'asc'),
      limit(100),
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      setIsLoading(false);
    });
    return () => unsub();
  }, [firestore, conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-white flex-shrink-0">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{conversation.pushName || 'Desconocido'}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{conversation.id}</p>
          {conversation.linkedPatients && conversation.linkedPatients.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {conversation.linkedPatients.map(p => (
                <Badge key={p.id} variant="secondary" className="text-[10px] py-0">👶 {p.name}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0 ml-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7"
            onClick={() => onLinkPatient(conversation)}>
            <Link2 className="h-3 w-3" /> Vincular
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#e5ddd5]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground mt-8">Sin mensajes.</div>
        ) : (
          messages.map(msg => {
            const isBot = msg.role === 'assistant';
            const ts = msg.timestamp?.toDate ? msg.timestamp.toDate()
              : msg.timestamp ? new Date(msg.timestamp) : null;
            return (
              <div key={msg.id} className={cn('flex', isBot ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-xl px-3 py-1.5 shadow-sm text-xs',
                  isBot ? 'bg-[#dcf8c6] text-gray-800' : 'bg-white text-gray-800',
                )}>
                  {isBot && <p className="text-[9px] text-green-600 font-semibold flex items-center gap-0.5 mb-0.5"><Bot className="h-2.5 w-2.5" /> Sof-IA</p>}
                  {!isBot && msg.source === 'manual' && <p className="text-[9px] text-blue-500 font-semibold mb-0.5">👤 Staff</p>}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {ts && <p className={cn('text-[9px] mt-0.5 opacity-60', isBot ? 'text-right' : '')}>
                    {ts.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer placeholder */}
      <div className="border-t px-3 py-2 bg-white flex-shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">
          {conversation.tutorPhone ? `Tel: ${conversation.tutorPhone}` : 'Sin teléfono registrado'}
          {conversation.humanTakeover && <span className="ml-2 text-red-500 font-medium">🔴 Escalada</span>}
        </p>
      </div>
    </div>
  );
}

// ── Patient Linker Modal ───────────────────────────────────────────────

function PatientLinker({
  conversation, onClose, onLinked,
}: {
  conversation: Conversation;
  onClose: () => void;
  onLinked: () => void;
}) {

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [linked, setLinked] = useState<LinkedPatient[]>(conversation.linkedPatients || []);

  // Search patients — no orderBy to avoid index requirement
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      // Fetch all patients and filter client-side (small collection, <1000)
      const snap = await getDocs(collection(firestore, 'patients'));
      const qLower = q.toLowerCase();
      const matched = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(p =>
          (p.name ?? '').toLowerCase().includes(qLower) ||
          (p.firstName ?? '').toLowerCase().includes(qLower) ||
          (p.lastName ?? '').toLowerCase().includes(qLower) ||
          (p.guardianName ?? '').toLowerCase().includes(qLower) ||
          (p.tutor?.name ?? '').toLowerCase().includes(qLower)
        )
        .slice(0, 10);
      setResults(matched);
    } catch (e) {
      console.error('Patient search error:', e);
    } finally {
      setIsSearching(false);
    }
  }, [firestore]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const linkPatient = async (patient: any) => {
    if (linked.length >= 6) return;
    const patientName = patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.id;
    setIsLinking(patient.id);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conversation.id}/link-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, patientName }),
      });
      const d = await res.json();
      if (res.ok) {
        setLinked(d.linkedPatients || [...linked, { id: patient.id, name: patientName }]);
        onLinked();
      }
    } catch (e) { console.error(e); }
    finally { setIsLinking(null); }
  };

  const unlinkPatient = async (patientId: string) => {
    const p = linked.find(l => l.id === patientId);
    if (!p) return;
    setIsLinking(patientId);
    try {
      await fetch(`/api/whatsapp/conversations/${conversation.id}/link-patient`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }),
      });
      setLinked(prev => prev.filter(l => l.id !== patientId));
      onLinked();
    } catch (e) { console.error(e); }
    finally { setIsLinking(null); }
  };

  const isAlreadyLinked = (id: string) => linked.some(l => l.id === id);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Vincular Pacientes</h3>
            <p className="text-xs text-muted-foreground">{conversation.pushName || conversation.id}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Linked list */}
        <div className="px-4 pt-3">
          <Label className="text-xs text-muted-foreground">Vinculados ({linked.length}/6)</Label>
          {linked.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1.5">
              {linked.map(p => (
                <div key={p.id} className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 pl-2 pr-1 py-0.5">
                  <span className="text-xs font-medium text-emerald-700">{p.name}</span>
                  <button onClick={() => unlinkPatient(p.id)}
                    className="h-4 w-4 rounded-full hover:bg-emerald-200 flex items-center justify-center"
                    disabled={isLinking === p.id}>
                    {isLinking === p.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5 text-emerald-600" />}
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground mt-1">Sin pacientes vinculados.</p>}
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o tutor…" value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" autoFocus />
          </div>
          {search.length > 0 && search.length < 2 && (
            <p className="text-[10px] text-muted-foreground mt-1">Escribe al menos 2 caracteres.</p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {isSearching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Buscando…</span>
            </div>
          ) : results.length === 0 && search.length >= 2 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Sin resultados para "{search}"</p>
          ) : (
            results.map(p => {
              const already = isAlreadyLinked(p.id);
              const maxReached = linked.length >= 6;
              const name = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.id;
              const tutorName = p.tutor?.name || p.guardianName;
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    {tutorName && <p className="text-xs text-muted-foreground">Tutor: {tutorName}</p>}
                    {p.tutor?.phone && <p className="text-xs text-muted-foreground font-mono">{p.tutor.phone}</p>}
                  </div>
                  {already ? (
                    <Badge variant="secondary" className="text-[10px] text-emerald-600 bg-emerald-50 flex-shrink-0">
                      <UserCheck className="h-3 w-3 mr-1" /> Vinculado
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0 ml-2"
                      disabled={maxReached || isLinking === p.id}
                      onClick={() => linkPatient(p)}>
                      {isLinking === p.id ? <Loader2 className="h-3 w-3 animate-spin" />
                        : maxReached ? 'Máx.' : 'Vincular'}
                    </Button>
                  )}
                </div>
              );
            })
          )}
          {linked.length >= 6 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 text-xs">Máximo de 6 pacientes alcanzado.</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Purge ─────────────────────────────────────────────────────────────

function PurgeSection({ onPurged }: { onPurged: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const handlePurge = async () => {
    setIsPurging(true);
    try {
      await fetch('/api/whatsapp/purge', { method: 'POST' });
      setConfirm(false);
      onPurged();
    } catch (e) { console.error(e); }
    finally { setIsPurging(false); }
  };
  return (
    <div className="rounded-lg border border-red-200 bg-red-50/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700">Purgar conversaciones</p>
          <p className="text-xs text-red-500 mt-0.5">Elimina el historial de chat de todos los pacientes. No se puede deshacer.</p>
        </div>
      </div>
      {!confirm ? (
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1.5"
          onClick={() => setConfirm(true)}>
          <Trash2 className="h-3.5 w-3.5" />Purgar historial
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-xs text-red-600 font-medium">¿Confirmas? Borrará todos los chats.</p>
          <Button variant="destructive" size="sm" className="text-xs h-7" onClick={handlePurge} disabled={isPurging}>
            {isPurging ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sí, purgar'}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setConfirm(false)}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────

export function TabHistorial({ config }: { config: any }) {

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'escalated' | 'unlinked'>('all');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [linkingConv, setLinkingConv] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!firestore) return;
    const q = query(
      collection(firestore, 'whatsapp-conversations'),
      orderBy('lastMessageAt', 'desc'),
      limit(100),
    );
    const unsub = onSnapshot(q, snap => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs);
      setIsLoading(false);
      setSelectedConv(prev => prev ? (convs.find(c => c.id === prev.id) || prev) : null);
    }, err => {
      console.error('Conversations error:', err);
      setIsLoading(false);
    });
    return () => unsub();
  }, [firestore]);

  const filtered = conversations.filter(c => {
    const q = filter.toLowerCase();
    const matchSearch = !q ||
      c.pushName?.toLowerCase().includes(q) ||
      c.id.includes(q) ||
      c.tutorPhone?.includes(q) ||
      c.linkedPatients?.some(p => p.name.toLowerCase().includes(q));
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'escalated' && c.humanTakeover) ||
      (statusFilter === 'unlinked' && (!c.linkedPatients || c.linkedPatients.length === 0));
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: conversations.length, color: 'text-foreground' },
          { label: 'Escaladas', value: conversations.filter(c => c.humanTakeover).length, color: 'text-red-600' },
          { label: 'Sin vincular', value: conversations.filter(c => !c.linkedPatients?.length).length, color: 'text-amber-600' },
          { label: 'Vinculadas', value: conversations.filter(c => c.linkedPatients?.length).length, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, teléfono, UID o paciente…" value={filter}
            onChange={e => setFilter(e.target.value)} className="pl-9" />
          {filter && <button onClick={() => setFilter('')}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" /></button>}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'escalated', 'unlinked'] as const).map(f => (
            <Button key={f} variant={statusFilter === f ? 'default' : 'outline'} size="sm" className="text-xs"
              onClick={() => setStatusFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'escalated' ? '🔴 Escaladas' : '⚠️ Sin vincular'}
            </Button>
          ))}
          <Button variant="ghost" size="icon" className="h-9 w-9" title="Refrescar"
            onClick={() => { /* onSnapshot handles auto-refresh */ }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Always two-column layout: list left, chat right */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
        {/* Left: Conversation list */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-4 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Conversaciones
              <Badge variant="secondary" className="text-xs ml-auto">{filtered.length}</Badge>
            </CardTitle>
          </CardHeader>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)', minHeight: '400px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground px-4">
                {filter ? 'Sin resultados.' : 'No hay conversaciones registradas.'}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(conv => (
                  <div key={conv.id}
                    onClick={() => setSelectedConv(prev => prev?.id === conv.id ? null : conv)}
                    className={cn(
                      'flex items-start gap-2.5 p-3 cursor-pointer hover:bg-gray-50 transition-colors',
                      selectedConv?.id === conv.id && 'bg-blue-50 border-l-2 border-l-blue-500',
                    )}>
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0',
                      conv.humanTakeover ? 'bg-red-400' : conv.needsAttention ? 'bg-amber-400' : 'bg-emerald-500',
                    )}>
                      {(conv.pushName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="font-medium text-sm truncate max-w-[160px]">{conv.pushName || 'Desconocido'}</p>
                        {conv.humanTakeover && <span className="text-[9px] text-red-500 font-bold">🔴</span>}
                        {!conv.linkedPatients?.length && <span className="text-[9px] text-amber-500">⚠️</span>}
                      </div>
                      {conv.tutorPhone && (
                        <p className="text-[10px] text-muted-foreground font-mono">📱 {conv.tutorPhone}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground font-mono truncate" title={conv.id}>🆔 {conv.id}</p>
                      {conv.linkedPatients && conv.linkedPatients.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {conv.linkedPatients.slice(0, 2).map(p => (
                            <Badge key={p.id} variant="secondary" className="text-[9px] py-0 px-1">👶 {p.name}</Badge>
                          ))}
                          {conv.linkedPatients.length > 2 && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1">+{conv.linkedPatients.length - 2}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{relativeTime(conv.lastMessageAt)}</span>
                      <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform',
                        selectedConv?.id === conv.id && 'rotate-90')} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right: Chat panel */}
        <Card className="overflow-hidden" style={{ minHeight: '400px' }}>
          {selectedConv ? (
            <div style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }} className="flex flex-col">
              <ChatPanel conversation={selectedConv} onClose={() => setSelectedConv(null)}
                onLinkPatient={conv => setLinkingConv(conv)} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
              <MessageSquare className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">Selecciona una conversación</p>
              <p className="text-xs mt-1">Haz click en cualquier contacto de la izquierda</p>
            </div>
          )}
        </Card>
      </div>

      {/* Purge zone */}
      <PurgeSection onPurged={() => setConversations([])} />

      {/* Linker modal */}
      {linkingConv && (
        <PatientLinker conversation={linkingConv} onClose={() => setLinkingConv(null)}
          onLinked={() => setLinkingConv(null)} />
      )}
    </div>
  );
}
