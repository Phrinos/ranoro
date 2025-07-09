
"use client";

import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User, AppRole, Vehicle, ServiceRecord, InventoryItem, InventoryCategory, Supplier } from '@/types';
import { Save, Signature, BookOpen, LayoutDashboard, Wrench, FileText, Receipt, Package, DollarSign, Users, Settings, Eye, Printer, UserCircle, Upload, Loader2, Bold, ShieldAlert, PlusCircle, Trash2, Edit, Search, ShieldQuestion, Checkbox, UploadCloud, CheckCircle, AlertTriangle, Car, BrainCircuit, Shield } from 'lucide-react';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, storage, db } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { placeholderUsers, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY, placeholderAppRoles, defaultSuperAdmin, placeholderServiceRecords, migrateVehicles, migrateProducts, migrateData, placeholderVehicles, placeholderInventory, placeholderCategories, placeholderSuppliers } from '@/lib/placeholder-data';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import Image from "next/legacy/image";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TicketContent } from "@/components/ticket-content";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { optimizeImage, capitalizeWords, capitalizeSentences, formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import type { ExtractedVehicle as ExtractedGenericVehicle, ExtractedService } from '@/ai/flows/data-migration-flow';
import type { ExtractedVehicleForMigration } from '@/ai/flows/vehicle-migration-flow';
import type { ExtractedProduct } from '@/ai/flows/product-migration-flow';


//--- Start Content for Usuarios Page ---
const userFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  role: z.string({ required_error: "Seleccione un rol." }).min(1, "Debe seleccionar un rol."),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
    if (data.password && data.password.length > 0) {
        if (data.password.length < 6) return false;
        return data.password === data.confirmPassword;
    }
    return true;
}, {
  message: "Las contraseñas no coinciden o tienen menos de 6 caracteres.",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof userFormSchema>;

function UsuariosPageContent({ currentUser }: { currentUser: User | null }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const formCardRef = useRef<HTMLDivElement>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: '', email: '', phone: '', role: 'Tecnico', password: '', confirmPassword: '' },
  });
  
  useEffect(() => {
    setUsers(placeholderUsers);
    setAvailableRoles(placeholderAppRoles);
  }, []);
  
  useEffect(() => {
    if (isFormOpen && formCardRef.current) {
        setTimeout(() => {
            formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  }, [isFormOpen]);
  
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);
  
  const canEditOrDelete = (user: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Superadmin') return user.id !== currentUser.id;
    if (currentUser.role === 'Admin') return user.role !== 'Superadmin' && user.id !== currentUser.id;
    return false;
  };
  
  const assignableRoles = useMemo(() => {
    if (currentUser?.role === 'Superadmin') return availableRoles;
    if (currentUser?.role === 'Admin') return availableRoles.filter(r => r.name !== 'Superadmin');
    return [];
  }, [currentUser, availableRoles]);

  const handleOpenForm = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      form.reset({
        name: userToEdit.name,
        email: userToEdit.email,
        phone: userToEdit.phone || '',
        role: userToEdit.role,
        password: '',
        confirmPassword: '',
      });
    } else {
      setEditingUser(null);
      form.reset({ name: '', email: '', phone: '', role: 'Tecnico', password: '', confirmPassword: '' });
    }
    setIsFormOpen(true);
  };

  const onSubmit = async (data: UserFormValues) => {
    // Logic for saving user (from original /admin/usuarios page)
  };
  
  const handleDeleteUser = async (userId: string) => {
     // Logic for deleting user (from original /admin/usuarios page)
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Lista de Usuarios</CardTitle>
                    <CardDescription>Usuarios registrados en el sistema.</CardDescription>
                </div>
                 <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Usuario
                </Button>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar por nombre o email..."
                      className="w-full rounded-lg bg-background pl-8 md:w-1/3 lg:w-1/4"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                {/* User Table JSX */}
                {filteredUsers.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-black">
                      <TableRow>
                        <TableHead className="text-white">Nombre</TableHead><TableHead className="text-white">Email</TableHead><TableHead className="text-white">Teléfono</TableHead><TableHead className="text-white">Rol</TableHead><TableHead className="text-right text-white">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || 'N/A'}</TableCell>
                          <TableCell><span className={`px-2 py-1 text-xs rounded-full font-medium ${ user.role === 'Superadmin' ? 'bg-red-100 text-red-700' : user.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700' }`}>{user.role}</span></TableCell>
                          <TableCell className="text-right">
                            {canEditOrDelete(user) && ( <> <Button variant="ghost" size="icon" onClick={() => handleOpenForm(user)} className="mr-2"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar Usuario?</AlertDialogTitle><AlertDialogDescription>¿Seguro que quieres eliminar a "{user.name}"? Esta acción es local. Recuerda eliminarlo también de Firebase.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Sí, Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <Users className="h-12 w-12 mb-2" />
                        <h3 className="text-lg font-semibold text-foreground">No se encontraron usuarios</h3>
                        <p className="text-sm">Intente cambiar su búsqueda o agregue un nuevo usuario.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {isFormOpen && (
            <Card className="mt-8" ref={formCardRef}>
                <CardHeader><CardTitle>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</CardTitle></CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Form Fields from original page */}
                        </form>
                    </Form>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
//--- End Content for Usuarios Page ---

//--- Start Content for Roles Page ---
const ALL_AVAILABLE_PERMISSIONS = [
    { id: 'dashboard:view', label: 'Ver Panel Principal' },
    { id: 'services:create', label: 'Crear Servicios' },
    { id: 'services:edit', label: 'Editar Servicios' },
    { id: 'services:view_history', label: 'Ver Historial de Servicios' },
    { id: 'inventory:manage', label: 'Gestionar Inventario (Productos, Cat, Prov)' },
    { id: 'inventory:view', label: 'Ver Inventario' },
    { id: 'pos:create_sale', label: 'Registrar Ventas (POS)' },
    { id: 'pos:view_sales', label: 'Ver Registro de Ventas' },
    { id: 'finances:view_report', label: 'Ver Reporte Financiero' },
    { id: 'technicians:manage', label: 'Gestionar Técnicos' },
    { id: 'vehicles:manage', label: 'Gestionar Vehículos' },
    { id: 'users:manage', label: 'Gestionar Usuarios (Admin)' },
    { id: 'roles:manage', label: 'Gestionar Roles y Permisos (Admin)' },
    { id: 'ticket_config:manage', label: 'Configurar Ticket (Admin)' },
];
const roleFormSchema = z.object({
  name: z.string().min(2, "El nombre del rol debe tener al menos 2 caracteres."),
  permissions: z.array(z.string()).optional(), 
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

function RolesPageContent() {
    const { toast } = useToast();
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [editingRole, setEditingRole] = useState<AppRole | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const formCardRef = useRef<HTMLDivElement>(null);
    const form = useForm<RoleFormValues>({ resolver: zodResolver(roleFormSchema), defaultValues: { name: '', permissions: [] } });

    useEffect(() => { setRoles(placeholderAppRoles); }, []);
    useEffect(() => { if (isFormOpen && formCardRef.current) formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [isFormOpen]);
    
    const filteredRoles = useMemo(() => roles.filter(role => role.name.toLowerCase().includes(searchTerm.toLowerCase())), [roles, searchTerm]);
    const handleOpenForm = (roleToEdit?: AppRole) => { /* ...logic... */ };
    const onSubmit = async (data: RoleFormValues) => { /* ...logic... */ };
    const handleDeleteRole = async (roleId: string) => { /* ...logic... */ };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div><CardTitle>Lista de Roles</CardTitle><CardDescription>Roles definidos en el sistema.</CardDescription></div>
                    <Button onClick={() => handleOpenForm()}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Rol</Button>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por nombre de rol..."
                                className="w-full rounded-lg bg-background pl-8 md:w-1/3"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    {filteredRoles.length > 0 ? (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader className="bg-black">
                                    <TableRow>
                                        <TableHead className="text-white">Nombre del Rol</TableHead>
                                        <TableHead className="text-white">Permisos</TableHead>
                                        <TableHead className="text-right text-white">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRoles.map(role => (
                                        <TableRow key={role.id}>
                                            <TableCell className="font-medium">{role.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{role.permissions.length} permisos activos</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenForm(role)} className="mr-2"><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <Shield className="h-12 w-12 mb-2" />
                            <h3 className="text-lg font-semibold text-foreground">No se encontraron roles</h3>
                            <p className="text-sm">Intente cambiar su búsqueda o agregue un nuevo rol.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            {isFormOpen && (
                 <Card className="mt-8" ref={formCardRef}>
                    <CardHeader><CardTitle>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</CardTitle></CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* Role Form Fields */}
                            </form>
                        </Form>
                    </CardContent>
                 </Card>
            )}
        </div>
    );
}
//--- End Content for Roles Page ---


//--- Start Content for Migración Page ---
type MigrationResult = | { type: 'generic'; vehicles: ExtractedGenericVehicle[]; services: ExtractedService[]; vehiclesAdded: number; servicesAdded: number; } | { type: 'vehicles'; vehicles: ExtractedVehicleForMigration[]; vehiclesAdded: number; } | { type: 'products'; products: ExtractedProduct[]; productsAdded: number; };

function MigracionPageContent() {
    const [workbook, setWorkbook] = useState<any | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
    const [activeTab, setActiveTab] = useState<'vehiculos' | 'productos' | 'ia'>('vehiculos');
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { /* ...logic... */ };
    const handleSheetChange = async (sheetName: string) => { /* ...logic... */ };
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => { /* ...logic... */ };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit}>
            <Card className="shadow-lg">
                <CardHeader><CardTitle>1. Cargar Archivo</CardTitle><CardDescription>Sube un archivo <code>.xlsx</code> con tu historial.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    {/* File Upload and Sheet Selection JSX */}
                </CardContent>
            </Card>
          </form>
        </div>
        <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="vehiculos"><Car className="mr-2 h-4 w-4"/>Vehículos</TabsTrigger>
                    <TabsTrigger value="productos"><Package className="mr-2 h-4 w-4"/>Productos</TabsTrigger>
                    <TabsTrigger value="ia"><BrainCircuit className="mr-2 h-4 w-4"/>Análisis IA</TabsTrigger>
                </TabsList>
                {/* TabsContent for each migration type */}
            </Tabs>
        </div>
      </div>
    );
}
//--- End Content for Migración Page ---


// --- Main Component ---
function AdministracionPageComponent() {
    const searchParams = useSearchParams();
    const defaultSubTab = searchParams.get('tab') || 'usuarios';
    const [adminTab, setAdminTab] = useState(defaultSubTab);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
            if (authUserString) {
                try {
                    setCurrentUser(JSON.parse(authUserString));
                } catch (e) {
                    console.error("Failed to parse authUser for admin page:", e);
                }
            }
        }
    }, []);

    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Administración del Sistema</h1>
                <p className="text-primary-foreground/80 mt-1">Gestiona usuarios, roles y realiza migraciones de datos.</p>
            </div>
            
            <Tabs value={adminTab} onValueChange={setAdminTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Usuarios</TabsTrigger>
                    <TabsTrigger value="roles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Roles y Permisos</TabsTrigger>
                    <TabsTrigger value="migracion" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Migración de Datos</TabsTrigger>
                </TabsList>
                <TabsContent value="usuarios" className="mt-0">
                    <UsuariosPageContent currentUser={currentUser} />
                </TabsContent>
                <TabsContent value="roles" className="mt-0">
                    <RolesPageContent />
                </TabsContent>
                <TabsContent value="migracion" className="mt-0">
                    <MigracionPageContent />
                </TabsContent>
            </Tabs>
        </>
    );
}

export default function AdministracionPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <AdministracionPageComponent />
        </Suspense>
    );
}
