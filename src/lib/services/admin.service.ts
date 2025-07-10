
'use server';

import type { User, AppRole, AuditLog } from "@/types";
import { placeholderUsers, placeholderAppRoles, placeholderAuditLogs, persistToFirestore, logAudit, defaultSuperAdmin } from "@/lib/placeholder-data";

const getUsers = async (): Promise<User[]> => {
    return [...placeholderUsers];
};

const getRoles = async (): Promise<AppRole[]> => {
    return [...placeholderAppRoles];
};

const getAuditLogs = async (): Promise<AuditLog[]> => {
    return [...placeholderAuditLogs];
};

const saveUser = async (user: User, isEditing: boolean): Promise<User> => {
    const description = `Se ${isEditing ? 'actualizó el perfil del' : 'creó el'} usuario "${user.name}" (Email: ${user.email}).`;

    if (isEditing) {
        const userIndex = placeholderUsers.findIndex(u => u.id === user.id);
        if (userIndex > -1) {
            placeholderUsers[userIndex] = { ...placeholderUsers[userIndex], ...user, password: '' };
        }
    } else {
        const newUser: User = { id: `user_${Date.now()}`, ...user, password: '' };
        placeholderUsers.push(newUser);
    }
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Usuario', entityId: user.id || 'new' });
    // Audit log function already persists
    // await persistToFirestore(['users', 'auditLogs']); 
    return user;
};

const deleteUser = async (userId: string): Promise<void> => {
    const userToDelete = placeholderUsers.find(u => u.id === userId);
    if (!userToDelete) return;

    await logAudit('Eliminar', `Eliminó al usuario "${userToDelete.name}" (Email: ${userToDelete.email}).`, { entityType: 'Usuario', entityId: userId });
    
    const index = placeholderUsers.findIndex(u => u.id === userId);
    if (index > -1) {
        placeholderUsers.splice(index, 1);
        await persistToFirestore(['users', 'auditLogs']);
    }
};

const saveRole = async (role: AppRole, isEditing: boolean): Promise<AppRole> => {
    const description = `Se ${isEditing ? 'actualizó la' : 'creó la nueva'} categoría de inventario: "${role.name}".`;

    if (isEditing) {
      const index = placeholderAppRoles.findIndex(r => r.id === role.id);
      if (index > -1) placeholderAppRoles[index] = role;
    } else {
      placeholderAppRoles.push({ ...role, id: `role_${Date.now()}` });
    }
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Rol', entityId: role.id });
    return role;
};

const deleteRole = async (roleId: string): Promise<void> => {
    const roleToDelete = placeholderAppRoles.find(r => r.id === roleId);
    if (!roleToDelete) return;

    await logAudit('Eliminar', `Se eliminó el rol "${roleToDelete.name}".`, { entityType: 'Rol', entityId: roleId });
    
    const index = placeholderAppRoles.findIndex(r => r.id === roleId);
    if (index > -1) {
        placeholderAppRoles.splice(index, 1);
        await persistToFirestore(['appRoles', 'auditLogs']);
    }
};

const updateUserProfile = async (user: User): Promise<User> => {
    const userIndex = placeholderUsers.findIndex(u => u.id === user.id);
    if (userIndex === -1) throw new Error("User not found");
    
    placeholderUsers[userIndex] = user;
    await persistToFirestore(['users']);
    return user;
};

export const adminService = {
    getUsers,
    getRoles,
    getAuditLogs,
    saveUser,
    deleteUser,
    saveRole,
    deleteRole,
    updateUserProfile,
};
