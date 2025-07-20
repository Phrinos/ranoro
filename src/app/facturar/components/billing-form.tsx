
"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type BillingFormValues, billingFormSchema } from '@/schemas/billing-form';

const cfdiUseOptions = [
    { value: 'G01', label: 'G01 - Adquisición de mercancías' },
    { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
    { value: 'G03', label: 'G03 - Gastos en general' },
    { value: 'I01', label: 'I01 - Construcciones' },
    { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina por inversiones' },
    { value: 'I03', label: 'I03 - Equipo de transporte' },
    { value: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
    { value: 'I05', label: 'I05 - Dados, troqueles, moldes, matrices y herramental' },
    { value: 'I06', label: 'I06 - Comunicaciones telefónicas' },
    { value: 'I07', label: 'I07 - Comunicaciones satelitales' },
    { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
    { value: 'D01', label: 'D01 - Honorarios médicos, dentales y gastos hospitalarios' },
    { value: 'D02', label: 'D02 - Gastos médicos por incapacidad o discapacidad' },
    { value: 'D03', label: 'D03 - Gastos funerales' },
    { value: 'D04', label: 'D04 - Donativos' },
    { value: 'D05', label: 'D05 - Intereses reales efectivamente pagados por créditos hipotecarios' },
    { value: 'D06', label: 'D06 - Aportaciones voluntarias al SAR' },
    { value: 'D07', label: 'D07 - Primas por seguros de gastos médicos' },
    { value: 'D08', label: 'D08 - Gastos de transportación escolar obligatoria' },
    { value: 'D09', label: 'D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
    { value: 'D10', label: 'D10 - Pagos por servicios educativos (colegiaturas)' },
    { value: 'S01', label: 'S01 - Sin efectos fiscales' },
    { value: 'CP01', label: 'CP01 - Pagos' },
    { value: 'CN01', label: 'CN01 - Nómina' },
];

const taxRegimeOptions = [
    { value: '601', label: '601 - General de Ley Personas Morales' },
    { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
    { value: '605', label: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { value: '606', label: '606 - Arrendamiento' },
    { value: '607', label: '607 - Régimen de Enajenación o Adquisición de Bienes' },
    { value: '608', label: '608 - Demás ingresos' },
    { value: '610', label: '610 - Residentes en el Extranjero sin Establecimiento Permanente en México' },
    { value: '611', label: '611 - Dividendos (socios y accionistas)' },
    { value: '612', label: '612 - Personas Físicas con Actividades Empresariales y Profesionales' },
    { value: '614', label: '614 - Ingresos por intereses' },
    { value: '615', label: '615 - Régimen de los Ingresos por Obtención de Premios' },
    { value: '616', label: '616 - Sin obligaciones fiscales' },
    { value: '621', label: '621 - Incorporación Fiscal' },
    { value: '625', label: '625 - Régimen de las Actividades Empresariales con Ingresos a través de Plataformas Tecnológicas' },
    { value: '626', label: '626 - Régimen Simplificado de Confianza' },
];

export { billingFormSchema };

export function BillingForm() {
  const { control } = useFormContext<BillingFormValues>();

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="rfc"
        render={({ field }) => (
          <FormItem>
            <FormLabel>RFC</FormLabel>
            <FormControl>
              <Input placeholder="XAXX010101000" {...field} />
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
              <Input placeholder="Nombre completo o razón social" {...field} />
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
              <Input type="email" placeholder="correo@ejemplo.com" {...field} />
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
              <Input placeholder="20000" {...field} />
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
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Seleccione su régimen fiscal..." />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {taxRegimeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
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
             <Select onValueChange={field.onChange} defaultValue={field.value}>
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
