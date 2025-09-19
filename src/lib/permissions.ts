
export const PERMISSION_GROUPS = [
    {
        groupName: "General",
        permissions: [
            { id: 'dashboard:view', label: 'Ver Panel Principal' },
        ]
    },
    {
        groupName: "Clientes y Datos Sensibles",
        permissions: [
            { id: 'customers:view_sensitive_data', label: 'Ver Nombre y Teléfono de Clientes' },
        ]
    },
    {
        groupName: "Servicios y Cotizaciones",
        permissions: [
            { id: 'services:create', label: 'Crear Servicios/Cotizaciones' },
            { id: 'services:edit', label: 'Editar Servicios' },
            { id: 'services:view_history', label: 'Ver Historial de Servicios' },
        ]
    },
    {
        groupName: "Inventario, Compras y Ventas",
        permissions: [
            { id: 'inventory:manage', label: 'Gestionar Inventario (Añadir/Editar)' },
            { id: 'inventory:view_public_info', label: 'Ver Inventario (Info. Pública)' },
            { id: 'inventory:view_costs', label: 'Ver Costos y Ganancias de Inventario' },
            { id: 'purchases:manage', label: 'Gestionar Compras a Proveedores' },
            { id: 'pos:create_sale', label: 'Registrar Ventas (POS)' },
            { id: 'pos:view_sales', label: 'Ver Registro de Ventas' },
        ]
    },
    {
        groupName: "Flotilla y Rentas",
        permissions: [
             { id: 'fleet:manage', label: 'Gestionar Flotilla (Vehículos y Conductores)' },
             { id: 'rentals:view', label: 'Ver Ingresos de Renta' },
             { id: 'rentals:manage', label: 'Registrar Pagos y Gastos de Renta' },
        ]
    },
    {
        groupName: "Administración y Finanzas",
        permissions: [
            { id: 'vehicles:manage', label: 'Gestionar Vehículos (General)' },
            { id: 'personnel:manage', label: 'Gestionar Personal (Técnicos/Asesores)' },
            { id: 'finances:view_report', label: 'Ver Reporte Financiero' },
            { id: 'billing:manage', label: 'Gestionar Facturación (Admin)' },
            { id: 'messaging:manage', label: 'Configurar Mensajería (Admin)' },
            { id: 'audits:view', label: 'Ver Auditoría de Acciones (Admin)' },
            { id: 'users:manage', label: 'Gestionar Usuarios (Admin)' },
            { id: 'roles:manage', label: 'Gestionar Roles y Permisos (Admin)' },
            { id: 'ticket_config:manage', label: 'Configurar Ticket (Admin)' },
            { id: 'workshop:manage', label: 'Configurar Datos del Taller (Admin)' },
        ]
    },
];


export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(group => group.permissions);
