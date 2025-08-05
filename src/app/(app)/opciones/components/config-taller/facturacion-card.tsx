
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const FacturacionCard: React.FC = () => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">Configuración de Facturación (Factura.com)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <FormField
          control={control}
          name="facturaComApiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Tu API Key de Factura.com" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="facturaComApiSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Secret (Opcional)</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Tu API Secret" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="facturaComBillingMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modo de Facturación</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? 'test'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="test">Pruebas (Sandbox)</SelectItem>
                  <SelectItem value="live">Producción (Live)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
