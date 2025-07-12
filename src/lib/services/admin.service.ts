
import {
  collection,
  onSnapshot,
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
  const newLog = {
    ...details,
    actionType,
    description,
    date: new Date().toISOString(), // Use client-side ISO string for consistency
  };
  await addDoc(collection(db, 'auditLogs'), newLog);
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

const saveUser = async (user: Partial<User>, adminUser: User): Promise<User> => {
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
    const savedUserDoc = await getDoc(doc(db, 'users', userId));
    return { id: userId, ...savedUserDoc.data() } as User;
};


const deleteUser = async (userId: string, adminUser: User): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const userDocRef = doc(db, 'users', userId);
    
    const userDoc = await getDoc(userDocRef);
    const userName = userDoc.exists() ? userDoc.data().name : `ID ${userId}`;

    await deleteDoc(userDocRef);
    await logAudit('Eliminar', `Eliminó al usuario "${userName}".`, { entityType: 'Usuario', entityId: userId, userId: adminUser.id, userName: adminUser.name });
};

const saveRole = async (role: Omit<AppRole, 'id'>, adminUser: User, roleId?: string): Promise<AppRole> => {
    if (!db) throw new Error("Database not initialized.");
    const isEditing = !!roleId;
    const description = `Se ${isEditing ? 'actualizó el' : 'creó la nueva'} rol: "${role.name}".`;
    let id = roleId;

    if (isEditing) {
        await updateDoc(doc(db, 'appRoles', id!), role);
    } else {
        const newRoleRef = await addDoc(collection(db, 'appRoles'), role);
        id = newRoleRef.id;
    }
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Rol', entityId: id, userId: adminUser.id, userName: adminUser.name });
    return { id, ...role };
};

const deleteRole = async (roleId: string, adminUser: User): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const roleDocRef = doc(db, 'appRoles', roleId);
    
    const roleDoc = await getDoc(roleDocRef);
    const roleName = roleDoc.exists() ? roleDoc.data().name : `ID ${roleId}`;

    await deleteDoc(roleDocRef);
    await logAudit('Eliminar', `Se eliminó el rol "${roleName}".`, { entityType: 'Rol', entityId: roleId, userId: adminUser.id, userName: adminUser.name });
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
