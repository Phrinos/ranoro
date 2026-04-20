'use client';

import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebaseClient';
import { collection, doc, getDoc, setDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Phone, MessageCircle, Cpu, Server, MessageSquare, FileText, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_CONFIG, DEFAULT_TEMPLATES, generateApiKey } from './lib/constants';
import type { WhatsAppAgentConfig, WhatsAppTemplate } from './lib/types';

// ── Tab components ─────────────────────────────────────────────────
import { TabConexion } from './components/tab-conexion';
import { TabMensajes } from './components/tab-mensajes';
import { TabPrompt } from './components/tab-prompt';

// ── Component ──────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [config, setConfig] = useState<WhatsAppAgentConfig>(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState<WhatsAppTemplate>(DEFAULT_TEMPLATES);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('ia');

  // ── Data Loading ────────────────────────────────────────────────

  useEffect(() => {
    if (!db) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [configSnap, templateSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'whatsapp-agent')),
          getDoc(doc(db, 'settings', 'whatsapp-templates')),
        ]);
        if (!cancelled) {
          if (configSnap.exists()) {
            setConfig({ ...DEFAULT_CONFIG, ...configSnap.data() as WhatsAppAgentConfig });
          }
          if (templateSnap.exists()) {
            setTemplates({ ...DEFAULT_TEMPLATES, ...templateSnap.data() as WhatsAppTemplate });
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading WhatsApp config:', err);
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // Live conversations listener
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, 'whatsapp-conversations'),
      orderBy('lastMessageAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Error listening to conversations:', err);
    });
    return unsub;
  }, []);

  // ── Action Handlers ─────────────────────────────────────────────

  const handleSaveConfig = useCallback(async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'whatsapp-agent'), {
        ...config,
        updatedAt: new Date(),
      });
      toast({ title: 'Configuración Guardada', description: 'Los parámetros del agente han sido actualizados.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [config, toast]);

  const handleSaveTemplates = useCallback(async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'whatsapp-templates'), {
        ...templates,
        updatedAt: new Date(),
      });
      toast({ title: 'Plantillas Guardadas', description: 'Los mensajes han sido actualizados.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [templates, toast]);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook';

  const handleCopyWebhook = useCallback(() => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast({ title: 'Copiado', description: 'URL del webhook copiada al portapapeles.' });
  }, [webhookUrl, toast]);

  const handleCopyApiKey = useCallback(() => {
    navigator.clipboard.writeText(config.webhookSecret);
    setCopiedApiKey(true);
    setTimeout(() => setCopiedApiKey(false), 2000);
    toast({ title: 'Copiado', description: 'API Key copiada al portapapeles.' });
  }, [config.webhookSecret, toast]);

  const handleRegenerateKey = useCallback(() => {
    setConfig(prev => ({ ...prev, webhookSecret: generateApiKey() }));
    toast({ title: 'Nueva clave generada', description: 'Recuerda guardar los cambios y actualizar la clave en el servidor Baileys.' });
  }, [toast]);

  const handleTestConnection = useCallback(async () => {
    setConnectionStatus('testing');
    try {
      const host = `${config.baileysHost}:${config.baileysPort}`;
      const res = await fetch(`/api/whatsapp/test-connection?host=${encodeURIComponent(host)}`, {
        headers: { 
          'x-api-key': config.webhookSecret,
          'x-baileys-user': config.baileysAdminUser || 'ranoro',
          'x-baileys-password': config.baileysAdminPassword || ''
        },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setConnectionStatus('connected');
        toast({ title: 'Conexión Exitosa ✅', description: `Servidor Baileys en ${host} responde correctamente.` });
      } else {
        setConnectionStatus('error');
        toast({ title: 'Error de Conexión', description: `Servidor respondió con status ${data.status || res.status}`, variant: 'destructive' });
      }
    } catch {
      setConnectionStatus('error');
      toast({ title: 'Sin Conexión', description: 'No se pudo conectar al servidor Baileys. Verifica IP y puerto.', variant: 'destructive' });
    }
    setTimeout(() => setConnectionStatus('idle'), 8000);
  }, [config.baileysHost, config.baileysPort, config.webhookSecret, config.baileysAdminUser, config.baileysAdminPassword, toast]);

  const handlePurge = useCallback(async () => {
    setIsPurging(true);
    try {
      const res = await fetch(`/api/whatsapp/purge?confirm=yes`, {
        method: 'DELETE',
        headers: { 'x-api-key': config.webhookSecret },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Conversaciones Eliminadas', description: `Se eliminaron ${data.deleted} conversaciones y ${data.messagesDeleted} mensajes.` });
      } else {
        toast({ title: 'Error', description: data.error || 'Error al purgar', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsPurging(false);
    }
  }, [config.webhookSecret, toast]);

  // ── Render ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabDefs = [
    { value: 'ia',         label: 'Inteligencia Artificial', icon: FileText },
    { value: 'mensajes',   label: 'Mensajes',                icon: MessageSquare },
    { value: 'conexion',   label: 'Conexión',                icon: Server },
  ];

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 px-1 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            WhatsApp Bot
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura el agente de mensajería inteligente del taller.
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {config.whatsappPhone && (
              <Badge variant="outline" className="gap-1.5 text-xs font-mono py-0.5 px-2">
                <Phone className="h-3 w-3 text-green-500" />
                {config.whatsappPhone}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1.5 text-xs py-0.5 px-2">
              <Cpu className="h-3 w-3" />
              {config.geminiModel || 'gemini-2.5-flash'}
            </Badge>
            <Badge variant="secondary" className="gap-1.5 text-xs py-0.5 px-2">
              <MessageCircle className="h-3 w-3" />
              {conversations.length} conversaciones
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="agent-enabled" className="text-sm font-medium">
            {config.enabled ? 'Agente Activo' : 'Agente Inactivo'}
          </Label>
          <Switch
            id="agent-enabled"
            checked={config.enabled}
            onCheckedChange={(v) => setConfig(prev => ({ ...prev, enabled: v }))}
            className={cn(config.enabled ? 'data-[state=checked]:bg-green-500' : '')}
          />
        </div>
      </div>

      {/* Sticky Tabs Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-4 pb-2 mb-6 border-b -px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <nav className="flex overflow-x-auto gap-2.5 bg-transparent p-1 border-0 h-auto w-full no-scrollbar justify-start mb-2">
            {tabDefs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex h-15 min-w-[120px] flex-col justify-center items-center gap-1.5 rounded-2xl border transition-all shadow-none px-4 overflow-hidden group',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-primary/5 hover:text-primary hover:border-primary/40'
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "fill-white/10 drop-shadow-xs")} />
                  <span className="text-[10px] sm:text-xs font-bold leading-none tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          
          <Button 
            onClick={async () => {
              if (activeTab === 'mensajes') {
                 await handleSaveTemplates();
                 await handleSaveConfig();
              } else {
                 await handleSaveConfig();
              }
            }}
            disabled={isSaving}
            className="w-full sm:w-auto gap-2 rounded-full px-6 shadow-xs shrink-0 mb-2 sm:mb-0"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'ia' && (
          <TabPrompt config={config} setConfig={setConfig} onSave={handleSaveConfig} isSaving={isSaving} onPurge={handlePurge} isPurging={isPurging} />
        )}
        {activeTab === 'mensajes' && (
          <TabMensajes
            templates={templates} setTemplates={setTemplates}
            config={config} setConfig={setConfig}
            onSaveTemplates={handleSaveTemplates} onSaveConfig={handleSaveConfig}
            isSaving={isSaving}
          />
        )}
        {activeTab === 'conexion' && (
          <TabConexion
            config={config} setConfig={setConfig} onSave={handleSaveConfig} isSaving={isSaving}
            conversations={conversations} webhookUrl={webhookUrl}
            copiedWebhook={copiedWebhook} copiedApiKey={copiedApiKey}
            onCopyWebhook={handleCopyWebhook} onCopyApiKey={handleCopyApiKey}
            onRegenerateKey={handleRegenerateKey} connectionStatus={connectionStatus}
            onTestConnection={handleTestConnection}
          />
        )}
      </div>
    </div>
  );
}
