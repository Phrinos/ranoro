
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const messagingConfigSchema = z.object({
  apiKey: z.string().optional(),
  endpointUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
  
  appointmentConfirmationEnabled: z.boolean().default(false),
  appointmentConfirmationTemplate: z.string().optional(),
  
  appointmentReminderEnabled: z.boolean().default(false),
  appointmentReminderTemplate: z.string().optional(),
  
  nextServiceReminderEnabled: z.boolean().default(false),
  nextServiceReminderTemplate: z.string().optional(),
  
  serviceLinkEnabled: z.boolean().default(true),
  serviceLinkTemplate: z.string().optional(),
});

type MessagingConfigValues = z.infer<typeof messagingConfigSchema>;

const LOCALSTORAGE_KEY = 'messagingConfig';

export default function MensajeriaPage() {
  const { toast } = useToast();

  const form = useForm<MessagingConfigValues>({
    resolver: zodResolver(messagingConfigSchema),
    defaultValues: {
      appointmentConfirmationEnabled: true,
      appointmentConfirmationTemplate: "Hola {cliente}, te confirmamos tu cita para el vehículo {vehiculo} el día {fecha}. ¡Te esperamos en {taller}!",
      appointmentReminderEnabled: true,
      appointmentReminderTemplate: "Hola {cliente}, te recordamos tu cita en {taller} para tu vehículo {vehiculo} mañana a las {hora}. ¡No faltes!",
      nextServiceReminderEnabled: true,
      nextServiceReminderTemplate: "Hola {cliente}, según nuestros registros, tu {vehiculo} necesita su próximo servicio. Agenda tu cita en {taller} para mantenerlo en óptimas condiciones.",
      serviceLinkEnabled: true,
      serviceLinkTemplate: "Hola {cliente}, aquí tienes el enlace para ver los detalles de tu servicio en {taller} para el vehículo {vehiculo}: {link}",
    },
  });

  useEffect(() => {
    const storedConfig = localStorage.getItem(LOCALSTORAGE_KEY);
    if (storedConfig) {
      try {
        form.reset(JSON.parse(storedConfig));
      } catch (e) {
        console.error("Failed to parse messaging config from localStorage", e);
      }
    }
  }, [form]);

  const onSubmit = (data: MessagingConfigValues) => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      toast({
        title: "Configuración Guardada",
        description: "Tus preferencias de mensajería han sido actualizadas.",
      });
    } catch (error) {
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la configuración en el almacenamiento local.",
        variant: "destructive",
      });
    }
  };

  const renderTemplateCard = (
    fieldId: keyof MessagingConfigValues,
    templateId: keyof MessagingConfigValues,
    title: string,
    description: string,
    variables: string[]
  ) => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <FormField
            control={form.control}
            name={fieldId}
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value as boolean}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">{field.value ? 'Activado' : 'Desactivado'}</FormLabel>
              </FormItem>
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name={templateId}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plantilla del Mensaje</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Escribe tu mensaje aquí..."
                  {...field}
                  value={field.value as string || ''}
                  rows={4}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold">Variables disponibles:</p>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {variables.map(v => <code key={v} className="bg-muted px-1 py-0.5 rounded">{v}</code>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Mensajería Automatizada"
        description="Configura la API de WhatsApp y personaliza los mensajes automáticos para tus clientes."
      />
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de API</CardTitle>
              <CardDescription>
                Ingresa las credenciales de tu proveedor de API de WhatsApp Business.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key / Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Pega tu API Key aquí" {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endpointUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.tuproveedor.com/send" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xl font-semibold">Plantillas de Mensajes</AccordionTrigger>
              <AccordionContent className="pt-4 space-y-6">
                {renderTemplateCard(
                  "appointmentConfirmationEnabled",
                  "appointmentConfirmationTemplate",
                  "Confirmación de Cita",
                  "Se envía cuando una cita es agendada.",
                  ["{cliente}", "{vehiculo}", "{fecha}", "{hora}", "{taller}"]
                )}
                {renderTemplateCard(
                  "appointmentReminderEnabled",
                  "appointmentReminderTemplate",
                  "Recordatorio de Cita",
                  "Se envía 24 horas antes de la cita agendada.",
                  ["{cliente}", "{vehiculo}", "{fecha}", "{hora}", "{taller}"]
                )}
                {renderTemplateCard(
                  "nextServiceReminderEnabled",
                  "nextServiceReminderTemplate",
                  "Recordatorio de Próximo Servicio",
                  "Se envía cuando se acerca la fecha del próximo servicio recomendado.",
                  ["{cliente}", "{vehiculo}", "{fecha_proxima}", "{km_proximo}", "{taller}"]
                )}
                {renderTemplateCard(
                  "serviceLinkEnabled",
                  "serviceLinkTemplate",
                  "Envío de Orden de Servicio/Cotización",
                  "Mensaje para compartir el enlace público del documento.",
                  ["{cliente}", "{vehiculo}", "{link}", "{taller}"]
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="flex justify-end">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Guardar Configuración
            </Button>
          </div>
        </form>
      </FormProvider>
    </>
  );
}

