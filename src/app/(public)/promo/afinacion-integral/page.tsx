
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, X, MessageSquare, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Afinación Integral $1,999 en Aguascalientes | Ranoro Taller',
  description: 'Promoción de afinación integral por $1,999. Incluye cambio de bujías, limpieza de inyectores y más. ¡Agenda hoy mismo por WhatsApp!',
};

const whatsappLink = "https://wa.me/524493930914?text=Hola%2C%20quisiera%20agendar%20la%20promoción%20de%20afinación%20integral%20por%20%241%2C999.";

const includedItems = [
  "Aceite Raloy Mineral para motor",
  "Bujías de cobre Champion / NGK (hasta 4)",
  "Filtro de aceite y aire",
  "Filtro de gasolina externo",
  "Lavado de inyectores por ultrasonido y laboratorio",
  "Lavado y calibración del cuerpo de aceleración no electrónico",
  "Lavado de válvula PCV y IAC",
  "Escaneo y borrado de códigos",
  "Relleno de líquidos",
  "Revisión de 26 puntos de seguridad",
  "Transporte Uber de cortesía (ida o vuelta)",
];

const notIncludedItems = [
  "Bujías de platino o iridio (disponibles con costo extra)",
  "Filtro de combustible interno (dentro del tanque)",
  "Reparación de fallas electrónicas o mecánicas encontradas durante el escaneo",
  "Servicio para motores con turbo, GDI, V6 u V8 (requiere cotización especial)",
];

const faqItems = [
  { question: "¿Por qué mi auto hace ruidos extraños?", answer: "Puede ser desde una banda floja hasta problemas en la suspensión. Una afinación ayuda a detectar y prevenir muchos de estos ruidos al revisar los componentes del motor." },
  { question: "¿Es normal que salga humo del escape?", answer: "El humo azul indica quema de aceite, el negro una mezcla rica de combustible, y el blanco vapor de agua o refrigerante. La afinación ayuda a corregir problemas de mezcla de combustible." },
  { question: "¿Por qué mi auto gasta más gasolina?", answer: "Un motor mal afinado es menos eficiente. Inyectores sucios, bujías gastadas o un filtro de aire tapado aumentan el consumo de combustible." },
  { question: "Se prendió la luz de Check Engine, ¿qué hago?", answer: "Esta luz indica una falla detectada por la computadora. Nuestro escaneo OBD-II lee el código de error para diagnosticar el problema exacto, que puede o no estar relacionado con la afinación." },
];

export default function TuneUpPromoPage() {
  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
             <div className="relative h-48 md:h-64 w-full overflow-hidden rounded-t-xl">
              <Image
                src="https://picsum.photos/seed/tuneup/1200/400"
                alt="Motor de coche durante afinación"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                data-ai-hint="car engine tune-up"
                priority
              />
            </div>
            <CardHeader className="text-center p-6">
              <p className="text-base font-semibold text-primary tracking-wide uppercase">Devuélvele la Potencia</p>
              <CardTitle className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Afinación Integral <span className="text-primary">desde $1,999</span>
              </CardTitle>
              <CardDescription className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                Recupera la eficiencia y suavidad de tu motor con un mantenimiento completo. Duración aproximada: 4-5 horas.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-green-600">Incluye:</h3>
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
                  <h3 className="text-lg font-semibold mb-4 text-red-600">No Incluye (se cotiza por separado):</h3>
                  <ul className="space-y-3">
                    {notIncludedItems.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

               <div className="mt-8 text-center">
                <Button size="lg" asChild className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white text-lg">
                  <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="mr-3 h-6 w-6"/> Agendar Afinación
                  </Link>
                </Button>
              </div>

              <div className="mt-12 border-t pt-8">
                <h3 className="text-xl font-semibold text-center mb-6">Preguntas Frecuentes</h3>
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent>{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
