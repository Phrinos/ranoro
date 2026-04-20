import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UserCircle, Briefcase, PhoneCall } from 'lucide-react';

export const ContactoAdicionalCard: React.FC = () => {
  const { control } = useFormContext();

  return (
    <Card className="overflow-hidden border-border/50 shadow-xs transition-all hover:shadow-md h-full">
      <CardHeader className="bg-linear-to-r from-muted/50 to-muted/10 border-b border-border/50 pb-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-primary" />
          Contacto Adicional
        </CardTitle>
        <CardDescription>
          Persona de contacto para notificaciones secundarias o referencias.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <FormField
          control={control}
          name="contactPersonName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Nombre Completo</FormLabel>
              <FormControl>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input className="pl-9 h-10" placeholder="Ej. Juan Pérez" {...field} value={field.value ?? ''} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="contactPersonPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">WhatsApp / Teléfono</FormLabel>
              <FormControl>
                <div className="relative">
                  <PhoneCall className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input className="pl-9 h-10" placeholder="(555) 000-0000" {...field} value={field.value ?? ''} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="contactPersonRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Puesto o Cargo</FormLabel>
              <FormControl>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input className="pl-9 h-10" placeholder="Gerente de Servicio, Jefe de Taller..." {...field} value={field.value ?? ''} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
