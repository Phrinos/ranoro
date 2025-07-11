

import type { User, AppRole, AuditLog } from "@/types";
import { placeholderUsers, placeholderAppRoles, placeholderAuditLogs, persistToFirestore, logAudit } from "@/lib/placeholder-data";

const getUsers = async (): Promise<User[]> => {
    return [...placeholderUsers];
};

const getRoles = async (): Promise<AppRole[]> => {
    return [...placeholderAppRoles];
};

const getAuditLogs = async (): Promise<AuditLog[]> => {
    return [...placeholderAuditLogs];
};

// Functions to modify local data and then "persist"
const saveUser = async (user: User): Promise<User> => {
    const isEditing = !!user.id;
    const description = `Se ${isEditing ? 'actualizó el perfil del' : 'creó el'} usuario "${user.name}" (Email: ${user.email}).`;

    if (isEditing) {
        const index = placeholderUsers.findIndex(u => u.id === user.id);
        if (index > -1) placeholderUsers[index] = user;
    } else {
        const newUser = { ...user, id: `user_${Date.now()}` };
        placeholderUsers.push(newUser);
    }
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Usuario', entityId: user.id });
    await persistToFirestore(['users', 'auditLogs']);
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

const saveRole = async (role: AppRole): Promise<AppRole> => {
    const isEditing = !!role.id;
    const description = `Se ${isEditing ? 'actualizó el' : 'creó la nueva'} categoría de inventario: "${role.name}".`;

    if (isEditing) {
      const index = placeholderAppRoles.findIndex(r => r.id === role.id);
      if (index > -1) placeholderAppRoles[index] = role;
    } else {
      const newRole = { ...role, id: `role_${Date.now()}` };
      placeholderAppRoles.push(newRole);
    }
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Rol', entityId: role.id });
    await persistToFirestore(['appRoles', 'auditLogs']);
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
    
    placeholderUsers[userIndex] = { ...placeholderUsers[userIndex], ...user };
    await persistToFirestore(['users']);

    return placeholderUsers[userIndex];
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
