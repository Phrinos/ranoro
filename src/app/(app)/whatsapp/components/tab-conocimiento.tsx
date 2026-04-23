'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wrench, MapPin, DollarSign, Clock, Info, ExternalLink, 
  Eye, EyeOff, Loader2, CheckCircle2, CreditCard, Settings2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface KnowledgeData {
  workshop: {
    name: string;
    specialty: string;
    description: string;
    website: string;
  };
  location: {
    address: string;
    reference: string;
    mapsUrl: string;
    phone: string;
  };
  schedule: {
    weekdays: string;
    saturday: string;
    sunday: string;
    appointmentSlots: string;
    noAppointmentNeeded: string;
  };
  payment: {
    methods: string[];
    notes: string;
  };
  botRules: string;
  extra: string;
}

const PAYMENT_OPTIONS = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'transferencia', label: 'Transferencia bancaria', icon: '🏦' },
  { id: 'tarjeta', label: 'Tarjeta (débito/crédito)', icon: '💳' },
];

const DEFAULT_DATA: KnowledgeData = {
  workshop: {
    name: 'Taller Mecánico Ranoro',
    specialty: 'Mecánica General, Afinaciones, Frenos, Suspensión',
    description: 'Servicio mecánico automotriz de confianza, enfocados en diagnósticos precisos y reparaciones duraderas.',
    website: 'ranoro.mx',
  },
  location: {
    address: 'Av. Principal 123, Colonia Centro',
    reference: 'Frente a la gasolinera principal',
    mapsUrl: '',
    phone: '+52 1 234 567 8900',
  },
  schedule: {
    weekdays: 'Lunes a Viernes de 8:30 AM a 5:30 PM',
    saturday: 'Sábados de 8:30 AM a 1:30 PM',
    sunday: 'Cerrado',
    appointmentSlots: 'Turno Mañana: 08:30 AM, Turno Tarde: 01:30 PM',
    noAppointmentNeeded: 'Para cambios de aceite sencillos y revisiones exprés no se requiere cita obligatoria, se atienden conforme llegan.',
  },
  payment: {
    methods: ['efectivo', 'transferencia', 'tarjeta'],
    notes: 'Para reparaciones mayores al 50% se requiere anticipo del 50%.',
  },
  botRules: '- SofIA debe priorizar agendar citas en los horarios 08:30 y 13:30.\\n- Si el cliente pregunta por servicios de Hojalatería o Enderezado y Pintura, informar que próximamente estará disponible, pero por ahora solo es mecánica general.',
  extra: 'Los precios exactos solo se dan después de un diagnóstico físico, ya que cada marca y modelo requiere refacciones distintas.',
};

function buildKnowledgeString(data: KnowledgeData): string {
  const lines: string[] = [];

  lines.push('== TALLER ==');
  lines.push(`Nombre: ${data.workshop.name}`);
  lines.push(`Especialidades: ${data.workshop.specialty}`);
  lines.push(`Descripción: ${data.workshop.description}`);
  if (data.workshop.website) lines.push(`Sitio web: ${data.workshop.website}`);

  lines.push('\\n== UBICACIÓN ==');
  lines.push(`Dirección: ${data.location.address}`);
  if (data.location.reference) lines.push(`Referencia: ${data.location.reference}`);
  if (data.location.phone) lines.push(`Teléfono / WhatsApp: ${data.location.phone}`);
  if (data.location.mapsUrl) lines.push(`Google Maps: ${data.location.mapsUrl}`);

  lines.push('\\n== HORARIOS Y CITAS ==');
  lines.push(`Lunes a Viernes: ${data.schedule.weekdays}`);
  lines.push(`Sábados: ${data.schedule.saturday}`);
  lines.push(`Domingos: ${data.schedule.sunday}`);
  lines.push(`Horarios disponibles para agendar citas: ${data.schedule.appointmentSlots}`);
  lines.push(`Sin cita previa: ${data.schedule.noAppointmentNeeded}`);

  lines.push('\\n== SERVICIOS Y PRECIOS ==');
  lines.push('Los servicios y refacciones pueden consultarse directamente en el catálogo interno del bot o en la URL: /listadeprecios. Siempre aconsejar diagnóstico físico para precio real.');

  if (data.payment.methods.length > 0) {
    lines.push('\\n== FORMAS DE PAGO ==');
    const methods: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia bancaria', tarjeta: 'Tarjeta (débito y crédito)' };
    lines.push(data.payment.methods.map(m => methods[m] || m).join(', '));
    if (data.payment.notes) lines.push(data.payment.notes);
  }

  if (data.botRules?.trim()) {
    lines.push('\\n== REGLAS Y POLÍTICAS ==');
    lines.push(data.botRules.trim());
  }

  if (data.extra?.trim()) {
    lines.push('\\n== INFORMACIÓN ADICIONAL ==');
    lines.push(data.extra.trim());
  }

  return lines.join('\\n');
}

