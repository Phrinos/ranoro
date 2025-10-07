
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { TextFieldWithBoldness } from './text-field-with-boldness';

interface InformacionNegocioCardProps {
  defaultHeaderFontSize: number;
}

export const InformacionNegocioCard: React.FC<InformacionNegocioCardProps> = ({ defaultHeaderFontSize }) => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Negocio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <TextFieldWithBoldness name="name" label="Nombre del Taller" control={control} />
        <TextFieldWithBoldness name="phone" label="Teléfono" control={control} />
        <TextFieldWithBoldness name="addressLine1" label="Dirección (Línea 1)" control={control} />
        <TextFieldWithBoldness name="addressLine2" label="Dirección (Línea 2)" control={control} />
        <TextFieldWithBoldness name="cityState" label="Ciudad, Estado, C.P." control={control} />
        <FormField
          control={control}
          name="headerFontSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tamaño Fuente (Encabezado): {field.value ?? defaultHeaderFontSize}px</FormLabel>
              <FormControl>
                <Slider
                  value={[field.value ?? defaultHeaderFontSize]}
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
