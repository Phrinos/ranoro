// src/lib/permissions.ts
// ────────────────────────────────────────────────────────────────
// Definición completa de permisos del sistema Ranoro.
// Cada entrada tiene:
//   id     → clave técnica exacta que el código evalúa
//   label  → nombre legible para la UI de gestión de roles
// ────────────────────────────────────────────────────────────────

export const PERMISSION_GROUPS = [
  // ── MÓDULO INVENTARIO ──────────────────────────────────────────
  {
    groupName: "Inventario y Catálogo",
    permissions: [
      { id: 'inventory:view',              label: 'Ver Catálogo de Productos y Servicios' },
      { id: 'inventory:view_costs',        label: 'Visualizar Costos Reales y Márgenes' },
      { id: 'inventory:create',            label: 'Crear Nuevos Productos / Servicios' },
      { id: 'inventory:edit',              label: 'Editar Existencias y Detalles Manualmente' },
      { id: 'inventory:delete',            label: 'Eliminar Productos del Sistema' },
      { id: 'inventory:manage_categories', label: 'Administrar Categorías de Productos' },
    ]
  },

  // ── MÓDULO POS ────────────────────────────────────────────────
  {
    groupName: "Punto de Venta (POS)",
    permissions: [
      { id: 'pos:view_sales',   label: 'Ver Historial de Ventas' },
      { id: 'pos:create_sale',  label: 'Registrar Nuevas Ventas / Cobros' },
      { id: 'pos:delete_sale',  label: 'Cancelar Ventas (Restaura Stock)' },
    ]
  },

  // ── MÓDULO SERVICIOS ──────────────────────────────────────────
  {
    groupName: "Servicios del Taller",
    permissions: [
      { id: 'services:view',         label: 'Ver Panel de Servicios e Historial' },
      { id: 'services:create',       label: 'Crear Ingresos / Cotizaciones Nuevas' },
      { id: 'services:edit',         label: 'Actualizar y Completar Servicios Activos' },
      { id: 'services:delete',       label: 'Eliminar / Cancelar Servicios Completados' },
      { id: 'services:view_profits', label: 'Ver Ganancias y Márgenes por Servicio' },
    ]
  },

  // ── MÓDULO AGENDA ─────────────────────────────────────────────
  {
    groupName: "Agenda y Citas",
    permissions: [
      { id: 'agenda:view',   label: 'Ver Agenda de Citas y Calendario' },
      { id: 'agenda:manage', label: 'Crear, Editar y Cancelar Citas' },
    ]
  },

  // ── MÓDULO VEHÍCULOS ──────────────────────────────────────────
  {
    groupName: "Vehículos y Directorio",
    permissions: [
      { id: 'vehicles:view',   label: 'Ver Directorio de Vehículos y Clientes' },
      { id: 'vehicles:manage', label: 'Registrar y Editar Vehículos / Propietarios' },
      { id: 'vehicles:delete', label: 'Eliminar Vehículos del Sistema' },
    ]
  },

  // ── MÓDULO ABASTECIMIENTO ─────────────────────────────────────
  {
    groupName: "Abastecimiento y Compras",
    permissions: [
      { id: 'purchases:view',     label: 'Ver Historial de Compras y Facturas' },
      { id: 'purchases:create',   label: 'Ingresar Nuevas Facturas / Compras al Sistema' },
      { id: 'purchases:delete',   label: 'Anular Documentos de Compra' },
      { id: 'suppliers:view',     label: 'Ver Directorio de Proveedores' },
      { id: 'suppliers:manage',   label: 'Registrar y Modificar Proveedores' },
    ]
  },

  // ── MÓDULO FLOTILLA ───────────────────────────────────────────
  {
    groupName: "Logística y Flotilla",
    permissions: [
      { id: 'fleet:view',            label: 'Ver Tablero de Flotilla y Resumen de Rentas' },
      { id: 'fleet:create',          label: 'Registrar Nuevos Vehículos en Flotilla' },
      { id: 'fleet:edit',            label: 'Editar Perfiles Vehiculares de Flotilla' },
      { id: 'fleet:delete',          label: 'Eliminar Registros de Flotilla' },
      { id: 'fleet:manage_drivers',  label: 'Administrar Perfiles de Conductores' },
      { id: 'fleet:manage_rentals',  label: 'Registrar Cobros, Cargos y Adeudos' },
      { id: 'fleet:delete_rentals',  label: 'Eliminar Transacciones de Renta' },
    ]
  },

  // ── MÓDULO FINANZAS ───────────────────────────────────────────
  {
    groupName: "Finanzas y Contabilidad",
    permissions: [
      { id: 'finances:view',                label: 'Ver Reportes y Estado de Resultados' },
      { id: 'finances:manage_manual_entries', label: 'Capturar Gastos e Ingresos Extraordinarios' },
      { id: 'finances:delete_entries',       label: 'Borrar Entradas Financieras (Alto Riesgo)' },
      { id: 'billing:manage',               label: 'Administrar Facturación Oficial CFDI' },
    ]
  },

  // ── MÓDULO ADMINISTRACIÓN ─────────────────────────────────────
  {
    groupName: "Administración del Sistema",
    permissions: [
      { id: 'admin:manage_users_roles', label: 'Gestionar Usuarios, Roles y Permisos' },
      { id: 'admin:view_audit',         label: 'Consultar Bitácora de Auditoría' },
      { id: 'admin:settings',           label: 'Modificar Configuración General del Taller' },
    ]
  },

  // ── MÓDULO COMUNICACIONES ─────────────────────────────────────
  {
    groupName: "Comunicaciones y WhatsApp",
    permissions: [
      { id: 'messaging:view',   label: 'Ver Bandeja de Mensajes de WhatsApp' },
      { id: 'messaging:reply',  label: 'Responder y Enviar Mensajes por WhatsApp' },
    ]
  },

  // ── MÓDULO REPORTES ───────────────────────────────────────────
  {
    groupName: "Reportes y Análisis",
    permissions: [
      { id: 'reports:view',         label: 'Ver Reportes Generales del Taller' },
      { id: 'reports:export',       label: 'Exportar Reportes a CSV / Excel' },
      { id: 'reports:view_payroll', label: 'Ver Reporte de Comisiones y Nómina' },
    ]
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(group => group.permissions);
