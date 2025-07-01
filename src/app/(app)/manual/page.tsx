
"use client";

import { PageHeader } from "@/components/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard, Wrench, FileText, Receipt, Package, DollarSign, Users, Settings, BookOpen
} from "lucide-react";
import React from 'react';

const manualSections = [
  {
    title: "Panel Principal (Dashboard)",
    icon: LayoutDashboard,
    content: (
      <>
        <p>El Panel Principal es tu centro de mando, diseñado para darte una visión instantánea y clara del estado de tu taller. Aquí encontrarás KPIs (Indicadores Clave de Rendimiento) y herramientas de IA para optimizar tu día a día.</p>
        <ul className="list-disc pl-5 mt-2 space-y-2">
          <li><strong>Tarjetas de Resumen (KPIs):</strong> En la parte superior, verás datos cruciales actualizados en tiempo real:
            <ul className="list-disc pl-5 mt-1">
                <li><strong>Ingresos del Día:</strong> Suma total de ventas y servicios completados hoy, con la ganancia neta estimada.</li>
                <li><strong>Servicios Activos:</strong> Cuántos vehículos están actualmente en reparación o agendados para hoy.</li>
                <li><strong>Alertas de Stock Bajo:</strong> Un contador de los productos que han alcanzado o caído por debajo de su umbral mínimo.</li>
                <li><strong>Capacidad del Taller (IA):</strong> Una predicción inteligente de qué tan ocupado estará el taller hoy, basada en los servicios agendados y las horas de tus técnicos.</li>
            </ul>
          </li>
          <li><strong>Asistente de Compras con IA:</strong> Esta potente herramienta analiza todos los servicios agendados para el día, determina qué refacciones se necesitarán basándose en el historial y tu inventario actual, y genera una orden de compra consolidada y agrupada por proveedor. Te ahorra el trabajo manual de revisar cada orden de servicio.</li>
          <li><strong>Gráficos de Rendimiento:</strong> Visualiza el rendimiento de tu taller con gráficos que muestran la comparativa de Ingresos vs. Ganancia de los últimos 6 meses, la distribución de los tipos de servicios más comunes y de dónde provienen tus ingresos (servicios vs. ventas de mostrador).</li>
        </ul>
      </>
    ),
  },
  {
    title: "Módulo de Servicios",
    icon: Wrench,
    content: (
      <>
        <p>Aquí gestionas todo el ciclo de vida de una reparación, desde la cita inicial hasta la entrega final del vehículo.</p>
        <ul className="list-disc pl-5 mt-2 space-y-2">
          <li><strong>Agenda:</strong> Planifica y visualiza todas las citas. Cuenta con dos vistas:
             <ul className="list-disc pl-5 mt-1">
                <li><strong>Vista de Lista:</strong> Un desglose detallado día por día de todas las citas futuras y pasadas, mostrando la ganancia estimada por día y el análisis de capacidad de la IA para el día actual.</li>
                <li><strong>Vista de Calendario:</strong> Una vista mensual clásica donde puedes ver las citas marcadas y seleccionar un día para ver los detalles.</li>
            </ul>
          </li>
          <li><strong>Historial:</strong> Un registro completo y detallado de todas las órdenes de servicio. Puedes buscar, filtrar por fecha y ordenar por múltiples criterios. Desde aquí puedes editar cualquier servicio pasado.</li>
          <li><strong>Crear/Editar Servicio:</strong> Un formulario completo para capturar cada detalle:
             <ul className="list-disc pl-5 mt-1">
                <li><strong>Recepción de Unidad:</strong> Registra datos del vehículo, kilometraje, y observaciones sobre su estado (rayones, golpes) y nivel de combustible.</li>
                <li><strong>Insumos:</strong> Añade refacciones y mano de obra. La IA puede sugerirte un precio final competitivo y rentable para el servicio completo.</li>
                <li><strong>Impresión:</strong> Puedes imprimir una &quot;Hoja de Servicio&quot; para control interno en el taller o un &quot;Comprobante de Servicio&quot; para el cliente al finalizar.</li>
            </ul>
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Cotizaciones",
    icon: FileText,
    content: (
        <>
            <p>Genera presupuestos profesionales y da seguimiento a tus oportunidades de venta. Este módulo es clave para formalizar tus ofertas y aumentar tu tasa de conversión.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Crear Cotización con IA:</strong> El sistema es capaz de generar una cotización completa (insumos, mano de obra y precio final) basándose en una simple descripción y el historial de trabajos similares realizados en tu taller.</li>
                <li><strong>Historial y Seguimiento:</strong> Visualiza todas las cotizaciones con su estado (&quot;Pendiente&quot; o &quot;Ingresado&quot;). Las tarjetas de resumen te muestran el total de cotizaciones, cuántas se han concretado y el valor total que representan.</li>
                <li><strong>Convertir a Servicio:</strong> Con un solo clic, convierte una cotización aprobada en una Orden de Servicio, transfiriendo automáticamente toda la información y evitando la recaptura.</li>
                <li><strong>Compartir con el Cliente:</strong> Cada cotización genera un PDF profesional y un enlace público que puedes compartir fácilmente por WhatsApp o correo electrónico.</li>
            </ul>
        </>
    )
  },
  {
    title: "Punto de Venta (POS)",
    icon: Receipt,
    content: (
      <>
        <p>Una herramienta diseñada para ventas rápidas de mostrador (refacciones, accesorios, etc.) que no requieren una orden de servicio completa.</p>
        <ul className="list-disc pl-5 mt-2 space-y-2">
          <li><strong>Venta Rápida:</strong> Busca y añade productos del inventario de forma ágil. Si un producto no existe, puedes crearlo directamente desde la interfaz de venta sin salir del flujo.</li>
          <li><strong>Múltiples Métodos de Pago:</strong> Flexibilidad total para tus clientes. Acepta efectivo, tarjeta, transferencia o combinaciones de estos.</li>
          <li><strong>Generación de Tickets:</strong> Al finalizar la venta, se genera un ticket de compra que puedes imprimir. El inventario se descuenta automáticamente para los productos vendidos.</li>
        </ul>
      </>
    ),
  },
    {
    title: "Inventario",
    icon: Package,
    content: (
      <>
        <p>El corazón de tu operación. Un control preciso de tu inventario te ahorra tiempo y dinero.</p>
        <ul className="list-disc pl-5 mt-2 space-y-2">
          <li><strong>Productos y Servicios:</strong> El sistema distingue entre productos físicos (con control de stock, como filtros o aceite) y servicios (sin control de stock, como &quot;Mano de Obra Mecánica&quot;).</li>
          <li><strong>Análisis de Inventario con IA:</strong> Esta función revisa tu historial de consumo, tu stock actual y los umbrales de stock bajo para darte recomendaciones inteligentes sobre qué artículos necesitas reordenar y en qué cantidad, optimizando tus compras.</li>
          <li><strong>Ingreso de Compras:</strong> Un flujo sencillo para registrar la llegada de nuevos productos. Busca un artículo existente o crea uno nuevo, introduce la cantidad comprada y actualiza sus precios de costo y venta en un solo paso.</li>
          <li><strong>Gestión Centralizada:</strong> Administra categorías y proveedores para mantener todo tu inventario organizado y accesible.</li>
          <li><strong>Impresión Profesional:</strong> Genera una lista de inventario en formato carta, ideal para reportes físicos, que incluye un resumen del valor total de tu stock.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Finanzas",
    icon: DollarSign,
    content: (
      <>
        <p>Toma el control de la salud financiera de tu taller con reportes claros y poderosos.</p>
        <ul className="list-disc pl-5 mt-2 space-y-2">
          <li><strong>Reporte de Operaciones:</strong> Es tu herramienta para el día a día. Filtra todas las transacciones (ventas y servicios) por fecha para realizar tu &quot;Corte de Caja&quot; de manera rápida y precisa.</li>
          <li><strong>Resumen Financiero Mensual:</strong> La vista estratégica de tu negocio. Analiza tus ingresos, costos de insumos, gastos fijos y sueldos para obtener la ganancia neta real de cada mes. Este reporte es crucial para entender la rentabilidad y tomar decisiones a largo plazo.</li>
           <li><strong>Cálculo de Comisiones:</strong> El sistema calcula automáticamente las comisiones potenciales de tu personal, pero solo las aplica en el resumen financiero si el taller ha sido rentable ese mes (es decir, si la ganancia bruta supera los gastos fijos).</li>
          <li><strong>Gestión de Gastos Fijos:</strong> Registra tus gastos recurrentes (renta, luz, internet, etc.) para que se incluyan automáticamente en los cálculos de rentabilidad, dándote una visión financiera completa.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Gestión de Staff",
    icon: Users,
    content: (
        <>
            <p>Administra la información, roles y rendimiento de todo tu personal, tanto técnico como administrativo.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Perfiles de Staff:</strong> Mantén un registro detallado de cada empleado, incluyendo su información de contacto, fecha de contratación, salario base y tasa de comisión.</li>
                <li><strong>Rendimiento Individual:</strong> Analiza el rendimiento de cada miembro del staff en un rango de fechas. Visualiza los ingresos que han generado y las comisiones potenciales que han acumulado, ayudándote a identificar a tu personal más productivo.</li>
                <li><strong>Separación por Roles:</strong> El sistema distingue entre Staff Técnico y Staff Administrativo, permitiendo una gestión más organizada y cálculos de rendimiento específicos para cada área.</li>
            </ul>
        </>
    )
  },
  {
    title: "Administración del Sistema",
    icon: Settings,
    content: (
        <>
            <p>Configuraciones avanzadas para adaptar la plataforma a tus necesidades (acceso restringido a roles de administrador).</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Gestión de Usuarios:</strong> Crea, edita o elimina las cuentas de usuario. La creación de la cuenta de correo y contraseña se hace en la consola de Firebase para mayor seguridad.</li>
                <li><strong>Roles y Permisos:</strong> Define qué puede hacer cada tipo de usuario. Crea roles personalizados (ej. &quot;Recepcionista&quot;) y asígnale permisos específicos para cada módulo del sistema (ej. &quot;Crear Servicios&quot; pero no &quot;Ver Reporte Financiero&quot;).</li>
                <li><strong>Migración de Datos con IA:</strong> Para una puesta en marcha rápida, puedes importar tu historial de clientes y servicios desde un archivo Excel. La IA se encarga de leer, interpretar y estructurar los datos correctamente en el sistema.</li>
                <li><strong>Configuración de Ticket:</strong> Personaliza la información que aparece en los tickets y cotizaciones impresas, como el nombre, la dirección, el teléfono y el logo de tu taller.</li>
            </ul>
        </>
    )
  }
];

const ManualUsuarioPage = () => {
    return (
        <div className="container mx-auto py-8">
            <PageHeader
                title="Manual de Usuario"
                description="Una guía completa para aprovechar al máximo todas las funciones de la plataforma Ranoro."
                actions={<BookOpen className="h-8 w-8 text-primary"/>}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Bienvenido a Ranoro</CardTitle>
                    <CardDescription>
                        Esta guía está diseñada para ayudarte a navegar por las principales funciones del sistema.
                        Usa las siguientes secciones para aprender sobre cada módulo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {manualSections.map((section, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <section.icon className="h-5 w-5"/>
                                        {section.title}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="prose prose-sm max-w-none text-muted-foreground pl-10">
                                    {section.content}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
};

export default ManualUsuarioPage;
