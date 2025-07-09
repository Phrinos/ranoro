"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from '@/types';
import { Save, Signature, BookOpen, LayoutDashboard, Wrench, FileText, Receipt, Package, DollarSign, Users, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, storage } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { placeholderUsers, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import Image from "next/legacy/image";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


// --- Schema and content from /perfil ---
const profileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  signatureDataUrl: z.string().optional(),
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().optional().or(z.literal('')),
  confirmNewPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.newPassword || data.currentPassword) {
      if(!data.newPassword || data.newPassword.length < 6) return false;
      if(data.newPassword !== data.confirmNewPassword) return false;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden o la nueva contraseña tiene menos de 6 caracteres.",
  path: ["confirmNewPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function PerfilPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '', email: '', phone: '', signatureDataUrl: '',
      currentPassword: '', newPassword: '', confirmNewPassword: '',
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
            if (authUserString) {
                const user: User = JSON.parse(authUserString);
                setCurrentUser(user);
                form.reset({
                  name: user.name,
                  email: user.email,
                  phone: user.phone || '',
                  signatureDataUrl: user.signatureDataUrl || '',
                });
            } else { router.push('/login'); }
        } else { router.push('/login'); }
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [form, router]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser || !auth.currentUser) return toast({ title: "Error", description: "No se ha encontrado un usuario autenticado.", variant: "destructive" });

    if (data.newPassword && data.currentPassword) {
      try {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);
        toast({ title: "Contraseña Actualizada" });
      } catch (error) {
        toast({ title: "Error de Contraseña", description: "La contraseña actual es incorrecta o hubo otro error.", variant: "destructive" });
        return;
      }
    }

    const userIndex = placeholderUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return toast({ title: "Error", description: "No se pudo encontrar tu perfil.", variant: "destructive" });

    const updatedUser: User = { ...placeholderUsers[userIndex], name: data.name, phone: data.phone || undefined, signatureDataUrl: data.signatureDataUrl || undefined };

    if (data.signatureDataUrl && data.signatureDataUrl.startsWith('data:image')) {
        if (!storage) return toast({ title: "Error de Almacenamiento", variant: "destructive" });
        try {
            const signatureRef = ref(storage, `user-signatures/${currentUser.id}.png`);
            await uploadString(signatureRef, data.signatureDataUrl, 'data_url');
            updatedUser.signatureDataUrl = await getDownloadURL(signatureRef);
        } catch (e) { console.error("Error uploading signature:", e); toast({ title: "Error de Subida", variant: "destructive" }); }
    }
    
    placeholderUsers[userIndex] = updatedUser; 

    try {
        await persistToFirestore(['users']);
        localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(updatedUser));
        setCurrentUser(updatedUser); 
        toast({ title: "Perfil Actualizado" });
        form.reset({ ...form.getValues(), name: data.name, phone: data.phone || '', signatureDataUrl: updatedUser.signatureDataUrl || '', newPassword: '', confirmNewPassword: '', currentPassword: '' });
    } catch (e) { toast({ title: "Error de Guardado", variant: "destructive" }); }
  };

  if (isLoading) return <div className="text-center">Cargando perfil...</div>;
  if (!currentUser) return <div className="text-center">Usuario no autenticado.</div>;

  return (
    <>
      <PageHeader title="Mi Perfil" description="Actualiza tu información personal y de acceso."/>
      <Card className="max-w-2xl mx-auto shadow-lg"><CardHeader><CardTitle>Editar Información</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormDescription>El correo electrónico no se puede cambiar.</FormDescription><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <Card className="pt-4 mt-4 border-dashed"><CardContent className="space-y-2"><FormLabel>Firma del Asesor</FormLabel><FormDescription>Esta firma se usará en los documentos generados.</FormDescription><div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">{form.watch('signatureDataUrl') ? <Image src={form.watch('signatureDataUrl')!} alt="Firma guardada" width={250} height={125} style={{ objectFit: 'contain' }}/> : <span className="text-sm text-muted-foreground">No hay firma.</span>}</div><Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full"><Signature className="mr-2 h-4 w-4" />{form.watch('signatureDataUrl') ? 'Cambiar Firma' : 'Capturar Firma'}</Button></CardContent></Card>
              <CardDescription className="pt-6">Cambiar contraseña (dejar en blanco para no modificar)</CardDescription>
              <FormField control={form.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Contraseña Actual</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="confirmNewPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormMessage /></FormItem>)}/>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <SignatureDialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen} onSave={(signature) => { form.setValue('signatureDataUrl', signature, { shouldDirty: true }); setIsSignatureDialogOpen(false); toast({ title: 'Firma Capturada' }); }}/>
    </>
  );
}

