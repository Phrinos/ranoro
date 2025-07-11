

import type { User, AppRole, AuditLog } from "@/types";
import { placeholderUsers, placeholderAppRoles, placeholderAuditLogs, persistToFirestore, logAudit, defaultSuperAdmin, AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient.js';

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

    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const adminUser: User | null = authUserString ? JSON.parse(authUserString) : defaultSuperAdmin;
    const tenantId = adminUser?.tenantId;

    if (!tenantId) {
        throw new Error("Could not determine tenantId for new user.");
    }
    
    const userId = user.id || `user_${Date.now()}`;
    const userData = { ...user, id: userId, password: '', tenantId };

    if (isEditing) {
        const userIndex = placeholderUsers.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            placeholderUsers[userIndex] = userData;
        }
    } else {
        placeholderUsers.push(userData);
    }
    
    // Persist to the top-level /users collection
    await setDoc(doc(db, "users", userId), { ...userData, password: '' });
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Usuario', entityId: userId });
    
    // The main persistToFirestore no longer handles the users array.
    // We don't need to call it here unless other data changed.
    return userData;
};

const deleteUser = async (userId: string): Promise<void> => {
    const userToDelete = placeholderUsers.find(u => u.id === userId);
    if (!userToDelete) return;

    await logAudit('Eliminar', `Eliminó al usuario "${userToDelete.name}" (Email: ${userToDelete.email}).`, { entityType: 'Usuario', entityId: userId });
    
    const index = placeholderUsers.findIndex(u => u.id === userId);
    if (index > -1) {
        placeholderUsers.splice(index, 1);
        await persistToFirestore(['auditLogs']);
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
    
    // Update local placeholder
    placeholderUsers[userIndex] = { ...placeholderUsers[userIndex], ...user };

    // Update in Firestore /users collection
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(userDocRef, { ...user, password: '' }, { merge: true }); // Ensure password is not stored

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
