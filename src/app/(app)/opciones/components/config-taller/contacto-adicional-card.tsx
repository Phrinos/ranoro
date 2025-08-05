
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react';

export const ContactoAdicionalCard: React.FC = () => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User />
          Contacto Adicional (Opcional)
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
        <FormField
          control={control}
          name="contactPersonName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="contactPersonPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="contactPersonRole"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Puesto</FormLabel>
              <FormControl>
                <Input placeholder="Gerente, Jefe de Taller, etc." {...field} value={field.value ?? ''} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
