
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
    LayoutDashboard, Wrench, FileText, Receipt, Package, DollarSign, Users, Settings, Truck, MessageSquare
} from 'lucide-react';

const manualSections = [
    { 
        title: "Panel Principal (Dashboard)", 
        icon: LayoutDashboard, 
        content: (<>
            <p>Es tu centro de mando y el primer vistazo a la salud de tu taller cada día. Te ofrece un resumen en tiempo real de las métricas más importantes y acceso directo a herramientas de inteligencia artificial para la toma de decisiones.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Tarjetas de Resumen (KPIs):</strong> Son indicadores clave de rendimiento que te muestran cómo va tu día.
                    <ul className="list-disc pl-5 mt-1">
                        <li><strong>Ingresos del Día:</strong> Suma total del dinero que ha entrado por servicios completados y ventas de mostrador en el día actual. Te permite saber si estás cumpliendo tus metas diarias.</li>
                        <li><strong>Servicios Activos:</strong> El número de vehículos que están actualmente en el taller o que tienen una cita agendada para hoy. Es un pulso de tu carga de trabajo actual.</li>
                        <li><strong>Alertas de Stock Bajo:</strong> Un contador que te avisa cuántos productos de tu inventario han alcanzado o bajado de su umbral mínimo. Te ayuda a prevenir quedarte sin refacciones clave.</li>
                        <li><strong>Capacidad del Taller (IA):</strong> Una predicción inteligente que analiza las horas de trabajo de tus técnicos disponibles y los servicios programados para decirte qué tan ocupado está tu taller. Te ayuda a saber si puedes aceptar más trabajo o si estás al límite.</li>
                    </ul>
                </li>
                 <li><strong>Gráficos de Rendimiento:</strong> Visualiza la salud de tu negocio a lo largo del tiempo. Puedes cambiar entre una vista financiera (ingresos, ganancias, gastos) y una operativa (volumen de servicios y ventas) para entender las tendencias de tu taller.</li>
                <li><strong>Asistentes de IA:</strong>
                    <ul className="list-disc pl-5 mt-1">
                        <li><strong>Asistente de Compras:</strong> Analiza los servicios programados para el día y, basándose en el historial y el stock actual, genera una orden de compra optimizada con las refacciones que probablemente necesitarás, agrupadas por proveedor. Ahorra tiempo y evita compras de último momento.</li>
                        <li><strong>Análisis de Inventario:</strong> Va más allá de las alertas de stock. La IA revisa el historial de consumo de cada pieza para darte recomendaciones inteligentes sobre qué y cuánto reordenar, ayudándote a mantener un inventario saludable sin exceso de capital inmovilizado.</li>
                    </ul>
                </li>
            </ul>
        </>), 
    },
    { 
        title: "Módulo de Servicios", 
        icon: Wrench, 
        content: (<>
            <p>Aquí es donde se gestiona el corazón de tu negocio: las reparaciones. Cubre todo el ciclo de vida de un vehículo en el taller.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Agenda:</strong> Es tu herramienta de planificación.
                    <ul className="list-disc pl-5 mt-1">
                        <li><strong>Vista de Lista:</strong> Ideal para la operación diaria. Muestra las citas de hoy, mañana y futuras de forma clara. Incluye el análisis de capacidad de la IA y un resumen de ganancias estimadas para el día.</li>
                        <li><strong>Vista de Calendario:</strong> La vista mensual clásica que te permite ver la carga de trabajo a largo plazo y agendar nuevas citas con una visión completa del mes.</li>
                    </ul>
                </li>
                <li><strong>Historial:</strong> Un archivo digital completo de cada servicio que ha pasado por tu taller. Puedes buscar por folio, placa, cliente o descripción, y filtrar por fechas para encontrar cualquier orden de servicio pasada.</li>
                <li><strong>Formulario de Servicio (Crear/Editar):</strong> Es el documento digital centralizado que evoluciona con el vehículo.
                    <ul className="list-disc pl-5 mt-1">
                        <li><strong>Información del Vehículo:</strong> Busca un vehículo existente por placa o registra uno nuevo sobre la marcha. La plataforma recordará su historial.</li>
                        <li><strong>Detalles del Servicio:</strong> Define los trabajos a realizar y los insumos (refacciones y mano de obra). La IA puede sugerir un precio de venta justo y rentable.</li>
                        <li><strong>Recepción y Entrega:</strong> Documenta el estado en que llega el vehículo (daños, nivel de combustible) y las pertenencias del cliente para evitar malentendidos. Captura la firma digital del cliente para la recepción y la entrega de conformidad.</li>
                         <li><strong>Reporte Fotográfico:</strong> Añade fotos en diferentes etapas del servicio (recepción, durante la reparación, trabajo terminado). Esto genera una enorme confianza y transparencia con el cliente.</li>
                        <li><strong>Checklist de Seguridad:</strong> Realiza una inspección de 26 puntos clave del vehículo (luces, frenos, suspensión, etc.). Cada punto puede tener notas y fotos, generando un reporte profesional que puedes compartir con tu cliente para justificar reparaciones adicionales.</li>
                        <li><strong>Documento Unificado:</strong> Todo lo que documentas (cotización, orden de servicio, fotos, checklist) se puede generar en un solo documento con un enlace público para compartir con el cliente.</li>
                    </ul>
                </li>
            </ul>
        </>), 
    },
    { 
        title: "Cotizaciones", 
        icon: FileText, 
        content: ( <>
            <p>Genera presupuestos profesionales rápidamente y conviértelos en órdenes de servicio con un solo clic. Este módulo está integrado dentro de "Servicios" para un flujo de trabajo más ágil.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Creación Rápida y Profesional:</strong> Al crear un "Nuevo Servicio", por defecto se inicia como una "Cotización". Esto te permite detallar los trabajos y costos sin comprometer inventario.</li>
            <li><strong>Inteligencia Artificial para Cotizar:</strong> Describe el servicio que necesita el cliente (ej. "cambio de balatas delanteras") y deja que la IA sugiera una cotización completa, incluyendo las refacciones necesarias, mano de obra estimada y un precio de venta al cliente basado en trabajos similares que has realizado.</li>
                <li><strong>Historial y Seguimiento:</strong> Todas tus cotizaciones se guardan en su propia pestaña, separadas de los servicios activos. Desde ahí puedes darles seguimiento, editarlas o reenviarlas.</li>
                <li><strong>Conversión a Servicio:</strong> ¿El cliente aprobó la cotización? Simplemente cambia el estado de "Cotización" a "Agendado" o "En Taller". Toda la información, incluyendo los insumos, se transfiere automáticamente a la nueva orden de servicio.</li>
            </ul>
        </> ) 
    },
    { 
        title: "Punto de Venta (POS)", 
        icon: Receipt, 
        content: ( <>
            <p>Una herramienta ágil para ventas de mostrador y para llevar un control estricto del efectivo de tu taller.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Venta Rápida:</strong> Busca productos en tu inventario por nombre o SKU, añádelos al carrito y cierra la venta en segundos. El stock se descuenta automáticamente.</li>
                <li><strong>Gestión de Caja:</strong>
                    <ul className="list-disc pl-5 mt-1">
                        <li><strong>Saldo Inicial:</strong> Registra con cuánto efectivo inicia tu caja cada día.</li>
                        <li><strong>Entradas y Salidas:</strong> Registra cualquier movimiento de efectivo que no sea una venta, como la compra de insumos o el pago a un proveedor. Cada movimiento queda registrado con su concepto y usuario.</li>
                        <li><strong>Corte de Caja:</strong> Al final del día, genera un "Corte de Caja" que te muestra un resumen claro: saldo inicial, total de ventas en efectivo, otras entradas, salidas y el saldo final esperado en tu caja.</li>
                    </ul>
                </li>
                <li><strong>Historial de Ventas:</strong> Consulta todas las ventas realizadas, cancela alguna si es necesario (restaurando el stock automáticamente) y reimprime los tickets cuando lo necesites.</li>
            </ul>
        </> ), 
    },
    { 
        title: "Inventario", 
        icon: Package, 
        content: ( <>
            <p>Un control preciso de tu inventario es crucial para la rentabilidad. Ranoro te da las herramientas para gestionarlo de forma centralizada y eficiente.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Visión Centralizada:</strong> En una sola pantalla, tienes acceso a un informe general, la lista completa de tus productos y servicios, la gestión de categorías y proveedores, y el potente análisis de inventario con IA.</li>
                <li><strong>Productos y Servicios:</strong> El sistema distingue claramente entre productos físicos (que tienen stock y costo) y servicios (como mano de obra, que no tienen stock).</li>
                <li><strong>Registro de Compras:</strong> Un formulario sencillo para registrar la mercancía que llega de tus proveedores. Puedes actualizar costos, añadir nuevos productos sobre la marcha y manejar pagos a crédito, actualizando automáticamente la deuda con el proveedor.</li>
                <li><strong>Gestión de Proveedores y Categorías:</strong> Organiza tu inventario creando categorías y asignando proveedores a cada producto. Esto facilita la búsqueda, el filtrado y la generación de órdenes de compra.</li>
            </ul>
        </> ), 
    },
    { 
        title: "Finanzas", 
        icon: DollarSign, 
        content: ( <>
            <p>Este módulo te proporciona una visión clara y profunda de la salud financiera de tu taller, permitiéndote tomar decisiones estratégicas basadas en datos reales.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Reporte de Operaciones:</strong> Es tu herramienta para el día a día. Filtra todas las transacciones (ventas y servicios completados) por fecha para realizar tu "Corte de Caja" o análisis de ventas de un período específico.</li>
                <li><strong>Resumen Financiero (Estado de Resultados):</strong> Es la vista de "CEO". Analiza tus ingresos brutos, resta el costo de los insumos para obtener la ganancia bruta, y finalmente deduce todos tus gastos (sueldos, rentas, comisiones) para mostrarte la rentabilidad neta real de tu taller en el período que elijas.</li>
                <li><strong>Cálculo de Comisiones Inteligente:</strong> El sistema calcula automáticamente las comisiones potenciales para tu personal administrativo y técnico basándose en la rentabilidad. Crucialmente, solo las aplica en el resumen financiero si el taller ha sido rentable después de cubrir los gastos fijos, asegurando que el pago de comisiones no afecte negativamente la salud financiera del negocio.</li>
                <li><strong>Gestión de Gastos Fijos:</strong> Registra todos tus gastos mensuales recurrentes (renta, luz, internet, sueldos base). Estos se incluyen automáticamente en los cálculos de rentabilidad, dándote una imagen financiera precisa.</li>
                <li><strong>Facturación (Próximamente):</strong> Integración con portales de facturación para que tus clientes puedan generar sus facturas CFDI 4.0 de forma automática.</li>
            </ul>
        </> ), 
    },
    { 
        title: "Gestión de Flotilla", 
        icon: Truck, 
        content: ( <>
            <p>Un módulo completo para administrar una flotilla de vehículos en renta, ideal para talleres que diversifican sus ingresos.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Resumen General:</strong> Visualiza de un vistazo el estado de cuenta de todos tus conductores, con un desglose claro de pagos, cargos y el balance del mes. Incluye alertas de trámites vehiculares vencidos o por vencer.</li>
                <li><strong>Gestión de Vehículos y Conductores:</strong> Añade vehículos de tu inventario a la flotilla, asígnales un costo de renta diario y gestiona los perfiles de los conductores, incluyendo sus documentos (licencia, INE, etc.) y depósitos en garantía.</li>
                <li><strong>Registro de Pagos y Adeudos:</strong> Registra fácilmente los pagos de renta semanales o diarios y añade cargos manuales (como multas, reparaciones de daños no cubiertas) al estado de cuenta de cada conductor para un control financiero preciso.</li>
                <li><strong>Reportes por Propietario:</strong> Genera reportes de ingresos mensuales detallados por cada propietario de la flotilla, desglosando las ganancias por renta y las deducciones por mantenimiento y gastos administrativos de cada vehículo.</li>
            </ul>
        </> ) 
    },
    {
      title: "Mensajería (WhatsApp)",
      icon: MessageSquare,
      content: (<>
        <p>Automatiza la comunicación con tus clientes a través de WhatsApp para mejorar la experiencia y fidelización.</p>
        <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Integración con API de Meta:</strong> Conecta tu cuenta de WhatsApp Business para habilitar el envío de notificaciones automáticas y plantillas de mensajes.</li>
            <li><strong>Plantillas Personalizables:</strong> Configura mensajes automáticos para eventos clave:
                <ul className="list-disc pl-5 mt-1">
                    <li>Confirmación de Cita.</li>
                    <li>Recordatorio de Cita (24h antes).</li>
                    <li>Recordatorio de Próximo Servicio.</li>
                    <li>Envío del enlace a la Orden de Servicio o Cotización.</li>
                </ul>
            </li>
            <li><strong>Comunicación Profesional:</strong> Mantén a tus clientes informados de manera proactiva, reduciendo las llamadas y mejorando la satisfacción del cliente.</li>
        </ul>
      </>),
    },
    { 
        title: "Administración del Sistema", 
        icon: Users, 
        content: ( <>
            <p>Configuraciones avanzadas para los dueños y administradores del taller. Esta sección requiere permisos especiales.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Gestión de Usuarios:</strong> Crea, edita o elimina las cuentas de los miembros de tu equipo. Por seguridad, la asignación de contraseñas se gestiona desde la consola de Firebase.</li>
                <li><strong>Roles y Permisos:</strong> El control de acceso más flexible. Crea roles personalizados (ej. "Jefe de Taller", "Recepcionista") y asigna permisos específicos para cada módulo del sistema. Decide quién puede ver los reportes financieros, quién puede editar servicios o quién solo puede vender en el POS.</li>
                <li><strong>Migración de Datos con IA:</strong> ¿Vienes de otro sistema o de hojas de cálculo? Simplemente copia y pega tus datos en nuestra herramienta de migración. La IA se encargará de leer, interpretar y estructurar la información de vehículos, clientes y servicios históricos, lista para ser guardada en la base de datos de Ranoro.</li>
                <li><strong>Auditoría:</strong> Un registro de seguridad que documenta cada acción importante realizada en el sistema: quién creó un servicio, quién eliminó un producto, quién modificó un rol y cuándo lo hizo. Indispensable para la seguridad y el control.</li>
            </ul>
        </> ) 
    },
     { 
        title: "Opciones Generales", 
        icon: Settings, 
        content: ( <>
            <p>Personaliza la plataforma para que refleje la identidad y las necesidades de tu taller.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Mi Perfil:</strong> Cada usuario puede actualizar su nombre, teléfono y registrar su firma digital, la cual se usará en los documentos que genere.</li>
                <li><strong>Mi Taller:</strong> Configura la información principal de tu negocio (nombre, dirección, logo, datos de contacto) que aparecerá en todos los documentos públicos como cotizaciones y órdenes de servicio.</li>
                <li><strong>Configuración de Ticket:</strong> Personaliza hasta el último detalle de tus tickets de venta y cotizaciones, ajustando tamaños de fuente, espaciado, mensajes en el pie de página y el ancho del logo.</li>
                <li><strong>Tipos de Servicio:</strong> Organiza tus trabajos creando categorías personalizadas (ej. "Mecánica General", "Suspensión", "Eléctrico", "Hojalatería y Pintura").</li>
                <li><strong>Manual de Usuario:</strong> Accede a esta guía detallada en cualquier momento para resolver dudas o aprender a usar nuevas funciones.</li>
            </ul>
        </> ) 
    }
];

export function ManualUsuarioPageContent() {
    return (
        <Card>
          <CardHeader>
            <CardTitle>Manual de Usuario - Ranoro</CardTitle>
            <CardDescription>Una guía completa para aprovechar al máximo todas las funciones de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
              <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
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
