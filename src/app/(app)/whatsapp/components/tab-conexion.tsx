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
import { cn } from '@/lib/utils';

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


      <Alert className="bg-amber-50 border-amber-200 shadow-sm">
        <Info className="h-5 w-5 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm ml-2">
          Sigue estos 3 pasos para enlazar Ranoro con WhatsApp. Si regeneras la clave, no olvides hacer clic en <strong>"Guardar Configuración"</strong> en la parte superior.
        </AlertDescription>
      </Alert>

      {/* Webhook & Security */}
      <Card className="border-blue-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">1</div>
            <CardTitle className="flex items-center gap-2 text-base text-blue-800">
              <Shield className="h-5 w-5" />
              Webhook y Seguridad
            </CardTitle>
          </div>
          <CardDescription className="text-xs ml-8">
            Pega estos datos dentro de tu panel de Baileys para enlazar Ranoro con WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 ml-8">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">URL del Webhook (Destino de mensajes)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="bg-slate-50 font-mono text-sm border-dashed" />
              <Button variant="outline" className="shrink-0" onClick={onCopyWebhook}>
                {copiedWebhook ? <Check className="h-4 w-4 text-green-500 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copiedWebhook ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Esta URL recibe los mensajes entrantes de los clientes.</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Clave de Acceso (API Key)</Label>
            <div className="flex gap-2">
              <Input value={config.webhookSecret} readOnly className="bg-slate-50 font-mono text-sm border-dashed" />
              <Button variant="outline" className="shrink-0" onClick={onCopyApiKey} title="Copiar">
                {copiedApiKey ? <Check className="h-4 w-4 text-green-500 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copiedApiKey ? 'Copiado' : 'Copiar'}
              </Button>
              <Button variant="ghost" className="shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={onRegenerateKey} title="Regenerar">
                <RefreshCw className="h-4 w-4 mr-2" />
                Renovar
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md border inline-block mt-2">
              ⚠️ El servidor Baileys debe enviar esta clave en el header <strong className="text-black">x-api-key</strong> para autorizar el tráfico.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Baileys Server Config */}
      <Card className="border-purple-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Server className="h-32 w-32" />
        </div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">2</div>
            <CardTitle className="flex items-center gap-2 text-base text-purple-800">
              <Server className="h-5 w-5" />
              Conexión al Motor (Baileys)
            </CardTitle>
          </div>
          <CardDescription className="text-xs ml-8">
            Datos de red para conectar la interfaz con el servidor privado de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 ml-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white/50 p-4 rounded-xl border border-purple-100">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Host / IP del Servidor</Label>
              <Input
                value={config.baileysHost}
                onChange={e => setConfig(p => ({ ...p, baileysHost: e.target.value }))}
                placeholder="62.171.187.165"
                className="bg-white border-purple-200 focus-visible:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Puerto</Label>
              <Input
                value={config.baileysPort}
                onChange={e => setConfig(p => ({ ...p, baileysPort: e.target.value }))}
                placeholder="3000"
                className="bg-white border-purple-200 focus-visible:ring-purple-500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Session ID (Nombre de sesión)</Label>
              <Input
                value={config.baileysSessionId}
                onChange={e => setConfig(p => ({ ...p, baileysSessionId: e.target.value }))}
                placeholder="ranoro_bot"
                className="bg-white border-purple-200 focus-visible:ring-purple-500 font-mono"
              />
              <p className="text-[10px] text-muted-foreground">ID para generar el código QR.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-purple-50 p-4 rounded-lg border border-purple-100">
            <div className="flex items-center gap-3 text-sm text-purple-900">
              <Globe className="h-5 w-5 text-purple-600" />
              <span>
                Panel de control (Para escanear el QR):{' '}
                <a
                  href={`http://${config.baileysHost}:${config.baileysPort}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold text-purple-700 hover:text-purple-900 truncate"
                >
                  {`http://${config.baileysHost}:${config.baileysPort}/admin`}
                </a>
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant={connectionStatus === 'connected' ? 'default' : 'outline'}
                size="sm"
                onClick={onTestConnection}
                disabled={connectionStatus === 'testing'}
                className={cn(
                  "gap-2 font-semibold w-full sm:w-auto transition-all duration-300",
                  connectionStatus === 'connected' ? "bg-green-600 hover:bg-green-700 text-white border-transparent" : "border-purple-300 text-purple-700 hover:bg-purple-100"
                )}
              >
                {connectionStatus === 'testing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : connectionStatus === 'connected' ? (
                  <Wifi className="h-4 w-4" />
                ) : connectionStatus === 'error' ? (
                  <WifiOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {connectionStatus === 'testing' ? 'Verificando red...' :
                 connectionStatus === 'connected' ? 'Servidor Enlazado' :
                 connectionStatus === 'error' ? 'Fallo en Conexión' : 'Probar Conexión'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Phone */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">3</div>
            <CardTitle className="text-base">Número de WhatsApp del Bot</CardTitle>
          </div>
          <CardDescription className="text-xs ml-8">
            Solo informativo. Es el número con el que el bot está operando.
          </CardDescription>
        </CardHeader>
        <CardContent className="ml-8">
          <div className="space-y-2">
            <Label className="text-sm">Número con código de país</Label>
            <Input
              value={config.whatsappPhone || ''}
              onChange={e => setConfig(p => ({ ...p, whatsappPhone: e.target.value }))}
              placeholder="+52 871 000 0000"
              className="max-w-xs font-mono"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
