
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const LOCALSTORAGE_KEY = 'workshopTicketInfo';

const defaultWorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
};

const ticketConfigSchema = z.object({
  name: z.string().min(1, "El nombre del taller es obligatorio."),
  phone: z.string().min(7, "El teléfono debe tener al menos 7 dígitos."),
  addressLine1: z.string().min(5, "La dirección (línea 1) es obligatoria."),
  addressLine2: z.string().optional(),
  cityState: z.string().min(3, "La ciudad/estado es obligatoria."),
});

type TicketConfigFormValues = z.infer<typeof ticketConfigSchema>;

export default function ConfiguracionTicketPage() {
  const { toast } = useToast();

  const form = useForm<TicketConfigFormValues>({
    resolver: zodResolver(ticketConfigSchema),
    defaultValues: defaultWorkshopInfo,
  });

  useEffect(() => {
    const storedInfo = localStorage.getItem(LOCALSTORAGE_KEY);
    if (storedInfo) {
      try {
        const parsedInfo = JSON.parse(storedInfo);
        form.reset(parsedInfo);
      } catch (e) {
        console.error("Failed to parse workshop info from localStorage", e);
        form.reset(defaultWorkshopInfo);
      }
    }
  }, [form]);

  const onSubmit = (data: TicketConfigFormValues) => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      toast({
        title: "Configuración Guardada",
        description: "La información del ticket ha sido actualizada.",
      });
    } catch (e) {
      console.error("Failed to save workshop info to localStorage", e);
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la configuración. Verifique los permisos de localStorage.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Configuración de Ticket"
        description="Personaliza la información que aparece en los tickets impresos."
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Información del Taller en el Ticket</CardTitle>
          <CardDescription>
            Estos datos se mostrarán en la cabecera de todos los tickets de venta y servicio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Taller</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección (Línea 1)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección (Línea 2 - Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cityState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad, Estado (y C.P.)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
