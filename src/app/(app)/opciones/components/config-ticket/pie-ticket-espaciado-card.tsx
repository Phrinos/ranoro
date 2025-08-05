
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TextFieldWithBoldness } from './text-field-with-boldness';

export const PieTicketEspaciadoCard: React.FC = () => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pie de Ticket y Espaciado Final</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <TextFieldWithBoldness name="fixedFooterText" label="Texto Final" control={control} isTextarea />
        <FormField
          control={control}
          name="blankLinesBottom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Líneas en Blanco (Abajo)</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={10} {...field} value={field.value ?? 0} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
