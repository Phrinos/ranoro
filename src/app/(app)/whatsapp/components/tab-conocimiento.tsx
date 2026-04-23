'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { StickySaveBar } from './sticky-save-bar';
import {
  User, MapPin, DollarSign, Clock, Info, ExternalLink,
  Eye, EyeOff, Loader2, CheckCircle2, CreditCard, MessageSquare, Star, Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Interface kept minimal — services now live in settings/services (Firestore via servicios-admin)
interface KnowledgeData {
  doctor: {
    fullName: string;
    specialty: string;
    certification: string;
    bio: string;
    website: string;
  };
  location: {
    hospital: string;
    office: string;
    address: string;
    reference: string;
    mapsUrl: string;
    phone: string;
  };
  payment: {
    methods: string[];
    notes: string;
  };
  followUp: {
    enabled: boolean;
    googleReviewUrl: string;
    template: string;
    delayHours: number;
  };
  botRules: string; // Additional instructions / FAQ for the bot
  extra: string;
}


const PAYMENT_OPTIONS = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'transferencia', label: 'Transferencia bancaria', icon: '🏦' },
  { id: 'tarjeta', label: 'Tarjeta (débito/crédito)', icon: '💳' },
];

const DEFAULT_DATA: KnowledgeData = {
  doctor: {
    fullName: 'Dr. Pedro Carrasco Santillán',
    specialty: 'Pediatría',
    certification: 'Consejo Mexicano de Pediatría',
    bio: 'El Dr. Pedro Carrasco no trata expedientes, acompaña historias en crecimiento.',
    website: 'mipediatra.mx',
  },
  location: {
    hospital: 'Hospital Rebren',
    office: 'Consultorio 10',
    address: 'Calle Paloma 903, Durango, 34060',
    reference: 'Frente a Farmacia Guadalajara',
    mapsUrl: '',
    phone: '+52 1 618 188 9562',
  },
  payment: {
    methods: ['efectivo', 'transferencia'],
    notes: '',
  },
  followUp: {
    enabled: true,
    googleReviewUrl: 'https://g.page/r/CbQfly1Or2D7EBM/review',
    template: 'Hola {{tutor}} 👋\n\n¿Cómo ha seguido {{paciente}} después de su visita con el {{doctor}}?\n\nEsperamos que se sienta mucho mejor. Si tienes alguna duda o pregunta sobre el tratamiento, con gusto te atendemos por aquí 😊\n\nY si tu experiencia fue positiva, nos ayudarías mucho dejándonos tu opinión en Google 🙏\n👉 {{reviewUrl}}\n\nGracias por confiar en nosotros ❤️\n— Consultorio {{doctor}} | mipediatra.mx',
    delayHours: 24,
  },
  botRules: '',
  extra: '',
};

// ── Serializer: structured → text for bot ─────────────────────────────

function buildKnowledgeString(data: KnowledgeData): string {
  const lines: string[] = [];

  // Doctor
  lines.push('== MÉDICO ==');
  lines.push(`Nombre: ${data.doctor.fullName}`);
  lines.push(`Especialidad: ${data.doctor.specialty}`);
  if (data.doctor.certification) lines.push(`Certificación: ${data.doctor.certification}`);
  if (data.doctor.bio) lines.push(`Presentación: ${data.doctor.bio}`);
  if (data.doctor.website) lines.push(`Sitio web: ${data.doctor.website}`);

  // Location
  lines.push('\n== UBICACIÓN ==');
  if (data.location.hospital) lines.push(`Hospital / Edificio: ${data.location.hospital}`);
  if (data.location.office) lines.push(`Consultorio: ${data.location.office}`);
  if (data.location.address) lines.push(`Dirección: ${data.location.address}`);
  if (data.location.reference) lines.push(`Referencia: ${data.location.reference}`);
  if (data.location.phone) lines.push(`Teléfono / WhatsApp: ${data.location.phone}`);
  if (data.location.mapsUrl) lines.push(`Google Maps: ${data.location.mapsUrl}`);

  // Horarios note
  lines.push('\n== HORARIOS ==');
  lines.push('Los horarios de atención están configurados en la agenda del doctor.');
  lines.push('Usa la herramienta check_availability para verificar disponibilidad real.');

  // NOTE: Services & prices come from settings/services (injected separately by loadServicesKnowledge)

  // Payment
  if (data.payment.methods.length > 0) {
    lines.push('\n== FORMAS DE PAGO ==');
    const methods: Record<string, string> = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia bancaria',
      tarjeta: 'Tarjeta (débito y crédito)',
    };
    lines.push(data.payment.methods.map(m => methods[m] || m).join(', '));
    if (data.payment.notes) lines.push(data.payment.notes);
  }

  // Bot rules
  if (data.botRules?.trim()) {
    lines.push('\n== REGLAS Y POLÍTICAS ==');
    lines.push(data.botRules.trim());
  }

  // Extra
  if (data.extra?.trim()) {
    lines.push('\n== INFORMACIÓN ADICIONAL ==');
    lines.push(data.extra.trim());
  }

  return lines.join('\n');
}

