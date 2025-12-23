
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Upload, Loader2 } from 'lucide-react';

interface HeaderLogoCardProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  defaultLogoWidth: number;
}

export const HeaderLogoCard: React.FC<HeaderLogoCardProps> = ({
  fileInputRef,
  isUploading,
  handleImageUpload,
  defaultLogoWidth,
}) => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Encabezado y Logo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <FormField
          control={control}
          name="blankLinesTop"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Líneas en Blanco (Arriba)</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={10} {...field} value={field.value ?? 0} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Subir Logo</FormLabel>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? 'Subiendo...' : 'Seleccionar Imagen'}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleImageUpload}
          />
          <FormDescription>El logo se guarda y actualiza en la vista previa.</FormDescription>
        </FormItem>
        <FormField
          control={control}
          name="logoWidth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ancho del Logo: {field.value ?? defaultLogoWidth}px</FormLabel>
              <FormControl>
                <Slider
                  value={[field.value ?? defaultLogoWidth ?? 120]}
                  onValueChange={(value) => field.onChange(value[0])}
                  min={40}
                  max={250}
                  step={5}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
