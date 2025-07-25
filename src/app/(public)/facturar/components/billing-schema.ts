
import { z } from 'zod';
import { regimesFisica, regimesMoral, detectarTipoPersona } from '@/lib/sat-catalogs';

export const billingFormSchema = z.object({
  rfc: z.string()
    .trim()
    .min(12, { message: 'El RFC debe tener entre 12 y 13 caracteres.' })
    .max(13, { message: 'El RFC debe tener entre 12 y 13 caracteres.' }),

  name: z.string().min(1, { message: 'El nombre o razón social es requerido.' }),
  email: z.string().email({ message: 'Correo inválido.' }),
  
  address: z.object({
    zip: z.string().length(5, { message: 'El código postal debe tener 5 dígitos.' }),
  }),

  taxSystem: z.string()
    .trim()
    .min(1, { message: 'Debe seleccionar un régimen fiscal.'}),

  cfdiUse: z.string().min(1, { message: 'Seleccione un uso de CFDI.' }),
  
}).superRefine((data, ctx) => {
    const { rfc, taxSystem } = data;

    if (!rfc || !taxSystem) return;
    
    const tipoPersona = detectarTipoPersona(rfc);

    if (tipoPersona === 'invalido') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `El formato del RFC no es válido.`,
            path: ['rfc'],
        });
        return;
    }

    if (tipoPersona === 'moral') {
        if (!regimesMoral.includes(taxSystem)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `El régimen fiscal no es válido para persona moral.`,
                path: ['taxSystem'],
            });
        }
    } else if (tipoPersona === 'fisica') {
        if (!regimesFisica.includes(taxSystem)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `El régimen fiscal no es válido para persona física.`,
                path: ['taxSystem'],
            });
        }
    }
});

export type BillingFormValues = z.infer<typeof billingFormSchema>;

