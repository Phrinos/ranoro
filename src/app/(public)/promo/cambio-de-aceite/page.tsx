
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, MessageSquare, Plus } from 'lucide-react';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Cambio de aceite $799 en Aguascalientes | Ranoro Taller',
  description: 'Promoción de cambio de aceite y filtro por $799. Incluye aceite semisintético 5W-30, filtro estándar y revisión de 15 puntos. ¡Agenda hoy!',
};

const whatsappLink = "https://wa.me/524493930914?text=Hola%2C%20quisiera%20agendar%20la%20promoción%20de%20cambio%20de%20aceite%20por%20%24799.";

const includedItems = [
  "Hasta 4 litros de aceite semisintético 5W-30",
  "Filtro de aceite estándar",
  "Revisión de 15 puntos de seguridad",
  "Reseteo de indicador de servicio (si aplica)",
];

const upsellItems = [
  { name: "Filtro de Cabina", description: "Mejora la calidad del aire dentro de tu auto." },
  { name: "Cambio de Líquido de Frenos", description: "Esencial para la seguridad de tu frenado." },
  { name: "Alineación y Balanceo", description: "Prolonga la vida de tus llantas y mejora la conducción." },
];

export default function OilChangePromoPage() {
  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg">
            <div className="relative h-48 md:h-64 w-full overflow-hidden rounded-t-xl">
              <Image
                src="https://picsum.photos/seed/oilchange/1200/400"
                alt="Cambio de aceite profesional"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                data-ai-hint="oil change engine"
                priority
              />
            </div>
            <CardHeader className="text-center p-6">
              <p className="text-base font-semibold text-primary tracking-wide uppercase">Promoción Especial</p>
              <CardTitle className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Cambio de Aceite <span className="text-primary">$799</span>
              </CardTitle>
              <CardDescription className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                Mantén tu motor en perfectas condiciones con nuestro servicio profesional. Duración aproximada: 45-60 min.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">¿Qué incluye?</h3>
                  <ul className="space-y-3">
                    {includedItems.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Condiciones</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">▸</span>
                      <span className="text-muted-foreground">Aplica para vehículos de 4 cilindros de aspiración natural (sedanes, hatchbacks).</span>
                    </li>
                     <li className="flex items-start">
                      <span className="text-primary mr-2">▸</span>
                      <span className="text-muted-foreground">Aceite totalmente sintético, litros adicionales o filtros premium tienen costo extra.</span>
                    </li>
                     <li className="flex items-start">
                      <span className="text-primary mr-2">▸</span>
                      <span className="text-muted-foreground">SUVs y motores mayores pueden aplicar cargos adicionales.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Button size="lg" asChild className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white text-lg">
                  <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    Agendar por WhatsApp
                  </Link>
                </Button>
              </div>

              <div className="mt-12 border-t pt-8">
                 <h3 className="text-xl font-semibold text-center mb-6">Aprovecha y añade a tu servicio</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {upsellItems.map((item) => (
                        <Card key={item.name} className="bg-muted/50 text-center">
                            <CardContent className="p-4">
                                <Plus className="mx-auto h-8 w-8 text-primary mb-2"/>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
