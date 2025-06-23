
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
  LayoutDashboard, Wrench, Car, FileText, Receipt, Package, DollarSign, Users, UserCog, Settings, BrainCircuit, BookOpen
} from "lucide-react";
import React from 'react';

const manualSections = [
  {
    title: "Panel Principal (Dashboard)",
    icon: LayoutDashboard,
    content: (
      <>
        <p>El Panel Principal es tu centro de operaciones. Aquí obtienes una vista rápida del estado actual de tu taller.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Indicadores Clave (KPIs):</strong> Tarjetas en la parte superior que muestran Ingresos del Día, Servicios Activos, Alertas de Stock y Ganancia Estimada.</li>
          <li><strong>Asistente de Compras IA:</strong> Un botón que analiza los servicios agendados para hoy y te genera una orden de compra consolidada con las refacciones que necesitas, ahorrándote tiempo.</li>
          <li><strong>Columnas de Servicios:</strong>
            <ul className="list-disc pl-5 mt-1 ml-5">
              <li><strong>En Reparación:</strong> Todos los servicios que están actualmente en proceso.</li>
              <li><strong>Agendados:</strong> Servicios programados para hoy o fechas futuras.</li>
              <li><strong>Completados Hoy:</strong> Servicios que se han finalizado durante el día.</li>
            </ul>
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Módulo de Servicios",
    icon: Wrench,
    content: (
      <>
        <p>Aquí gestionas todo el ciclo de vida de una reparación.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Agenda:</strong> Vista de calendario para ver y gestionar citas futuras. La IA te ayuda a analizar la capacidad del taller para el día.</li>
          <li><strong>Historial:</strong> Un registro completo de todos los servicios. Puedes buscar, filtrar y editar órdenes de servicio pasadas.</li>
          <li><strong>Crear/Editar Servicio:</strong> El formulario de servicio te permite registrar todos los detalles: datos del vehículo, descripción del trabajo, técnico asignado, insumos utilizados y costos. La IA puede sugerirte un precio final basado en la rentabilidad y el historial.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Cotizaciones",
    icon: FileText,
    content: (
        <>
            <p>Genera presupuestos profesionales para tus clientes antes de iniciar un trabajo.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Crear Cotización:</strong> Usa un formulario similar al de servicios para detallar los trabajos y refacciones. La IA puede ayudarte a generar una cotización completa (insumos y precio) basada en el historial del taller para trabajos similares.</li>
                <li><strong>Historial de Cotizaciones:</strong> Visualiza todas las cotizaciones generadas. Puedes ver su estado (Pendiente o Ingresado), editarlas o convertirlas directamente en una Orden de Servicio con un solo clic.</li>
                <li><strong>Compartir Cotización:</strong> Cada cotización genera un enlace público y un PDF que puedes compartir fácilmente con tus clientes.</li>
            </ul>
        </>
    )
  },
  {
    title: "Punto de Venta (POS)",
    icon: Receipt,
    content: (
      <>
        <p>Para ventas rápidas de mostrador que no requieren una orden de servicio completa.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Registrar Venta:</strong> Busca y añade productos o servicios del inventario rápidamente.</li>
          <li><strong>Múltiples Métodos de Pago:</strong> Acepta efectivo, tarjeta, transferencia o combinaciones.</li>
          <li><strong>Tickets:</strong> Imprime un ticket de compra al finalizar la venta. El inventario se actualiza automáticamente.</li>
        </ul>
      </>
    ),
  },
    {
    title: "Inventario",
    icon: Package,
    content: (
      <>
        <p>Control total sobre tus productos, servicios, proveedores y categorías.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Productos y Servicios:</strong> Da de alta tanto refacciones físicas (con control de stock) como mano de obra (servicios sin stock).</li>
          <li><strong>Análisis con IA:</strong> La IA puede analizar tu historial de uso y stock actual para recomendarte qué artículos necesitas reordenar y en qué cantidad.</li>
          <li><strong>Ingreso de Compras:</strong> Registra fácilmente la llegada de nuevos productos, actualizando la cantidad en stock y los precios de costo/venta.</li>
          <li><strong>Categorías y Proveedores:</strong> Organiza tu inventario y mantén un registro de tus proveedores.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Finanzas",
    icon: DollarSign,
    content: (
      <>
        <p>Entiende la salud financiera de tu negocio con reportes claros y detallados.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Reporte de Operaciones:</strong> Un desglose detallado de cada venta y servicio completado en un rango de fechas. Ideal para el corte diario.</li>
          <li><strong>Resumen Financiero:</strong> Una vista mensual de tus ingresos, costos, gastos (sueldos, rentas, etc.) y la ganancia neta final. Esencial para la toma de decisiones estratégicas.</li>
          <li><strong>Gestión de Gastos Fijos:</strong> Define tus gastos mensuales recurrentes (renta, luz, internet) para que se incluyan automáticamente en el cálculo del resumen financiero.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Staff y Vehículos",
    icon: Users,
    content: (
        <>
            <p>Gestiona la información clave de tu equipo y de los vehículos de tus clientes.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Staff (Técnico y Administrativo):</strong> Administra los perfiles de tus empleados, incluyendo su información de contacto, salario y comisiones. Visualiza su rendimiento basado en los servicios completados.</li>
                <li><strong>Vehículos:</strong> Mantén una base de datos completa de los vehículos de tus clientes. Accede rápidamente a su historial de servicios para ofrecer una atención personalizada y eficiente.</li>
            </ul>
        </>
    )
  },
  {
    title: "Administración y Configuración",
    icon: Settings,
    content: (
        <>
            <p>Configuraciones avanzadas para adaptar la plataforma a tus necesidades (acceso restringido a administradores).</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Gestión de Usuarios:</strong> Crea, edita o elimina las cuentas de usuario que pueden acceder al sistema.</li>
                <li><strong>Roles y Permisos:</strong> Define qué puede hacer cada tipo de usuario (ej. un técnico no puede ver el resumen financiero).</li>
                <li><strong>Migración de Datos:</strong> Usa la IA para importar datos desde un archivo Excel, ideal para cuando empiezas a usar la plataforma.</li>
                <li><strong>Configuración de Ticket:</strong> Personaliza la información que aparece en los tickets impresos, como el nombre y el logo de tu taller.</li>
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
                description="Una guía completa para aprovechar al máximo la plataforma Ranoro."
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
