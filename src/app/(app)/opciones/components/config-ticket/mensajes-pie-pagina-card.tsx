
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { TextFieldWithBoldness } from './text-field-with-boldness';

interface MensajesPiePaginaCardProps {
  defaultFooterFontSize: number;
}

export const MensajesPiePaginaCard: React.FC<MensajesPiePaginaCardProps> = ({ defaultFooterFontSize }) => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensajes de Pie de Página</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <TextFieldWithBoldness name="footerLine1" label="Línea de Agradecimiento" control={control} />
        <TextFieldWithBoldness name="footerLine2" label="Línea de Contacto" control={control} />
        <FormField
          control={control}
          name="footerFontSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tamaño Fuente (Pie): {field.value ?? defaultFooterFontSize}px</FormLabel>
              <FormControl>
                <Slider
                  value={[field.value ?? defaultFooterFontSize ?? 10]}
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
