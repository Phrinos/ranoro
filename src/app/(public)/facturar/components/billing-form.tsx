
"use client";

import React, { useMemo, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type BillingFormValues } from './billing-schema';
import { taxRegimeLabels, regimesFisica, regimesMoral } from '@/lib/sat-catalogs';

const cfdiUseOptions = [
    { value: 'G01', label: 'G01 - Adquisición de mercancías' },
    { value: 'G03', label: 'G03 - Gastos en general' },
    { value: 'I01', label: 'I01 - Construcciones' },
    { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina' },
    { value: 'I03', label: 'I03 - Equipo de transporte' },
    { value: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
    { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
    { value: 'S01', label: 'S01 - Sin efectos fiscales' },
];

const normalizeText = (text: string) => {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
};

export function BillingForm() {
  const { control, watch, setValue } = useFormContext<BillingFormValues>();
  const rfcValue = watch('rfc');

  const availableRegimes = useMemo(() => {
    if (!rfcValue || (rfcValue.length !== 12 && rfcValue.length !== 13)) {
        return [];
    }
    const rfcType = rfcValue.length === 12 ? 'moral' : 'fisica';
    
    const regimeCodes = rfcType === 'moral' 
      ? regimesMoral
      : regimesFisica;
      
    return regimeCodes
      .map(code => ({ value: code, label: taxRegimeLabels[code] || code }))
      .sort((a,b) => a.label.localeCompare(b.label));

  }, [rfcValue]);
  
  useEffect(() => {
    setValue('taxSystem', '');
  }, [rfcValue, setValue]);

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="rfc"
        render={({ field }) => (
          <FormItem>
            <FormLabel>RFC</FormLabel>
            <FormControl>
              <Input
                placeholder="XAXX010101000"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(normalizeText(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre o Razón Social</FormLabel>
            <FormControl>
              <Input
                placeholder="Nombre completo o razón social"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(normalizeText(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Correo Electrónico</FormLabel>
            <FormControl>
              <Input type="email" placeholder="correo@ejemplo.com" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={control}
        name="address.zip"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código Postal</FormLabel>
            <FormControl>
              <Input placeholder="20000" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="taxSystem"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Régimen Fiscal</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={availableRegimes.length === 0}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Seleccione su régimen fiscal..." />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {availableRegimes.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="cfdiUse"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Uso de CFDI</FormLabel>
             <Select onValueChange={field.onChange} defaultValue={field.value ?? ''}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Seleccione un uso de CFDI..." />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {cfdiUseOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
