'use client';

import * as React from 'react';
import { Bell, Calendar, MessageCircle, X, CheckCheck, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebaseClient';
const useFirestore = () => db;
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
const toDate = (t: any): Date | null => {
  if (!t) return null;
  if (t instanceof Date) return t;
  if (typeof t.toDate === 'function') return t.toDate();
  if (typeof t === 'string' || typeof t === 'number') return new Date(t);
  return null;
};

// ── Types ──────────────────────────────────────────────────────────

interface AppNotification {
  id: string;
  firestoreId: string; // raw document ID for Firestore operations
  patientName: string;
  type: 'cancelled' | 'reschedule-requested' | 'whatsapp-attention';
  date: Date | null;
  updatedAt: Date;
  read: boolean;
  reason?: string;
  humanTakeover?: boolean;
}

// ── Persistence ────────────────────────────────────────────────────

const STORAGE_KEY = 'avoria_notifications_read_ts';

function getReadTimestamp(): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(STORAGE_KEY) || 0);
}

function saveReadTimestamp(ts: number) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, String(ts));
}

// ── Alert Sound ────────────────────────────────────────────────────

function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const playOnce = (delay: number) => {
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 880;
      gain1.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(ctx.currentTime + delay);
      osc1.stop(ctx.currentTime + delay + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 660;
      gain2.gain.setValueAtTime(0.12, ctx.currentTime + delay + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(ctx.currentTime + delay + 0.15);
      osc2.stop(ctx.currentTime + delay + 0.55);

      setTimeout(() => ctx.close(), (delay + 1) * 1000);
    };

    playOnce(0);
    playOnce(1.5);
    playOnce(3.0);
  } catch (e) {
    console.warn('[NotificationBell] Audio context blocked:', e);
  }
}

// ── Component ──────────────────────────────────────────────────────

