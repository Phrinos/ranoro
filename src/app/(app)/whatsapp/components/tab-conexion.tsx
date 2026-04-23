'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Loader2, Copy, Check, RefreshCw, Globe, Server,
  Shield, Zap, Wifi, WifiOff, Info,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { WhatsAppAgentConfig } from '../lib/types';

interface TabConexionProps {
  config: WhatsAppAgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<WhatsAppAgentConfig>>;
  onSave: () => void;
  isSaving: boolean;
  conversations?: any[]; // kept for backward compat, ignored
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
  config, setConfig, onSave, isSaving,
  webhookUrl, copiedWebhook, copiedApiKey,
  onCopyWebhook, onCopyApiKey, onRegenerateKey,
  connectionStatus, onTestConnection,
}: TabConexionProps) {
  return (
    <div className="space-y-6">


      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-700 text-xs">
          Para ver el historial de conversaciones y vincular pacientes, usa la pestaña <strong>Historial</strong>.
        </AlertDescription>
      </Alert>

      {/* Webhook & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-blue-500" />
            Webhook & Seguridad
          </CardTitle>
          <CardDescription className="text-xs">
            URL del webhook y clave de acceso compartida con el servidor Baileys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">URL del Webhook (copiar al panel Baileys)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="bg-muted font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={onCopyWebhook}>
                {copiedWebhook ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Clave de Acceso (API Key)</Label>
            <div className="flex gap-2">
              <Input value={config.webhookSecret} readOnly className="bg-muted font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={onCopyApiKey} title="Copiar">
                {copiedApiKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={onRegenerateKey} title="Regenerar">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              El servidor Baileys debe enviar esta clave en el header <code className="text-xs bg-muted px-1 py-0.5 rounded">x-api-key</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Baileys Server Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-5 w-5 text-purple-500" />
            Servidor Baileys
          </CardTitle>
          <CardDescription className="text-xs">
            Datos de conexión al servidor de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Host / IP</Label>
              <Input
                value={config.baileysHost}
                onChange={e => setConfig(p => ({ ...p, baileysHost: e.target.value }))}
                placeholder="62.171.187.165"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Puerto</Label>
              <Input
                value={config.baileysPort}
                onChange={e => setConfig(p => ({ ...p, baileysPort: e.target.value }))}
                placeholder="3000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Identificador de Sesión (ID)</Label>
              <Input
                value={config.baileysSessionId}
                onChange={e => setConfig(p => ({ ...p, baileysSessionId: e.target.value }))}
                placeholder="mipediatra"
              />
              <p className="text-[10px] text-muted-foreground">ID único para el código QR de WhatsApp.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            Panel admin:{' '}
            <a
              href={`http://${config.baileysHost}:${config.baileysPort}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium text-foreground hover:text-blue-600 truncate"
            >
              {`http://${config.baileysHost}:${config.baileysPort}/admin`}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onTestConnection}
              disabled={connectionStatus === 'testing'}
              className="gap-2"
            >
              {connectionStatus === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : connectionStatus === 'connected' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : connectionStatus === 'error' ? (
                <WifiOff className="h-4 w-4 text-red-500" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {connectionStatus === 'testing' ? 'Probando...' :
               connectionStatus === 'connected' ? 'Conectado' :
               connectionStatus === 'error' ? 'Sin Conexión' : 'Test de Conexión'}
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

      {/* WhatsApp Phone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Número de WhatsApp del Bot</CardTitle>
          <CardDescription className="text-xs">
            Solo informativo. Aparece en el header del panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-sm">Número con código de país</Label>
            <Input
              value={config.whatsappPhone || ''}
              onChange={e => setConfig(p => ({ ...p, whatsappPhone: e.target.value }))}
              placeholder="+52 618 188 9562"
              className="max-w-xs font-mono"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