// --- Content from /manual ---
const manualSections = [ { title: "Panel Principal (Dashboard)", icon: LayoutDashboard, content: (<> <p>El Panel Principal es tu centro de mando, diseñado para darte una visión instantánea y clara del estado de tu taller. Aquí encontrarás KPIs (Indicadores Clave de Rendimiento) y herramientas de IA para optimizar tu día a día.</p> <ul className="list-disc pl-5 mt-2 space-y-2"> <li><strong>Tarjetas de Resumen (KPIs):</strong> En la parte superior, verás datos cruciales actualizados en tiempo real: <ul className="list-disc pl-5 mt-1"> <li><strong>Ingresos del Día:</strong> Suma total de ventas y servicios completados hoy, con la ganancia neta estimada.</li> <li><strong>Servicios Activos:</strong> Cuántos vehículos están actualmente en reparación o agendados para hoy.</li> <li><strong>Alertas de Stock Bajo:</strong> Un contador de los productos que han alcanzado o caído por debajo de su umbral mínimo.</li> <li><strong>Capacidad del Taller (IA):</strong> Una predicción inteligente de qué tan ocupado estará el taller hoy, basada en los servicios agendados y las horas de tus técnicos.</li> </ul> </li> <li><strong>Asistente de Compras con IA:</strong> Esta potente herramienta analiza todos los servicios agendados para el día, determina qué refacciones se necesitarán basándose en el historial y tu inventario actual, y genera una orden de compra consolidada y agrupada por proveedor. Te ahorra el trabajo manual de revisar cada orden de servicio.</li> <li><strong>Gráficos de Rendimiento:</strong> Visualiza el rendimiento de tu taller con gráficos que muestran la comparativa de Ingresos vs. Ganancia de los últimos 6 meses, la distribución de los tipos de servicios más comunes y de dónde provienen tus ingresos (servicios vs. ventas de mostrador).</li> </ul> </>), }, { title: "Módulo de Servicios", icon: Wrench, content: (<> <p>Aquí gestionas todo el ciclo de vida de una reparación, desde la cita inicial hasta la entrega final del vehículo.</p> <ul className="list-disc pl-5 mt-2 space-y-2"> <li><strong>Agenda:</strong> Planifica y visualiza todas las citas. Cuenta con dos vistas: <ul className="list-disc pl-5 mt-1"> <li><strong>Vista de Lista:</strong> Un desglose detallado día por día de todas las citas futuras y pasadas, mostrando la ganancia estimada por día y el análisis de capacidad de la IA para el día actual.</li> <li><strong>Vista de Calendario:</strong> Una vista mensual clásica donde puedes ver las citas marcadas y seleccionar un día para ver los detalles.</li> </ul> </li> <li><strong>Historial:</strong> Un registro completo y detallado de todas las órdenes de servicio. Puedes buscar, filtrar por fecha y ordenar por múltiples criterios. Desde aquí puedes editar cualquier servicio pasado.</li> <li><strong>Crear/Editar Servicio:</strong> Un formulario completo para capturar cada detalle: <ul className="list-disc pl-5 mt-1"> <li><strong>Recepción de Unidad:</strong> Registra datos del vehículo, kilometraje, y observaciones sobre su estado (rayones, golpes) y nivel de combustible.</li> <li><strong>Insumos:</strong> Añade refacciones y mano de obra. La IA puede sugerirte un precio final competitivo y rentable para el servicio completo.</li> <li><strong>Impresión:</strong> Puedes imprimir una &quot;Hoja de Servicio&quot; para control interno en el taller o un &quot;Comprobante de Servicio&quot; para el cliente al finalizar.</li> </ul> </li> </ul> </>), }, { title: "Cotizaciones", icon: FileText, content: ( <> <p>Genera presupuestos profesionales y da seguimiento a tus oportunidades de venta. Este módulo es clave para formalizar tus ofertas y aumentar tu tasa de conversión.</p> <ul className="list-disc pl-5 mt-2 space-y-2"> <li><strong>Crear Cotización con IA:</strong> El sistema es capaz de generar una cotización completa (insumos, mano de obra y precio final) basándose en una simple descripción y el historial de trabajos similares realizados en tu taller.</li> <li><strong>Historial y Seguimiento:</strong> Visualiza todas las cotizaciones con su estado (&quot;Pendiente&quot; o &quot;Ingresado&quot;). Las tarjetas de resumen te muestran el total de cotizaciones, cuántas se han concretado y el valor total que representan.</li> <li><strong>Convertir a Servicio:</strong> Con un solo clic, convierte una cotización aprobada en una Orden de Servicio, transfiriendo automáticamente toda la información y evitando la recaptura.</li> <li><strong>Compartir con el Cliente:</strong> Cada cotización genera un PDF profesional y un enlace público que puedes compartir fácilmente por WhatsApp o correo electrónico.</li> </ul> </> ) }, { title: "Punto de Venta (POS)", icon: Receipt, content: ( <> <p>Una herramienta diseñada para ventas rápidas de mostrador (refacciones, accesorios, etc.) que no requieren una orden de servicio completa.</p> <ul className="list-disc pl-5 mt-2 space-y-2"> <li><strong>Venta Rápida:</strong> Busca y añade productos del inventario de forma ágil. Si un producto no existe, puedes crearlo directamente desde la interfaz de venta sin salir del flujo.</li> <li><strong>Múltiples Métodos de Pago:</strong> Flexibilidad total para tus clientes. Acepta efectivo, tarjeta, transferencia o combinaciones de estos.</li> <li><strong>Generación de Tickets:</strong> Al finalizar la venta, se genera un ticket de compra que puedes imprimir. El inventario se descuenta automáticamente para los productos vendidos.</li> </ul> </>), }, { title: "Inventario", icon: Package, content: ( <> <p>El corazón de tu operación. Un control preciso de tu inventario te ahorra tiempo y dinero.</p> <ul className="list-disc pl-5 mt-2 space-y-2"> <li><strong>Productos y Servicios:</strong> El sistema distingue entre productos físicos (con control de stock, como filtros o aceite) y servicios (sin control de stock, como &quot;Mano de Obra Mecánica&quot;).</li> <li><strong>Análisis de Inventario con IA:</strong> Esta función revisa tu historial de consumo, tu stock actual y los umbrales de stock bajo para darte recomendaciones inteligentes sobre qué artículos necesitas reordenar y en qué cantidad, optimizando tus compras.</li> <li><strong>Ingreso de Compras:</strong> Un flujo sencillo para registrar la llegada de nuevos productos. Busca un artículo existente o crea uno nuevo, introduce la cantidad comprada y actualiza sus precios de costo y venta en un solo paso.</li> <li><strong>Gestión Centralizada:</strong> Administra categorías y proveedores para mantener todo tu inventario organizado y accesible.</li> <li><strong>Impresión Profesional:</strong> Genera una lista de inventario en formato carta, ideal para reportes físicos, que incluye un resumen del valor total de tu stock.</li> </ul> </>), }, { title: "Finanzas", icon: DollarSign, content: ( <> <p>Toma el control de la salud financiera de tu taller con reportes claros y poderosos.</p> <ul className="list-disc pl-5 mt-2 space-y-2"> <li><strong>Reporte de Operaciones:</strong> Es tu herramienta para el día a día. Filtra todas las transacciones (ventas y servicios) por fecha para realizar tu &quot;Corte de Caja&quot; de manera rápida y precisa.</li> <li><strong>Resumen Financiero Mensual:</strong> La vista estratégica de tu negocio. Analiza tus ingresos, costos de insumos, gastos fijos y sueldos para obtener la ganancia neta real de cada mes. Este reporte es crucial para entender la rentabilidad y tomar decisiones a largo plazo.</li> <li><strong>Cálculo de Comisiones:</strong> El sistema calcula automáticamente las comisiones potenciales de tu personal, pero solo las aplica en el resumen financiero si el taller ha sido rentable ese mes (es decir, si la ganancia bruta supera los gastos fijos).</li> <li><strong>Gestión de Gastos Fijos:</strong> Registra tus gastos recurrentes (renta, luz, internet, etc.) para que se incluyan automáticamente en los cálculos de rentabilidad, dándote una visión financiera completa.</li> </ul> </>), }, { title: "Gestión de Staff", icon: Users, content: ( <> <p>Administra la información, roles y rendimiento de todo tu personal, tanto técnico como administrativo.</p> <ul className="list-disc pl-5 mt-2 space-y-2"> <li><strong>Perfiles de Staff:</strong> Mantén un registro detallado de cada empleado, incluyendo su información de contacto, fecha de contratación, salario base y tasa de comisión.</li> <li><strong>Rendimiento Individual:</strong> Analiza el rendimiento de cada miembro del staff en un rango de fechas. Visualiza los ingresos que han generado y las comisiones potenciales que han acumulado, ayudándote a identificar a tu personal más productivo.</li> <li><strong>Separación por Roles:</strong> El sistema distingue entre Staff Técnico y Staff Administrativo, permitiendo una gestión más organizada y cálculos de rendimiento específicos para cada área.</li> </ul> </> ) }, { title: "Administración del Sistema", icon: Settings, content: ( <> <p>Configuraciones avanzadas para adaptar la plataforma a tus necesidades (acceso restringido a roles de administrador).</p> <ul className="list-disc pl-5 mt-2 space-y-2"> <li><strong>Gestión de Usuarios:</strong> Crea, edita o elimina las cuentas de usuario. La creación de la cuenta de correo y contraseña se hace en la consola de Firebase para mayor seguridad.</li> <li><strong>Roles y Permisos:</strong> Define qué puede hacer cada tipo de usuario. Crea roles personalizados (ej. &quot;Recepcionista&quot;) y asígnale permisos específicos para cada módulo del sistema (ej. &quot;Crear Servicios&quot; pero no &quot;Ver Reporte Financiero&quot;).</li> <li><strong>Migración de Datos con IA:</strong> Para una puesta en marcha rápida, puedes importar tu historial de clientes y servicios desde un archivo Excel. La IA se encarga de leer, interpretar y estructurar los datos correctamente en el sistema.</li> <li><strong>Configuración de Ticket:</strong> Personaliza la información que aparece en los tickets y cotizaciones impresas, como el nombre, la dirección, el teléfono y el logo de tu taller.</li> </ul> </> ) } ];