export function TabConocimiento() {
  const [data, setData] = useState<KnowledgeData>(DEFAULT_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/whatsapp/knowledge')
      .then(r => r.json())
      .then(d => {
        if (d.structured) setData(d.structured);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const content = buildKnowledgeString(data);
      await fetch('/api/whatsapp/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, structured: data }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  const updateSection = (section: keyof KnowledgeData, key: string, value: string) => {
    setData(d => ({ ...d, [section]: { ...(d[section] as any), [key]: value } }));
  };

  const togglePayment = (method: string) =>
    setData(d => {
      const current = d.payment.methods;
      return { ...d, payment: { ...d.payment, methods: current.includes(method) ? current.filter(m => m !== method) : [...current, method] } };
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Cargando base de conocimiento…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="sticky top-20 z-20 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSaving ? 'Guardando...' : 'Guardar Base de Conocimiento'}
        </Button>
      </div>

      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">Base de conocimiento guardada.</AlertDescription>
        </Alert>
      )}

      {/* Taller */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4 text-blue-500" /> Datos del Taller</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs">Nombre</Label><Input value={data.workshop.name} onChange={e => updateSection('workshop', 'name', e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Especialidades</Label><Input value={data.workshop.specialty} onChange={e => updateSection('workshop', 'specialty', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label className="text-xs">Descripción corta</Label><Input value={data.workshop.description} onChange={e => updateSection('workshop', 'description', e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Horarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-purple-500" /> Horarios del Taller</CardTitle>
          <CardDescription className="text-xs">SofIA usará estos datos para ofrecer opciones al cliente y saber cuándo el taller está abierto.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs">Lunes a Viernes</Label><Input value={data.schedule.weekdays} onChange={e => updateSection('schedule', 'weekdays', e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Sábados</Label><Input value={data.schedule.saturday} onChange={e => updateSection('schedule', 'saturday', e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Turnos disponibles para agendar (Ej. 08:30 y 13:30)</Label><Input value={data.schedule.appointmentSlots} onChange={e => updateSection('schedule', 'appointmentSlots', e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Servicios sin cita (Ej. Cambios de Aceite)</Label><Input value={data.schedule.noAppointmentNeeded} onChange={e => updateSection('schedule', 'noAppointmentNeeded', e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Ubicacion */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-rose-500" /> Ubicación y Contacto</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs">Dirección completa</Label><Input value={data.location.address} onChange={e => updateSection('location', 'address', e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Referencia</Label><Input value={data.location.reference} onChange={e => updateSection('location', 'reference', e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Servicios Link */}
      <Card className="border-dashed">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4 text-emerald-500" /> Lista de Precios</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div><p className="text-sm font-medium">Lista de Precios</p><p className="text-xs text-muted-foreground">La IA recomendará consultar la lista oficial si le preguntan precios detallados.</p></div>
            <Button variant="outline" size="sm" asChild><Link href="/listadeprecios"><ExternalLink className="h-3.5 w-3.5 mr-2" />Ir a Lista de Precios</Link></Button>
          </div>
        </CardContent>
      </Card>

      {/* Formas de Pago */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-violet-500" /> Formas de Pago</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {PAYMENT_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => togglePayment(opt.id)} className={cn('flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors', data.payment.methods.includes(opt.id) ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500')} >
                <span>{opt.icon}</span>{opt.label}{data.payment.methods.includes(opt.id) && <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />}
              </button>
            ))}
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Nota de pagos</Label><Input value={data.payment.notes} onChange={e => setData(d => ({ ...d, payment: { ...d.payment, notes: e.target.value } }))} /></div>
        </CardContent>
      </Card>

      {/* Reglas IA */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-purple-500" /> Reglas del Bot (Bot Rules)</CardTitle></CardHeader>
        <CardContent><Textarea rows={4} value={data.botRules} onChange={e => setData(d => ({ ...d, botRules: e.target.value }))} className="font-mono text-xs" /></CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Vista previa para el bot</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(p => !p)}>{showPreview ? 'Ocultar' : 'Ver preview'}</Button>
          </div>
        </CardHeader>
        {showPreview && <CardContent><pre className="text-xs font-mono bg-gray-50 p-4 border rounded-lg whitespace-pre-wrap">{buildKnowledgeString(data)}</pre></CardContent>}
      </Card>
    </div>
  );
}
