
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
    LayoutDashboard, Wrench, FileText, Receipt, Package, DollarSign, Users, Settings, Truck
} from 'lucide-react';

const manualSections = [
    { 
        title: "Panel Principal (Dashboard)", 
        icon: LayoutDashboard, 
        content: (<>
            <p>Es tu centro de mando. Te ofrece una visión rápida del estado de tu taller y acceso a herramientas de IA.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Tarjetas de Resumen (KPIs):</strong> Datos clave actualizados en tiempo real.
                    <ul className="list-disc pl-5 mt-1">
                        <li><strong>Ingresos del Día:</strong> Suma de ventas y servicios completados hoy.</li>
                        <li><strong>Servicios Activos:</strong> Vehículos actualmente en el taller o agendados para hoy.</li>
                        <li><strong>Alertas de Stock Bajo:</strong> Productos que necesitan reposición.</li>
                        <li><strong>Capacidad del Taller (IA):</strong> Predicción de la ocupación del taller para el día.</li>
                    </ul>
                </li>
                <li><strong>Asistente de Compras (IA):</strong> Analiza los servicios de hoy y genera una orden de compra optimizada con las refacciones necesarias, agrupadas por proveedor.</li>
                <li><strong>Análisis de Inventario (IA):</strong> Revisa tu historial de consumo y stock para recomendarte qué y cuándo reordenar, evitando compras innecesarias.</li>
                <li><strong>Gráficos de Rendimiento:</strong> Visualiza la rentabilidad mensual, los tipos de servicios más comunes y tus principales fuentes de ingreso.</li>
            </ul>
        </>), 
    },
    { 
        title: "Módulo de Servicios", 
        icon: Wrench, 
        content: (<>
            <p>Gestiona todo el ciclo de vida de una reparación, desde la cita hasta la entrega.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Agenda:</strong> Planifica y visualiza tus citas en dos formatos.
                    <ul className="list-disc pl-5 mt-1">
                        <li><strong>Vista de Lista:</strong> Desglose diario detallado con ganancias estimadas y análisis de capacidad.</li>
                        <li><strong>Vista de Calendario:</strong> Vista mensual clásica para una planificación a largo plazo.</li>
                    </ul>
                </li>
                <li><strong>Historial:</strong> Un registro completo y detallado de todas las órdenes de servicio. Busca, filtra y edita cualquier servicio pasado.</li>
                <li><strong>Crear/Editar Servicio:</strong> Un formulario centralizado para capturar cada detalle del servicio.
                    <ul className="list-disc pl-5 mt-1">
                        <li><strong>Recepción:</strong> Documenta el estado del vehículo (daños, combustible) y las pertenencias del cliente.</li>
                        <li><strong>Insumos:</strong> Añade refacciones y mano de obra. La IA puede sugerir un precio de venta.</li>
                        <li><strong>Reporte Fotográfico y Checklist de Seguridad:</strong> Documenta el progreso y el estado del vehículo con fotos y una lista de 26 puntos de seguridad, generando confianza en el cliente.</li>
                        <li><strong>Impresión Unificada:</strong> Genera y comparte una "Hoja de Servicio" completa, que puede incluir cotización, orden de servicio, reporte fotográfico y checklist, todo en un solo documento público y compartible vía enlace.</li>
                    </ul>
                </li>
            </ul>
        </>), 
    },
    { 
        title: "Cotizaciones", 
        icon: FileText, 
        content: ( <>
            <p>Genera presupuestos profesionales y da seguimiento a tus oportunidades de venta. Este módulo ahora está integrado con "Servicios".</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Creación Unificada:</strong> Inicia un nuevo registro desde "Servicios" &gt; "Nuevo Servicio". Por defecto, se crea como "Cotización".</li>
            <li><strong>Inteligencia Artificial:</strong> La IA puede sugerir una cotización completa (insumos, mano de obra y precio) basándose en una simple descripción del trabajo y el historial de servicios similares.</li>
                <li><strong>Historial y Seguimiento:</strong> Consulta todas las cotizaciones en su propia pestaña. Filtra y ordena para encontrar rápidamente lo que necesitas.</li>
                <li><strong>Convertir a Servicio:</strong> Simplemente cambia el estado de "Cotización" a "Agendado" o "En Taller" para convertirla en una orden de servicio activa, conservando toda la información.</li>
            </ul>
        </> ) 
    },
    { 
        title: "Punto de Venta (POS)", 
        icon: Receipt, 
        content: ( <>
            <p>Una herramienta diseñada para ventas rápidas de mostrador y gestión de caja.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Venta Rápida:</strong> Busca y añade productos del inventario ágilmente. El inventario se descuenta automáticamente.</li>
                <li><strong>Gestión de Caja:</strong>
                    <ul className="list-disc pl-5 mt-1">
                        <li>Registra un saldo inicial de caja para el día.</li>
                        <li>Añade entradas (ej. fondo extra) y salidas (ej. compra de insumos) de efectivo.</li>
                        <li>Genera un "Corte de Caja" al final del día con el desglose de todos los movimientos.</li>
                    </ul>
                </li>
                <li><strong>Historial de Ventas:</strong> Consulta, cancela y reimprime tickets de ventas pasadas.</li>
            </ul>
        </> ), 
    },
    { 
        title: "Inventario", 
        icon: Package, 
        content: ( <>
            <p>El corazón de tu operación. Un control preciso de tu inventario te ahorra tiempo y dinero.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Gestión Centralizada:</strong> En una sola pantalla, accede a tu informe general, la lista de productos/servicios, categorías, proveedores y el análisis de IA.</li>
                <li><strong>Productos y Servicios:</strong> El sistema distingue entre productos físicos (con control de stock) y servicios (mano de obra, sin stock).</li>
                <li><strong>Registro de Compras:</strong> Un flujo sencillo para registrar la llegada de nuevos productos, actualizar su costo y la cantidad en stock, y gestionar deudas con proveedores.</li>
                <li><strong>Gestión de Proveedores y Categorías:</strong> Mantén tu inventario organizado para facilitar la búsqueda y la gestión.</li>
            </ul>
        </> ), 
    },
    { 
        title: "Finanzas", 
        icon: DollarSign, 
        content: ( <>
            <p>Toma el control de la salud financiera de tu taller con reportes claros y poderosos.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Reporte de Operaciones:</strong> Es tu herramienta para el día a día. Filtra todas las transacciones (ventas y servicios) por fecha para realizar tu "Corte de Caja" de manera rápida y precisa.</li>
                <li><strong>Resumen Financiero Mensual:</strong> La vista estratégica de tu negocio. Analiza tus ingresos, costos de insumos, gastos fijos y sueldos para obtener la ganancia neta real de cada mes.</li>
                <li><strong>Cálculo de Comisiones:</strong> El sistema calcula automáticamente las comisiones potenciales de tu personal, pero solo las aplica en el resumen financiero si el taller ha sido rentable ese mes.</li>
                <li><strong>Gestión de Gastos Fijos:</strong> Registra tus gastos recurrentes (renta, luz, internet, etc.) para que se incluyan automáticamente en los cálculos de rentabilidad.</li>
            </ul>
        </> ), 
    },
    { 
        title: "Gestión de Flotilla", 
        icon: Truck, 
        content: ( <>
            <p>Administra una flotilla de vehículos para renta, controlando pagos, adeudos y mantenimiento.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Informe General:</strong> De un vistazo, consulta el estado de cuenta mensual de todos tus conductores, incluyendo pagos, cargos y balance. También muestra alertas de trámites vencidos o por vencer.</li>
                <li><strong>Gestión de Vehículos y Conductores:</strong> Añade vehículos a tu flotilla, asigna costos de renta y gestiona los perfiles de los conductores, incluyendo sus documentos.</li>
                <li><strong>Registro de Pagos y Adeudos:</strong> Registra fácilmente los pagos de renta y añade cargos manuales (multas, daños) al estado de cuenta del conductor.</li>
                <li><strong>Reportes por Propietario:</strong> Genera reportes de ingresos detallados por propietario, desglosando ganancias y deducciones por cada vehículo.</li>
            </ul>
        </> ) 
    },
    { 
        title: "Opciones y Configuración", 
        icon: Settings, 
        content: ( <>
            <p>Personaliza la plataforma para que se adapte perfectamente a las necesidades de tu taller.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Mi Perfil:</strong> Cada usuario puede actualizar su nombre, teléfono y firma digital.</li>
                <li><strong>Mi Taller:</strong> Define la información principal de tu negocio (nombre, dirección, logo, contacto) que aparecerá en todos los documentos.</li>
                <li><strong>Configuración de Ticket:</strong> Personaliza la apariencia de tus tickets de venta y cotizaciones, ajustando tamaños de fuente, espaciado y mensajes de pie de página.</li>
                <li><strong>Tipos de Servicio:</strong> Crea y gestiona las categorías de servicios que ofreces (ej. "Mecánica", "Eléctrico", "Hojalatería y Pintura").</li>
                <li><strong>Manual de Usuario:</strong> Accede a esta guía detallada en cualquier momento.</li>
            </ul>
        </> ) 
    },
    { 
        title: "Administración del Sistema", 
        icon: Users, 
        content: ( <>
            <p>Configuraciones avanzadas para adaptar la plataforma a tus necesidades (acceso restringido a roles de administrador).</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Gestión de Usuarios:</strong> Crea, edita o elimina las cuentas de usuario. La creación de la cuenta de correo y contraseña se hace en la consola de Firebase para mayor seguridad.</li>
                <li><strong>Roles y Permisos:</strong> Define qué puede hacer cada tipo de usuario. Crea roles personalizados (ej. "Recepcionista") y asígnale permisos específicos para cada módulo del sistema.</li>
                <li><strong>Migración de Datos con IA:</strong> Importa tu historial de clientes, vehículos y servicios desde un archivo Excel. La IA se encarga de leer, interpretar y estructurar los datos correctamente en el sistema.</li>
                <li><strong>Auditoría:</strong> Un registro detallado de todas las acciones importantes realizadas en el sistema (quién hizo qué y cuándo).</li>
            </ul>
        </> ) 
    }
];

export function ManualUsuarioPageContent() {
    return (
        <Card>
          <CardHeader>
            <CardTitle>Manual de Usuario</CardTitle>
            <CardDescription>Una guía completa para aprovechar al máximo todas las funciones de la plataforma Ranoro.</CardDescription>
          </CardHeader>
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
    );
};
