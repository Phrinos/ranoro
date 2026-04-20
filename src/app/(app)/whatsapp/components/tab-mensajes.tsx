'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Bell, CheckCircle2, XCircle, Eye, EyeOff, Clock, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { WhatsAppTemplate, WhatsAppAgentConfig } from '../lib/types';

interface TabMensajesProps {
  templates: WhatsAppTemplate;
  setTemplates: React.Dispatch<React.SetStateAction<WhatsAppTemplate>>;
  config: WhatsAppAgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<WhatsAppAgentConfig>>;
  onSaveTemplates: () => void;
  onSaveConfig: () => void;
  isSaving: boolean;
}

const TEMPLATE_CONFIG = [
  {
    key: 'reminder' as const,
    label: 'Recordatorio de Cita',
    desc: 'Se envía automáticamente antes de la cita según la configuración de abajo.',
    icon: Bell,
    color: 'amber',
    rows: 5,
  },
  {
    key: 'confirmation' as const,
    label: 'Confirmación de Cita',
    desc: 'Se envía cuando se confirma la cita.',
    icon: CheckCircle2,
    color: 'green',
    rows: 4,
  },
  {
    key: 'cancellation' as const,
    label: 'Cancelación de Cita',
    desc: 'Se envía cuando se cancela la cita.',
    icon: XCircle,
    color: 'red',
    rows: 3,
  },
  {
    key: 'welcome' as const,
    label: 'Mensaje de Bienvenida',
    desc: 'Se envía la primera vez que un cliente escribe.',
    icon: Send,
    color: 'blue',
    rows: 3,
  },
] as const;

const EXAMPLE_DATA: Record<string, string> = {
  '{{nombre}}': 'Juan Pérez',
  '{{fecha}}': '16 de Abril, 2026',
  '{{hora}}': '8:30 AM',
  '{{vehiculo}}': 'Honda Civic 2020',
  '{{servicio}}': 'Cambio de aceite',
  '{{link}}': 'https://taller.com/cita/abc123',
};

const COLOR_MAP: Record<string, { border: string; bg: string; icon: string }> = {
  blue:  { border: 'border-blue-200',  bg: 'bg-blue-50/30',  icon: 'text-blue-500'  },
  amber: { border: 'border-amber-200', bg: 'bg-amber-50/30', icon: 'text-amber-500' },
  green: { border: 'border-green-200', bg: 'bg-green-50/30', icon: 'text-green-500' },
  red:   { border: 'border-red-200',   bg: 'bg-red-50/30',   icon: 'text-red-500'   },
};

function renderPreview(template: string): string {
  let result = template;
  for (const [key, value] of Object.entries(EXAMPLE_DATA)) {
    result = result.replaceAll(key, value);
  }
  return result.replace(/\\n/g, '\n');
}

