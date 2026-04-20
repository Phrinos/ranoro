'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Copy, Check, RefreshCw, Globe, Server,
  Shield, User2, Zap, Wifi, WifiOff, Phone, MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { WhatsAppAgentConfig } from '../lib/types';

interface TabConexionProps {
  config: WhatsAppAgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<WhatsAppAgentConfig>>;
  onSave: () => void;
  isSaving: boolean;
  conversations: any[];
  webhookUrl: string;
  copiedWebhook: boolean;
  copiedApiKey: boolean;
  onCopyWebhook: () => void;
  onCopyApiKey: () => void;
  onRegenerateKey: () => void;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'error';
  onTestConnection: () => void;
}

export function TabConexion({
  config, setConfig, onSave, isSaving, conversations,
  webhookUrl, copiedWebhook, copiedApiKey,
  onCopyWebhook, onCopyApiKey, onRegenerateKey,
  connectionStatus, onTestConnection,
}: TabConexionProps) {
  return (
    <div className="space-y-6">

      {/* Webhook & Security */}
      <Card className="bg-white rounded-2xl shadow-xs border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-blue-500" /> Webhook & Seguridad</CardTitle>
          <CardDescription>Configura la URL del webhook y la clave de acceso compartida con el servidor Baileys.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL del Webhook (copiar al panel Baileys)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="bg-muted font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={onCopyWebhook}>
                {copiedWebhook ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Clave de Acceso (API Key)</Label>
            <div className="flex gap-2">
              <Input value={config.webhookSecret} readOnly className="bg-muted font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={onCopyApiKey} title="Copiar">
                {copiedApiKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={onRegenerateKey} title="Regenerar">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">El servidor Baileys debe enviar esta clave en el header <code className="text-xs bg-muted px-1 py-0.5 rounded">x-api-key</code>.</p>
          </div>
        </CardContent>
      </Card>

      {/* Baileys Server Config */}
      <Card className="bg-white rounded-2xl shadow-xs border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-purple-500" /> Servidor Baileys</CardTitle>
          <CardDescription>Datos de conexión al servidor de WhatsApp (VPS).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Host / IP</Label>
              <Input value={config.baileysHost} onChange={e => setConfig(p => ({ ...p, baileysHost: e.target.value }))} placeholder="62.171.187.165" />
            </div>
            <div className="space-y-2">
              <Label>Puerto</Label>
              <Input value={config.baileysPort} onChange={e => setConfig(p => ({ ...p, baileysPort: e.target.value }))} placeholder="3000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Identificador de Sesión (ID)</Label>
              <Input value={config.baileysSessionId} onChange={e => setConfig(p => ({ ...p, baileysSessionId: e.target.value }))} placeholder="ranoro" />
              <p className="text-[10px] text-muted-foreground">ID único para el código QR de WhatsApp.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            Panel admin: <a href={`http://${config.baileysHost}:${config.baileysPort}/admin`} target="_blank" rel="noopener noreferrer" className="underline font-medium text-foreground hover:text-blue-600">{`http://${config.baileysHost}:${config.baileysPort}/admin`}</a>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onTestConnection} disabled={connectionStatus === 'testing'} className="gap-2">
              {connectionStatus === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : connectionStatus === 'connected' ? <Wifi className="h-4 w-4 text-green-500" /> : connectionStatus === 'error' ? <WifiOff className="h-4 w-4 text-red-500" /> : <Zap className="h-4 w-4" />}
              {connectionStatus === 'testing' ? 'Probando...' : connectionStatus === 'connected' ? 'Conectado' : connectionStatus === 'error' ? 'Sin Conexión' : 'Test de Conexión'}
            </Button>
            {connectionStatus === 'connected' && (
              <span className="text-xs text-green-600 font-medium">✅ Servidor Baileys accesible</span>
            )}
            {connectionStatus === 'error' && (
              <span className="text-xs text-red-600 font-medium">❌ No se pudo conectar</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Conversations */}
      <Card className="bg-white rounded-2xl shadow-xs border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-green-500" /> Conversaciones Recientes</CardTitle>
          <CardDescription>Últimas conversaciones del agente en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay conversaciones aún.</p>
              <p className="text-xs mt-1">Las conversaciones aparecerán aquí cuando el agente reciba mensajes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div key={conv.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <User2 className="h-4 w-4 text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{conv.pushName || conv.id}</p>
                      <p className="text-xs text-muted-foreground font-mono">{conv.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {conv.totalMessages || 0} msgs
                    </Badge>
                    {conv.escalatedUntil && new Date(conv.escalatedUntil.seconds * 1000) > new Date() && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" /> Escalada
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
