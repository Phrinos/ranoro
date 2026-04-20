import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, UploadCloud, Loader2, MapPin, Phone } from 'lucide-react';
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
    <Card className="overflow-hidden border-border/50 shadow-xs transition-all hover:shadow-md">
      <CardHeader className="bg-linear-to-r from-muted/50 to-muted/10 border-b border-border/50 pb-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Perfil del Taller
        </CardTitle>
        <CardDescription>Esta información será visible en los tickets y cotizaciones que imprimas.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* LOGO SECTION */}
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start p-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
          <div className="w-32 h-32 shrink-0 bg-white dark:bg-black rounded-2xl flex items-center justify-center border shadow-xs relative overflow-hidden group">
            {watchedLogoUrl ? (
              <Image src={watchedLogoUrl} alt="Logo del Taller" fill style={{ objectFit: 'contain', padding: '8px' }} sizes="128px" className="transition-transform group-hover:scale-105 duration-300" />
            ) : (
              <div className="text-center w-full">
                 <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-1" />
                 <p className="text-[10px] uppercase font-bold text-muted-foreground/50">Sin logo</p>
              </div>
            )}
          </div>
          
          <div className="flex-1 w-full text-center sm:text-left pt-2">
            <h3 className="font-semibold text-base mb-1">Identidad Visual</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Sube un logo (recomendado formato apaisado .png transparente).
            </p>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full sm:w-auto font-medium"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {isUploading ? 'Subiendo...' : 'Actualizar Logo'}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              onChange={onFileChange}
            />
          </div>
        </div>

        {/* INPUTS SECTION */}
        <div className="space-y-4 pt-2">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Razón Social o Nombre</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                    <Input className="pl-9 h-10" placeholder="Automotriz XYZ" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Teléfono Principal</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input className="pl-9 h-10" placeholder="(555) 000-0000" {...field} />
                    </div>
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
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Dirección</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input className="pl-9 h-10" placeholder="Calle, Num, Col." {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="googleMapsUrl"
            render={({ field }) => (
              <FormItem className="pt-2">
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">URL de Google Maps</FormLabel>
                <FormControl>
                  <Input type="url" className="h-10 text-primary" placeholder="https://maps.app.goo.gl/..." {...field} value={field.value ?? ''} />
                </FormControl>
                <p className="text-[11px] text-muted-foreground mt-1">Si proporcionas este enlace, los tickets digitales tendrán un botón hacia tu ubicación.</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
