

import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { User, AppRole, AuditLog } from "@/types";

const logAudit = async (
  actionType: AuditLog['actionType'],
  description: string,
  details: { entityType?: AuditLog['entityType']; entityId?: string; userId: string; userName: string; }
): Promise<void> => {
  if (!db) return;
  await addDoc(collection(db, 'auditLogs'), {
    ...details,
    actionType,
    description,
    date: serverTimestamp(),
  });
};

const getUsers = async (): Promise<User[]> => {
    if (!db) return [];
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

const getRoles = async (): Promise<AppRole[]> => {
    if (!db) return [];
    const rolesCollection = collection(db, 'appRoles');
    const rolesSnapshot = await getDocs(rolesCollection);
    return rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppRole));
};

const getAuditLogs = async (): Promise<AuditLog[]> => {
    if (!db) return [];
    const auditLogsCollection = collection(db, 'auditLogs');
    const auditLogsSnapshot = await getDocs(auditLogsCollection);
    return auditLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
};

const saveUser = async (user: User, adminUser: User): Promise<User> => {
    if (!db) throw new Error("Database not initialized.");
    
    const isEditing = !!user.id;
    let userId = user.id;

    // Destructure to separate id and password from the data to be saved
    const { id, password, ...userData } = user;
    
    const description = `Se ${isEditing ? 'actualizó el perfil del' : 'creó el'} usuario "${user.name}" (Email: ${user.email}).`;

    if (isEditing) {
        if(!userId) throw new Error("User ID is missing for an update operation.");
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, userData);
    } else {
        // For creation, add createdAt timestamp
        const newUserRef = await addDoc(collection(db, 'users'), { ...userData, createdAt: new Date().toISOString() });
        userId = newUserRef.id;
    }
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Usuario', entityId: userId, userId: adminUser.id, userName: adminUser.name });
    
    // Return the full user object including the ID
    return { id: userId, ...userData };
};


const deleteUser = async (userId: string, adminUser: User): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const userDocRef = doc(db, 'users', userId);
    
    const userDoc = await getDoc(userDocRef);
    const userName = userDoc.exists() ? userDoc.data().name : `ID ${userId}`;

    await deleteDoc(userDocRef);
    await logAudit('Eliminar', `Eliminó al usuario "${userName}".`, { entityType: 'Usuario', entityId: userId, userId: adminUser.id, userName: adminUser.name });
};

const saveRole = async (role: AppRole, adminUser: User): Promise<AppRole> => {
    if (!db) throw new Error("Database not initialized.");
    let id = role.id;
    const { id: _, ...roleData } = role;
    const isEditing = !!id;
    const description = `Se ${isEditing ? 'actualizó el' : 'creó la nueva'} categoría de inventario: "${role.name}".`;

    if (isEditing) {
        await updateDoc(doc(db, 'appRoles', id), roleData);
    } else {
        const newRoleRef = await addDoc(collection(db, 'appRoles'), roleData);
        id = newRoleRef.id;
    }
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Rol', entityId: id, userId: adminUser.id, userName: adminUser.name });
    return { id, ...roleData };
};

const deleteRole = async (roleId: string, adminUser: User): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const roleDoc = doc(db, 'appRoles', roleId);
    await deleteDoc(roleDoc);
    await logAudit('Eliminar', `Se eliminó el rol con ID "${roleId}".`, { entityType: 'Rol', entityId: roleId, userId: adminUser.id, userName: adminUser.name });
};

const updateUserProfile = async (user: User): Promise<User> => {
    if (!db) throw new Error("Database not initialized.");
    const { id, ...userData } = user;
    if (!id) throw new Error("User ID is required to update profile.");
    
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, userData);

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
