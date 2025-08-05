
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';

interface EstiloTextoTicketCardProps {
  defaultBodyFontSize: number;
  defaultItemsFontSize: number;
  defaultTotalsFontSize: number;
}

export const EstiloTextoTicketCard: React.FC<EstiloTextoTicketCardProps> = ({
  defaultBodyFontSize,
  defaultItemsFontSize,
  defaultTotalsFontSize,
}) => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estilo del Texto del Ticket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <FormField
          control={control}
          name="bodyFontSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tamaño Fuente (Cuerpo): {field.value ?? defaultBodyFontSize}px</FormLabel>
              <FormControl>
                <Slider
                  value={[field.value ?? defaultBodyFontSize ?? 10]}
                  onValueChange={(value) => field.onChange(value[0])}
                  min={8}
                  max={16}
                  step={1}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="itemsFontSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tamaño Fuente (Artículos): {field.value ?? defaultItemsFontSize}px</FormLabel>
              <FormControl>
                <Slider
                  value={[field.value ?? defaultItemsFontSize ?? 10]}
                  onValueChange={(value) => field.onChange(value[0])}
                  min={8}
                  max={16}
                  step={1}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="totalsFontSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tamaño Fuente (Totales): {field.value ?? defaultTotalsFontSize}px</FormLabel>
              <FormControl>
                <Slider
                  value={[field.value ?? defaultTotalsFontSize ?? 10]}
                  onValueChange={(value) => field.onChange(value[0])}
                  min={8}
                  max={16}
                  step={1}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