function ManualUsuarioPageContent() {
    return (
        <>
            <PageHeader title="Manual de Usuario" description="Una guía completa para aprovechar al máximo todas las funciones de la plataforma Ranoro." actions={<BookOpen className="h-8 w-8 text-primary"/>} />
            <Card><CardHeader><CardTitle>Bienvenido a Ranoro</CardTitle><CardDescription>Esta guía está diseñada para ayudarte a navegar por las principales funciones del sistema. Usa las siguientes secciones para aprender sobre cada módulo.</CardDescription></CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {manualSections.map((section, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline"><div className="flex items-center gap-3"><section.icon className="h-5 w-5"/>{section.title}</div></AccordionTrigger>
                                <AccordionContent className="prose prose-sm max-w-none text-muted-foreground pl-10">{section.content}</AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </>
    );
};


// --- Main Component ---
function OpcionesPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'perfil';
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    return (
        <div className="container mx-auto py-8">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="perfil">Mi Perfil</TabsTrigger>
                    <TabsTrigger value="manual">Manual de Usuario</TabsTrigger>
                </TabsList>
                <TabsContent value="perfil" className="mt-0">
                    <PerfilPageContent />
                </TabsContent>
                <TabsContent value="manual" className="mt-0">
                    <ManualUsuarioPageContent />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function OpcionesPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <OpcionesPageComponent />
        </Suspense>
    );
}