export function TabMensajes({ templates, setTemplates, config, setConfig, onSaveTemplates, onSaveConfig, isSaving }: TabMensajesProps) {
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  return (
    <div className="space-y-8">

      {/* ── Section 1: Recordatorios ── */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          Recordatorios Automáticos
        </h3>

        <Card className="bg-white rounded-2xl shadow-xs border border-slate-200">
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Recordatorios Activados</Label>
                <p className="text-sm text-muted-foreground">El bot enviará mensajes automáticos antes de cada cita de servicio.</p>
              </div>
              <Switch
                checked={config.remindersEnabled}
                onCheckedChange={(v) => setConfig(p => ({ ...p, remindersEnabled: v }))}
                className={cn(config.remindersEnabled ? 'data-[state=checked]:bg-green-500' : '')}
              />
            </div>

            {config.remindersEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reminder timing */}
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Recordatorio de Cita</p>
                      <p className="text-xs text-muted-foreground">Se envía antes de la cita</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Enviar con anticipación de:</Label>
                    <Select value={String(config.reminderHoursBefore)} onValueChange={v => setConfig(p => ({ ...p, reminderHoursBefore: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 horas antes</SelectItem>
                        <SelectItem value="24">24 horas antes (1 día)</SelectItem>
                        <SelectItem value="48">48 horas antes (2 días)</SelectItem>
                        <SelectItem value="72">72 horas antes (3 días)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Confirmation timing */}
                <div className="rounded-xl border-2 border-green-200 bg-green-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Confirmación de Cita</p>
                      <p className="text-xs text-muted-foreground">Se envía poco antes de la cita</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Enviar con anticipación de:</Label>
                    <Select value={String(config.confirmationHoursBefore)} onValueChange={v => setConfig(p => ({ ...p, confirmationHoursBefore: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hora antes</SelectItem>
                        <SelectItem value="2">2 horas antes</SelectItem>
                        <SelectItem value="3">3 horas antes</SelectItem>
                        <SelectItem value="4">4 horas antes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 2: Plantillas de Mensajes ── */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Plantillas de Mensajes
        </h3>

        <Alert variant="default" className="bg-blue-50 border-blue-200 mb-4">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Variables Disponibles</AlertTitle>
          <AlertDescription className="text-blue-700">
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(EXAMPLE_DATA).map(([key, example]) => (
                <Badge key={key} variant="secondary" className="bg-blue-100 text-blue-800 font-mono text-[11px]">
                  {key} → {example}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-4">
          {TEMPLATE_CONFIG.map(tpl => {
            const Icon = tpl.icon;
            const isPreview = previewKey === tpl.key;
            const colors = COLOR_MAP[tpl.color] || COLOR_MAP.blue;

            return (
              <Card key={tpl.key} className={cn("bg-white rounded-2xl shadow-xs", colors.border)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${colors.icon}`} />
                      {tpl.label}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewKey(isPreview ? null : tpl.key)}
                      className="gap-1.5 text-xs"
                    >
                      {isPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {isPreview ? 'Editar' : 'Vista previa'}
                    </Button>
                  </div>
                  <CardDescription className="text-xs">{tpl.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isPreview ? (
                    <div className="rounded-xl bg-[#e5ddd5] p-4 space-y-1">
                      <div className="max-w-[85%] ml-auto">
                        <div className="rounded-lg bg-[#dcf8c6] px-3 py-2 shadow-xs">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800">
                            {renderPreview(templates[tpl.key])}
                          </p>
                          <p className="text-[10px] text-gray-500 text-right mt-1">10:30 AM ✓✓</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      rows={tpl.rows}
                      value={templates[tpl.key]}
                      onChange={e => setTemplates(p => ({ ...p, [tpl.key]: e.target.value }))}
                      className="font-mono text-xs"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Mensajes del Sistema ── */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-500" />
          Mensajes del Sistema
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white rounded-2xl shadow-xs border-indigo-200">
            <CardHeader className="pb-3 bg-indigo-50/30">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                Mensaje Fuera de Horario
              </CardTitle>
              <CardDescription className="text-xs">Lineamiento que usará la IA cuando contacten al taller fuera de horario laboral.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                rows={4}
                value={config.outOfHoursMessage}
                onChange={e => setConfig(p => ({ ...p, outOfHoursMessage: e.target.value }))}
                placeholder="Ej: Hola, nuestro horario de atención es de Lun-Vie 8:30-18:00."
                className="text-xs"
              />
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl shadow-xs border-red-200">
            <CardHeader className="pb-3 bg-red-50/30">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Mensaje de Error Técnico
              </CardTitle>
              <CardDescription className="text-xs">Se envía al cliente si el servidor falla. NUNCA expone errores técnicos reales.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                rows={4}
                value={config.fallbackErrorMessage}
                onChange={e => setConfig(p => ({ ...p, fallbackErrorMessage: e.target.value }))}
                placeholder="Ej: Disculpa, tuve un problema técnico. Por favor intenta de nuevo. 🙏"
                className="text-xs"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