// ── Component ─────────────────────────────────────────────────────────

export function TabConocimiento() {
  const [data, setData] = useState<KnowledgeData>(DEFAULT_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load from API
  useEffect(() => {
    fetch('/api/whatsapp/knowledge')
      .then(r => r.json())
      .then(d => {
        if (d.structured) setData(d.structured);
        else if (d.content) {
          // It only has content string — keep defaults
        }
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
        body: JSON.stringify({ content, structured: data, followUp: data.followUp }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  const updateDoctor = (key: keyof KnowledgeData['doctor'], value: string) =>
    setData(d => ({ ...d, doctor: { ...d.doctor, [key]: value } }));

  const updateLocation = (key: keyof KnowledgeData['location'], value: string) =>
    setData(d => ({ ...d, location: { ...d.location, [key]: value } }));

  const togglePayment = (method: string) =>
    setData(d => {
      const current = d.payment.methods;
      return {
        ...d,
        payment: {
          ...d.payment,
          methods: current.includes(method)
            ? current.filter(m => m !== method)
            : [...current, method],
        },
      };
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
    <div className="space-y-8">
      <StickySaveBar onSave={handleSave} isSaving={isSaving} label="Guardar Base de Conocimiento" />

      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Base de conocimiento guardada. El bot usará los datos actualizados en los próximos mensajes.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Card 1: Médico ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-blue-500" />
            Datos del Médico
          </CardTitle>
          <CardDescription className="text-xs">
            Información del doctor que el bot presentará a los pacientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre completo</Label>
            <Input value={data.doctor.fullName} onChange={e => updateDoctor('fullName', e.target.value)} placeholder="Dr. Juan Pérez García" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Especialidad</Label>
            <Input value={data.doctor.specialty} onChange={e => updateDoctor('specialty', e.target.value)} placeholder="Pediatría" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Certificación</Label>
            <Input value={data.doctor.certification} onChange={e => updateDoctor('certification', e.target.value)} placeholder="Consejo Mexicano de Pediatría" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sitio web</Label>
            <Input value={data.doctor.website} onChange={e => updateDoctor('website', e.target.value)} placeholder="mipediatra.mx" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Presentación del doctor (bio breve)</Label>
            <Textarea
              rows={3}
              value={data.doctor.bio}
              onChange={e => updateDoctor('bio', e.target.value)}
              placeholder="El Dr. Pedro Carrasco no trata expedientes, acompaña historias en crecimiento."
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 2: Ubicación ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-rose-500" />
            Ubicación y Contacto
          </CardTitle>
          <CardDescription className="text-xs">
            El bot usará esta información cuando le pregunten dónde está el consultorio.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Hospital / Edificio</Label>
            <Input value={data.location.hospital} onChange={e => updateLocation('hospital', e.target.value)} placeholder="Hospital Rebren" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Consultorio / Número</Label>
            <Input value={data.location.office} onChange={e => updateLocation('office', e.target.value)} placeholder="Consultorio 10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dirección completa</Label>
            <Input value={data.location.address} onChange={e => updateLocation('address', e.target.value)} placeholder="Calle Paloma 903, Durango, 34060" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Referencia / Punto de referencia</Label>
            <Input value={data.location.reference} onChange={e => updateLocation('reference', e.target.value)} placeholder="Frente a Farmacia Guadalajara" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Teléfono / WhatsApp del consultorio</Label>
            <Input value={data.location.phone} onChange={e => updateLocation('phone', e.target.value)} placeholder="+52 1 618 188 9562" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Enlace de Google Maps (opcional)</Label>
            <Input value={data.location.mapsUrl} onChange={e => updateLocation('mapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Horarios ── */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-blue-500" />
            Horarios de Atención
          </CardTitle>
          <CardDescription className="text-xs">
            Los horarios se configuran en la agenda del doctor. La IA lee la disponibilidad real directamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-blue-200 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Configura los horarios en tu agenda</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sof-IA consulta la agenda en tiempo real para verificar disponibilidad.
                Los bloqueos y citas ya agendadas también se consideran automáticamente.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0"
              onClick={() => window.open('/configuracion-agenda', '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Configurar agenda
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 4: Servicios y Precios → redirect to servicios-admin ── */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Servicios y Precios
          </CardTitle>
          <CardDescription className="text-xs">
            Los servicios ahora son la fuente única de verdad. Edítalos desde el panel de administración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Panel de Servicios</p>
              <p className="text-xs text-muted-foreground">
                Los servicios se editan en <strong>Servicios → Gestión de Servicios</strong> y el bot los lee automáticamente desde Firestore.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-2 shrink-0">
              <Link href="/servicios-admin">
                <ExternalLink className="h-3.5 w-3.5" />
                Ir a Servicios
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 5: Formas de Pago ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-violet-500" />
            Formas de Pago
          </CardTitle>
          <CardDescription className="text-xs">
            El bot informará estas opciones cuando un paciente pregunte cómo pagar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {PAYMENT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => togglePayment(opt.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  data.payment.methods.includes(opt.id)
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                )}
              >
                <span>{opt.icon}</span>
                {opt.label}
                {data.payment.methods.includes(opt.id) && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />
                )}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nota adicional sobre pagos (opcional)</Label>
            <Input
              value={data.payment.notes}
              onChange={e => setData(d => ({ ...d, payment: { ...d.payment, notes: e.target.value } }))}
              placeholder="Ej: Solo se acepta transferencia para citas de domingo"
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 6: Follow-up Post-Consulta ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-teal-500" />
            Follow-up Automático Post-Consulta
          </CardTitle>
          <CardDescription className="text-xs">
            El sistema enviará este mensaje automáticamente a las {data.followUp.delayHours} horas de la consulta para saber cómo sigue el paciente e invitar a dejar una reseña.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Activar envío automático</div>
              <div className="text-xs text-muted-foreground">Requiere que el paciente tenga teléfono del tutor registrado.</div>
            </div>
            <Switch
              checked={data.followUp.enabled}
              onCheckedChange={v => setData(d => ({ ...d, followUp: { ...d.followUp, enabled: v } }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Horas después de la consulta</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={data.followUp.delayHours}
                onChange={e => setData(d => ({ ...d, followUp: { ...d.followUp, delayHours: Number(e.target.value) } }))}
                className="text-xs w-28"
              />
              <p className="text-[10px] text-muted-foreground">Recomendado: 24 horas</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Star className="h-3 w-3 text-yellow-500" />
                URL de reseña Google
              </Label>
              <Input
                value={data.followUp.googleReviewUrl}
                onChange={e => setData(d => ({ ...d, followUp: { ...d.followUp, googleReviewUrl: e.target.value } }))}
                placeholder="https://g.page/r/..."
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mensaje de follow-up</Label>
            <Textarea
              rows={8}
              value={data.followUp.template}
              onChange={e => setData(d => ({ ...d, followUp: { ...d.followUp, template: e.target.value } }))}
              className="font-mono text-xs"
              placeholder="Hola {{tutor}} 👋..."
            />
            <div className="flex flex-wrap gap-1.5">
              {['{{tutor}}', '{{paciente}}', '{{doctor}}', '{{reviewUrl}}'].map(v => (
                <Badge key={v} variant="outline" className="text-[10px] font-mono cursor-pointer hover:bg-muted"
                  onClick={() => setData(d => ({ ...d, followUp: { ...d.followUp, template: d.followUp.template + v } }))}
                >
                  {v}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Variables disponibles: <code>{'{{tutor}}'}</code> nombre del padre/tutor, <code>{'{{paciente}}'}</code> nombre del niño, <code>{'{{doctor}}'}</code> nombre del bot/doctor, <code>{'{{reviewUrl}}'}</code> link de Google.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 6b: Reglas del Bot ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-purple-500" />
            Reglas y Políticas para el Bot
          </CardTitle>
          <CardDescription className="text-xs">
            Instrucciones especiales que Sof-IA siempre seguirá. Ej: políticas de pago, excepciones de precio, restricciones de horario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            value={data.botRules}
            onChange={e => setData(d => ({ ...d, botRules: e.target.value }))}
            placeholder={`Ej:\n- Solo se acepta efectivo y transferencia, NUNCA menciones tarjeta.\n- Los domingos la consulta tiene un costo adicional de $300 sobre el precio de semana.\n- Si preguntan por vacunas, aclarar que el costo de la aplicación es aparte del biológico.`}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      {/* ── Card 7: Información Adicional ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-amber-500" />
            Información Adicional
          </CardTitle>
          <CardDescription className="text-xs">
            FAQs, información extra, políticas o cualquier dato que el bot deba conocer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={6}
            value={data.extra}
            onChange={e => setData(d => ({ ...d, extra: e.target.value }))}
            placeholder="Ej: Si el paciente es menor de 1 mes, es considerado recién nacido y la tarifa aplica diferente..."
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      {/* ── Vista Previa ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Vista previa para el bot</CardTitle>
              <CardDescription className="text-xs">
                Así leerá Sof-IA la base de conocimiento cada vez que responda.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(p => !p)}
              className="gap-1.5 text-xs"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPreview ? 'Ocultar' : 'Ver preview'}
            </Button>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <pre className="text-xs font-mono bg-gray-50 rounded-lg p-4 whitespace-pre-wrap border overflow-auto max-h-96">
              {buildKnowledgeString(data)}
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
