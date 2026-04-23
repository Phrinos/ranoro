'use client';

import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db as firestore } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, Phone, MessageCircle, Cpu, Server, FileText, BookOpen, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_CONFIG, generateApiKey } from './lib/constants';
import type { WhatsAppAgentConfig } from './lib/types';

// ── Tab components ─────────────────────────────────────────────────
import { TabConexion } from './components/tab-conexion';
import { TabPrompt } from './components/tab-prompt';
import { TabConocimiento } from './components/tab-conocimiento';
import { TabHistorial } from './components/tab-historial';

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
  const [conversationCount, setConversationCount] = useState(0);
  const [activeTab, setActiveTab] = useState('ia');

  // ── Data Loading ────────────────────────────────────────────────

  useEffect(() => {
    if (!firestore) return;
    let cancelled = false;

    const load = async () => {
      try {
        const configSnap = await getDoc(doc(firestore, 'settings', 'whatsapp-agent'));
        if (!cancelled) {
          if (configSnap.exists()) {
            const data = configSnap.data() as WhatsAppAgentConfig;
            setConfig({ ...DEFAULT_CONFIG, ...data });
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
  }, [firestore]);

  // ── Action Handlers ─────────────────────────────────────────────

  const handleSaveConfig = useCallback(async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'settings', 'whatsapp-agent'), {
        ...config,
        updatedAt: new Date(),
      });
      toast({ title: 'Configuración Guardada', description: 'Los parámetros del agente han sido actualizados.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [firestore, config, toast]);

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
        headers: { 'x-api-key': config.webhookSecret },
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
  }, [config.baileysHost, config.baileysPort, config.webhookSecret, toast]);

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
    { value: 'ia',           label: 'Bot IA',              icon: FileText },
    { value: 'conocimiento', label: 'Base de Conocimiento', icon: BookOpen },
    { value: 'historial',    label: 'Historial',           icon: History },
    { value: 'conexion',     label: 'Conexión',            icon: Server },
  ];

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 px-1 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Sof<span className="text-blue-500 font-extrabold">IA</span> WhatsApp
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {config.whatsappPhone && (
              <Badge variant="outline" className="gap-1.5 text-xs font-mono py-0.5 px-2">
                <Phone className="h-3 w-3 text-green-500" />
                {config.whatsappPhone}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1.5 text-xs py-0.5 px-2">
              <Cpu className="h-3 w-3" />
              {config.geminiModel || 'gemini-2.0-flash-lite'}
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
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 pt-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
          <nav className="flex overflow-x-auto w-full sm:w-auto">
            {tabDefs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          
          {(activeTab === 'ia' || activeTab === 'conexion') && (
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="mb-2 sm:mb-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'ia' && (
          <TabPrompt
            config={config}
            setConfig={setConfig}
            onSave={handleSaveConfig}
            isSaving={isSaving}
            onPurge={handlePurge}
            isPurging={isPurging}
          />
        )}
        {activeTab === 'conocimiento' && (
          <TabConocimiento />
        )}
        {activeTab === 'historial' && (
          <TabHistorial config={config} />
        )}
        {activeTab === 'conexion' && (
          <TabConexion
            config={config}
            setConfig={setConfig}
            onSave={handleSaveConfig}
            isSaving={isSaving}
            conversations={[]}
            webhookUrl={webhookUrl}
            copiedWebhook={copiedWebhook}
            copiedApiKey={copiedApiKey}
            onCopyWebhook={handleCopyWebhook}
            onCopyApiKey={handleCopyApiKey}
            onRegenerateKey={handleRegenerateKey}
            connectionStatus={connectionStatus}
            onTestConnection={handleTestConnection}
          />
        )}
      </div>
    </div>
  );
}
