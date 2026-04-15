export const PERMISSION_GROUPS = [
    {
        groupName: "Módulo Inventario",
        permissions: [
            { id: 'inventory:view', label: 'Ver Inventario General' },
            { id: 'inventory:create', label: 'Crear Nuevos Productos/Servicios' },
            { id: 'inventory:edit', label: 'Editar Existencias y Detalles' },
            { id: 'inventory:delete', label: 'Eliminar Productos del Sistema' },
            { id: 'inventory:view_costs', label: 'Visualizar Costos Reales y Márgenes' },
            { id: 'inventory:manage_categories', label: 'Añadir/Eliminar Categorías' }
        ]
    },
    {
        groupName: "Punto de Venta y Cobranza",
        permissions: [
            { id: 'pos:view_sales', label: 'Ver Histórico de Ventas' },
            { id: 'pos:create_sale', label: 'Registrar Nuevas Ventas/Cobros' },
            { id: 'pos:delete_sale', label: 'Cancelar Ventas (Restaura Stock)' }
        ]
    },
    {
        groupName: "Servicios del Taller",
        permissions: [
            { id: 'services:view', label: 'Ver Panel de Servicios' },
            { id: 'services:create', label: 'Crear Entradas y Cotizaciones' },
            { id: 'services:edit', label: 'Actualizar/Completar Servicios' },
            { id: 'services:delete', label: 'Eliminar o Cancelar Servicios Activos' }
        ]
    },
    {
        groupName: "Abastecimiento y Compras",
        permissions: [
            { id: 'purchases:view', label: 'Ver Historial de Compras' },
            { id: 'purchases:create', label: 'Ingresar Nuevas Facturas/Compras' },
            { id: 'purchases:delete', label: 'Anular Documentos de Compra' },
            { id: 'suppliers:manage', label: 'Alta y Modificación de Proveedores' }
        ]
    },
    {
        groupName: "Logística y Flotilla",
        permissions: [
            { id: 'fleet:view', label: 'Ver Tablero Flotilla y Rentas' },
            { id: 'fleet:create', label: 'Registrar Nuevos Vehículos' },
            { id: 'fleet:edit', label: 'Editar Perfiles Vehiculares' },
            { id: 'fleet:delete', label: 'Eliminar Registros de Vehículos' },
            { id: 'fleet:manage_drivers', label: 'Controlar Perfiles de Conductores' },
            { id: 'fleet:manage_rentals', label: 'Registrar Cobros y Adeudos' },
            { id: 'fleet:delete_rentals', label: 'Eliminar Registros de Rentas' },
        ]
    },
    {
        groupName: "Finanzas y Contabilidad",
        permissions: [
            { id: 'finances:view', label: 'Análisis de Estado de Resultados' },
            { id: 'finances:manage_manual_entries', label: 'Capturar Gastos/Ingresos Extraordinarios' },
            { id: 'finances:delete_entries', label: 'Borrar Entradas Financieras (Riesgo)' },
            { id: 'billing:manage', label: 'Administrar Facturación Oficial' }
        ]
    },
    {
        groupName: "Administrador de Entorno",
        permissions: [
            { id: 'admin:manage_users_roles', label: 'Invitar/Bloquear Usuarios y Roles' },
            { id: 'admin:view_audit', label: 'Auditar Bitácora del Sistema' },
            { id: 'admin:settings', label: 'Ajustes de Plantilla y Sucursales' }
        ]
    }
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(group => group.permissions);