export function NotificationBell() {
  const db = useFirestore();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [readTs, setReadTs] = React.useState<number>(0);
  const prevUnreadRef = React.useRef<number>(0);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setReadTs(getReadTimestamp());
  }, []);

  // ── Appointment listeners ───────────────────────────────────────
  React.useEffect(() => {
    if (!db) return;

    const SESSION_START = Date.now() - 24 * 60 * 60 * 1000;
    const startTs = Timestamp.fromMillis(SESSION_START);

    const buildListener = (collectionName: string) => {
      const q = query(
        collection(db as Firestore, collectionName),
        where('status', 'in', ['cancelled', 'reschedule-requested']),
        where('updatedAt', '>=', startTs)
      );

      return onSnapshot(q, (snap) => {
        const parsed: AppNotification[] = snap.docs.map(d => {
          const data = d.data();
          const updatedAt = toDate(data.updatedAt) ?? new Date();
          return {
            id: `${collectionName}-${d.id}`,
            firestoreId: d.id,
            patientName: data.patientName || data.patientFullName || 'Paciente',
            type: data.status as 'cancelled' | 'reschedule-requested',
            date: toDate(data.start ?? data.date),
            updatedAt,
            read: updatedAt.getTime() <= readTs,
          };
        });

        setNotifications(prev => {
          const fromOtherSources = prev.filter(n => !n.id.startsWith(collectionName));
          return [...fromOtherSources, ...parsed].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
          );
        });
      });
    };

    const unsub1 = buildListener('appointments');
    const unsub2 = buildListener('spaAppointments');
    return () => { unsub1(); unsub2(); };
  }, [readTs]);

  // ── WhatsApp needsAttention listener ────────────────────────────
  React.useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db as Firestore, 'whatsapp-conversations'),
      where('needsAttention', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const parsed: AppNotification[] = snap.docs.map(d => {
        const data = d.data();
        const updatedAt = toDate(data.humanTakeoverAt ?? data.lastMessageAt) ?? new Date();
        return {
          id: `wa-${d.id}`,
          firestoreId: d.id,
          patientName: data.pushName || `Chat ${d.id.slice(-6)}`,
          type: 'whatsapp-attention' as const,
          date: null,
          updatedAt,
          read: updatedAt.getTime() <= readTs,
          reason: data.escalationReason || (data.humanTakeover ? 'Bot pausado — esperando atención humana' : 'Paciente requiere atención'),
          humanTakeover: data.humanTakeover === true,
        };
      });

      setNotifications(prev => {
        const fromOtherSources = prev.filter(n => !n.id.startsWith('wa-'));
        return [...fromOtherSources, ...parsed].sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        );
      });
    });

    return () => unsub();
  }, [readTs]);

  // ── Sound alert ─────────────────────────────────────────────────
  const unreadCount = React.useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  React.useEffect(() => {
    if (unreadCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      playAlertSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // ── Actions ─────────────────────────────────────────────────────

  const handleMarkAllRead = () => {
    const now = Date.now();
    saveReadTimestamp(now);
    setReadTs(now);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setOpen(false);
  };

  const handleToggleBot = async (n: AppNotification) => {
    if (!db) return;
    setTogglingId(n.id);
    try {
      const action = n.humanTakeover ? 'resume' : 'pause';
      const res = await fetch('/api/whatsapp/toggle-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: n.firestoreId, action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[NotificationBell] Toggle bot error:', err);
      }
    } catch (e) {
      console.error('[NotificationBell] Toggle bot error:', e);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────

  const typeLabel = (type: AppNotification['type']) => {
    switch (type) {
      case 'cancelled': return 'canceló su cita';
      case 'reschedule-requested': return 'reagendó su cita';
      case 'whatsapp-attention': return 'requiere atención en WhatsApp';
    }
  };

  const typeBg = (type: AppNotification['type']) => {
    switch (type) {
      case 'cancelled': return 'bg-red-50 border-red-100 text-red-700';
      case 'reschedule-requested': return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'whatsapp-attention': return 'bg-green-50 border-green-100 text-green-700';
    }
  };

  const TypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'whatsapp-attention': return MessageCircle;
      default: return Calendar;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative text-zinc-500 hover:text-white rounded-full hover:bg-white/10 h-9 w-9",
            unreadCount > 0 && "text-white"
          )}
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md border-l p-0 flex flex-col bg-zinc-50">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg font-semibold flex items-center gap-2 m-0 text-zinc-900">
                <Bell className="h-5 w-5 text-zinc-500" />
                Notificaciones
              </SheetTitle>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 h-8 px-2.5 rounded-lg font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar todas leídas
              </Button>
            )}
          </div>
          <SheetDescription className="hidden">Últimas actualizaciones del sistema</SheetDescription>
        </SheetHeader>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Bell className="h-8 w-8 text-zinc-200" />
              <p className="text-xs text-muted-foreground font-medium">Sin notificaciones recientes</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {notifications.map(n => {
                const Icon = TypeIcon(n.type);
                const isToggling = togglingId === n.id;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'px-4 py-3 flex items-start gap-3 transition-colors',
                      !n.read ? 'bg-blue-50/40' : 'bg-white'
                    )}
                  >
                    <div className={cn('mt-0.5 p-1.5 rounded-lg border text-xs font-bold shrink-0', typeBg(n.type))}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 truncate">
                        {n.patientName}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {typeLabel(n.type)}
                        {n.date && (
                          <> — <span className="font-medium">{format(n.date, "d MMM 'a las' HH:mm", { locale: es })}</span></>
                        )}
                      </p>
                      {n.reason && n.type === 'whatsapp-attention' && (
                        <p className="text-[10px] text-green-600 mt-0.5 italic truncate">
                          {n.reason}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {format(n.updatedAt, "d 'de' MMM, HH:mm", { locale: es })}
                      </p>

                      {/* WhatsApp bot toggle button */}
                      {n.type === 'whatsapp-attention' && (
                        <Button
                          size="sm"
                          variant={n.humanTakeover ? 'default' : 'outline'}
                          disabled={isToggling}
                          onClick={() => handleToggleBot(n)}
                          className={cn(
                            'mt-2 h-7 text-[10px] font-semibold rounded-lg gap-1.5 px-3',
                            n.humanTakeover
                              ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                              : 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                          )}
                        >
                          {isToggling ? (
                            <span className="animate-pulse">Procesando...</span>
                          ) : n.humanTakeover ? (
                            <>
                              <Play className="h-3 w-3" />
                              Reactivar Bot
                            </>
                          ) : (
                            <>
                              <Pause className="h-3 w-3" />
                              Pausar Bot
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {!n.read && (
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
