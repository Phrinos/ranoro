'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Cpu, Trash2, ShieldAlert, Calendar, Wrench } from 'lucide-react';
import type { WhatsAppAgentConfig } from '../lib/types';
import { MODEL_OPTIONS, WORKSHOP_SCHEDULE } from '../lib/constants';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TabPromptProps {
  config: WhatsAppAgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<WhatsAppAgentConfig>>;
  onSave: () => void;
  isSaving: boolean;
  onPurge: () => void;
  isPurging: boolean;
}

export function TabPrompt({ config, setConfig, onSave, isSaving, onPurge, isPurging }: TabPromptProps) {
  return (
    <div className="space-y-6">

      {/* Prompt Configuration */}
      <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Prompt del Sistema (IA)
          </CardTitle>
          <CardDescription>
            Instrucciones maestras. Define la personalidad, reglas de negocio, servicios que ofrece el taller y comportamiento de escalamiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.customInstructions}
            onChange={e => setConfig(prev => ({ ...prev, customInstructions: e.target.value }))}
            className="font-mono text-xs leading-relaxed min-h-[500px]"
            placeholder={`Eres el asistente virtual del taller mecánico. Tu trabajo es:\n1. Cotizar servicios usando la lista de precios del taller\n2. Agendar citas en los horarios disponibles (8:30 AM y 1:30 PM)\n3. Enviar links de seguimiento al cliente\n4. Cancelar y reagendar citas moviendo la existente\n5. Responder dudas sobre servicios y precios`}
          />
        </CardContent>
      </Card>

      {/* Workshop Schedule Info */}
      <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-500" />
            Agenda del Taller
          </CardTitle>
          <CardDescription>
            Configuración de los bloques de citas disponibles. El bot agendará dentro de estos horarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Morning block */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Wrench className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Bloque Matutino</p>
                  <p className="text-xs text-muted-foreground">Lunes a Sábado</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-blue-700">{WORKSHOP_SCHEDULE.morningSlot}</span>
                <span className="text-sm text-muted-foreground">— {WORKSHOP_SCHEDULE.slotsPerBlock} espacios</span>
              </div>
            </div>

            {/* Afternoon block */}
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Wrench className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Bloque Vespertino</p>
                  <p className="text-xs text-muted-foreground">Lunes a Viernes (Sábado cerrado)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-700">{WORKSHOP_SCHEDULE.afternoonSlot}</span>
                <span className="text-sm text-muted-foreground">— {WORKSHOP_SCHEDULE.slotsPerBlock} espacios</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Domingos:</strong> Cerrado. <strong>Sábados:</strong> Solo bloque matutino ({WORKSHOP_SCHEDULE.morningSlot}).
            Total diario Lun-Vie: {WORKSHOP_SCHEDULE.slotsPerBlock * 2} vehículos. Sábados: {WORKSHOP_SCHEDULE.slotsPerBlock} vehículos.
          </p>
        </CardContent>
      </Card>

      {/* Model & AI Settings */}
      <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-5 w-5 text-violet-500" />
            Configuración de IA
          </CardTitle>
          <CardDescription>
            Opciones del modelo y memoria del asistente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Modelo de Gemini</Label>
                <Select
                  value={config.geminiModel || 'gemini-2.5-flash'}
                  onValueChange={(v) => setConfig(p => ({ ...p, geminiModel: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Preview (última generación)</SelectLabel>
                      {MODEL_OPTIONS.filter(m => m.group === 'preview').map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-[10px] opacity-70">{m.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Stable (Recomendados)</SelectLabel>
                      {MODEL_OPTIONS.filter(m => m.group === 'stable').map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-[10px] opacity-70">{m.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">El modelo Flash es el más equilibrado para chats rápidos.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Memoria de Conversación (TTL)</Label>
                <Input
                  type="number"
                  min={1}
                  max={48}
                  value={config.sessionTTLHours || 4}
                  onChange={e => setConfig(p => ({ ...p, sessionTTLHours: Number(e.target.value) || 4 }))}
                  className="w-[120px]"
                />
                <p className="text-xs text-muted-foreground">Cuánto tiempo la IA recordará la plática de un cliente antes de reiniciar el contexto.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Reintentos por Error 503</Label>
                <Select
                  value={String(config.geminiMaxRetries || 3)}
                  onValueChange={(v) => setConfig(p => ({ ...p, geminiMaxRetries: Number(v) }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona reintentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 (Sin reintentos)</SelectItem>
                    <SelectItem value="1">1 reintento</SelectItem>
                    <SelectItem value="2">2 reintentos</SelectItem>
                    <SelectItem value="3">3 reintentos (recomendado)</SelectItem>
                    <SelectItem value="5">5 reintentos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Cuántas veces reintentar si Gemini está saturado o devuelve un 503.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Espera entre Reintentos (Segundos)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={(config.geminiRetryDelayMs || 10000) / 1000}
                  onChange={e => {
                    const secs = Number(e.target.value) || 10;
                    setConfig(p => ({ ...p, geminiRetryDelayMs: secs * 1000 }));
                  }}
                  className="w-[120px]"
                />
                <p className="text-xs text-muted-foreground">Tiempo de espera antes de volver a llamar a la API tras un error.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-white rounded-2xl shadow-sm border-red-200">
        <CardHeader className="pb-3 bg-red-50/30">
          <CardTitle className="text-base flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
            Zona de Peligro
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-2">
            <Label className="text-base font-medium text-red-800">Purgar Conversaciones</Label>
            <p className="text-xs text-muted-foreground">Elimina TODOS los historiales de chat activos. Útil si la IA se queda atascada o al hacer un reset.</p>
            <Button
              variant="destructive"
              onClick={onPurge}
              disabled={isPurging}
              className="w-fit mt-2"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isPurging ? 'Purgando...' : 'Purgar Conversaciones'}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
