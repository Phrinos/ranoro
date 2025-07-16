

import {
  collection,
  onSnapshot,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { User, AppRole, AuditLog } from "@/types";
import { cleanObjectForFirestore } from '../forms';

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

const onUsersUpdate = (callback: (users: User[]) => void): (() => void) => {
    if (!db) return () => {};
    const usersCollection = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });
    return unsubscribe;
};

const onRolesUpdate = (callback: (roles: AppRole[]) => void): (() => void) => {
    if (!db) return () => {};
    const rolesCollection = collection(db, 'appRoles');
    const unsubscribe = onSnapshot(rolesCollection, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppRole)));
    });
    return unsubscribe;
};

const onAuditLogsUpdate = (callback: (logs: AuditLog[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'auditLogs'), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
    });
    return unsubscribe;
};

const saveUser = async (user: Partial<User>, adminUser: User): Promise<User> => {
    if (!db) throw new Error("Database not initialized.");
    
    const isEditing = !!user.id;
    let userId = user.id;

    // Destructure to separate id and password from the data to be saved
    const { id, password, ...userData } = user;
    
    const description = `Se ${isEditing ? 'actualizó el perfil del' : 'creó el'} usuario "${user.name}" (Email: ${user.email}).`;

    const cleanedData = cleanObjectForFirestore(userData);

    if (isEditing) {
        if(!userId) throw new Error("User ID is missing for an update operation.");
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, cleanedData);
    } else {
        // For creation, add createdAt timestamp
        const newUserRef = await addDoc(collection(db, 'users'), { ...cleanedData, createdAt: new Date().toISOString() });
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

    const cleanedData = cleanObjectForFirestore(role);

    if (isEditing) {
        await updateDoc(doc(db, 'appRoles', id!), cleanedData);
    } else {
        const newRoleRef = await addDoc(collection(db, 'appRoles'), cleanedData);
        id = newRoleRef.id;
    }
    
    await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Rol', entityId: id!, userId: adminUser.id, userName: adminUser.name });
    return { id: id!, ...role };
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
    await updateDoc(userRef, cleanObjectForFirestore(userData));

    return user;
};

export const adminService = {
    onUsersUpdate,
    onRolesUpdate,
    onAuditLogsUpdate,
    saveUser,
    deleteUser,
    saveRole,
    deleteRole,
    updateUserProfile,
};
