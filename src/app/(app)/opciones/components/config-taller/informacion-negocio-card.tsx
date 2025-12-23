
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { capitalizeWords } from '@/lib/utils';

interface InfoGeneralCardProps {
  watchedLogoUrl: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const InfoGeneralCard: React.FC<InfoGeneralCardProps> = ({
  watchedLogoUrl,
  fileInputRef,
  isUploading,
  onFileChange,
}) => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building />
          Información General y Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-48 h-16 flex-shrink-0 bg-muted/50 rounded-md flex items-center justify-center border relative">
            {watchedLogoUrl ? (
              <Image src={watchedLogoUrl} alt="Logo del Taller" fill style={{ objectFit: 'contain' }} sizes="192px" />
            ) : (
              <p className="text-xs text-muted-foreground">Sin logo</p>
            )}
          </div>
          <div className="w-full">
            <FormLabel>Subir/Cambiar Logo</FormLabel>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
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
              ref={fileInputRef as any}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              onChange={onFileChange}
            />
          </div>
        </div>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Taller</FormLabel>
              <FormControl>
                <Input {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono de Contacto</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Calle, Número, Colonia, C.P." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="googleMapsUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Google Maps (Opcional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://maps.app.goo.gl/..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
