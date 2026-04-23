'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Cpu, Bell, MessageSquare, Users, X, Plus, Trash2 } from 'lucide-react';
import type { WhatsAppAgentConfig } from '../lib/types';
import { MODEL_OPTIONS } from '../lib/constants';

import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────

interface StaffMember {
  uid: string;
  name: string;
  notifyEscalation?: boolean;
}

interface TabPromptProps {
  config: WhatsAppAgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<WhatsAppAgentConfig>>;
  onSave: () => void;
  isSaving: boolean;
  onPurge: () => void;
  isPurging: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function TabPrompt({ config, setConfig, onSave, isSaving, onPurge, isPurging }: TabPromptProps) {
  const [newMemberUid, setNewMemberUid] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  const staffMembers: StaffMember[] = Array.isArray((config as any).staffMembers)
    ? (config as any).staffMembers
    : [];

  const addStaffMember = useCallback(() => {
    const uid = newMemberUid.trim();
    const name = newMemberName.trim();
    if (!uid || !name) return;
    if (staffMembers.some(m => m.uid === uid)) return;
    setConfig(prev => ({
      ...prev,
      staffMembers: [...staffMembers, { uid, name, notifyEscalation: true }],
    } as any));
    setNewMemberUid('');
    setNewMemberName('');
  }, [newMemberUid, newMemberName, staffMembers, setConfig]);

  const removeStaffMember = (uid: string) => {
    setConfig(prev => ({
      ...prev,
      staffMembers: staffMembers.filter(m => m.uid !== uid),
    } as any));
  };

  const toggleNotify = (uid: string) => {
    setConfig(prev => ({
      ...prev,
      staffMembers: staffMembers.map(m =>
        m.uid === uid ? { ...m, notifyEscalation: !m.notifyEscalation } : m
      ),
    } as any));
  };

  return (
    <div className="space-y-6">


      {/* ── Card 1: Master Prompt ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Master Prompt (Personalidad y Flujos)
          </CardTitle>
          <CardDescription className="text-xs">
            Define aquí la personalidad, reglas de comportamiento, flujos de conversación y límites de Sof-IA.
            Los datos del taller (precios, ubicación) se configuran en la pestaña "Base de Conocimiento".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.customInstructions}
            onChange={e => setConfig(prev => ({ ...prev, customInstructions: e.target.value }))}
            className="font-mono text-xs leading-relaxed min-h-[500px]"
            placeholder="Eres SofIA, la asistente virtual del taller mecánico Ranoro..."
          />
        </CardContent>
      </Card>

      {/* ── Card 2: AI Settings ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-5 w-5 text-violet-500" />
            Configuración de IA
          </CardTitle>
          <CardDescription className="text-xs">Modelo y parámetros de memoria.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Modelo de Gemini</Label>
                <Select
                  value={config.geminiModel || 'gemini-2.0-flash-lite'}
                  onValueChange={v => setConfig(p => ({ ...p, geminiModel: v }))}
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
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Memoria de sesión (horas)</Label>
                <Input
                  type="number" min={1} max={48}
                  value={config.sessionTTLHours || 4}
                  onChange={e => setConfig(p => ({ ...p, sessionTTLHours: Number(e.target.value) || 4 }))}
                  className="w-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Tiempo antes de que el bot "olvide" la conversación y empiece de nuevo.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Reintentos por error 503</Label>
                <Select
                  value={String(config.geminiMaxRetries || 3)}
                  onValueChange={v => setConfig(p => ({ ...p, geminiMaxRetries: Number(v) }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 (Sin reintentos)</SelectItem>
                    <SelectItem value="1">1 reintento</SelectItem>
                    <SelectItem value="2">2 reintentos</SelectItem>
                    <SelectItem value="3">3 reintentos (recomendado)</SelectItem>
                    <SelectItem value="5">5 reintentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Espera entre reintentos (seg)</Label>
                <Input
                  type="number" min={1} max={30}
                  value={(config.geminiRetryDelayMs || 10000) / 1000}
                  onChange={e => setConfig(p => ({ ...p, geminiRetryDelayMs: Number(e.target.value) * 1000 }))}
                  className="w-[120px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Staff Members ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            Equipo de Staff
          </CardTitle>
          <CardDescription className="text-xs">
            Miembros con acceso de staff al bot. Usa el UID de WhatsApp (Baileys) — no el número de teléfono.
            Los miembros con notificación activada reciben alertas cuando un cliente solicita asistencia humana.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Member list */}
          <div className="space-y-2">
            {staffMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-3 border border-dashed rounded-lg">
                No hay miembros de staff configurados.
              </p>
            ) : (
              staffMembers.map(member => (
                <div
                  key={member.uid}
                  className="flex items-center gap-3 rounded-lg border p-3 bg-gray-50/50"
                >
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-emerald-700">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.name}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">{member.uid}</p>
                  </div>

                  {/* Escalation toggle */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <Label className="text-[10px] text-muted-foreground">Notif.</Label>
                    <Switch
                      checked={member.notifyEscalation !== false}
                      onCheckedChange={() => toggleNotify(member.uid)}
                      className={cn(member.notifyEscalation !== false ? 'data-[state=checked]:bg-green-500' : '')}
                    />
                  </div>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 flex-shrink-0"
                    onClick={() => removeStaffMember(member.uid)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add member form */}
          <div className="rounded-lg border p-3 space-y-3 bg-white">
            <Label className="text-xs font-medium">Añadir miembro</Label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                placeholder="UID de Baileys (ej: 235776675729492)"
                value={newMemberUid}
                onChange={e => setNewMemberUid(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && addStaffMember()}
                className="font-mono text-xs"
              />
              <Input
                placeholder="Nombre del miembro"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStaffMember()}
                className="text-xs"
              />
              <Button
                variant="secondary"
                onClick={addStaffMember}
                disabled={!newMemberUid.trim() || !newMemberName.trim()}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              El UID de Baileys es el identificador numérico que usa WhatsApp internamente (no el número de teléfono).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 4: Recordatorios ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            Recordatorios Automáticos
          </CardTitle>
          <CardDescription className="text-xs">
            Configuración del timing de recordatorios. Los mensajes se definen en el Master Prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Recordatorios activados</Label>
              <p className="text-xs text-muted-foreground">
                El bot enviará mensajes automáticos antes de cada cita.
              </p>
            </div>
            <Switch
              checked={config.remindersEnabled}
              onCheckedChange={v => setConfig(p => ({ ...p, remindersEnabled: v }))}
              className={cn(config.remindersEnabled ? 'data-[state=checked]:bg-green-500' : '')}
            />
          </div>

          {config.remindersEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 space-y-2">
                <Label className="text-xs font-medium">Recordatorio — Anticipación</Label>
                <Select
                  value={String(config.reminderHoursBefore || 24)}
                  onValueChange={v => setConfig(p => ({ ...p, reminderHoursBefore: Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 horas antes</SelectItem>
                    <SelectItem value="24">24 horas antes (1 día)</SelectItem>
                    <SelectItem value="48">48 horas antes (2 días)</SelectItem>
                    <SelectItem value="72">72 horas antes (3 días)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <Label className="text-xs font-medium">Confirmación — Anticipación</Label>
                <Select
                  value={String(config.confirmationHoursBefore || 2)}
                  onValueChange={v => setConfig(p => ({ ...p, confirmationHoursBefore: Number(v) }))}
                >
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
          )}
        </CardContent>
      </Card>

      {/* ── Card 5: Mensajes del Sistema ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            Mensajes del Sistema
          </CardTitle>
          <CardDescription className="text-xs">
            Mensajes especiales que el bot envía automáticamente en situaciones específicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Mensaje fuera de horario</Label>
            <Textarea
              rows={4}
              value={config.outOfHoursMessage || ''}
              onChange={e => setConfig(p => ({ ...p, outOfHoursMessage: e.target.value }))}
              placeholder="Lineamiento para cuando contacten fuera de horario."
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mensaje de error técnico</Label>
            <Textarea
              rows={4}
              value={config.fallbackErrorMessage || ''}
              onChange={e => setConfig(p => ({ ...p, fallbackErrorMessage: e.target.value }))}
              placeholder="Se envía si el servidor falla. Nunca expone errores técnicos reales."
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
