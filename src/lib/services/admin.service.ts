

import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { User, AppRole, AuditLog } from "@/types";
import { cleanObjectForFirestore, parseDate } from '../forms';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Logs an audit trail entry for significant actions.
 * @param actionType - The type of action (e.g., 'Crear', 'Editar', 'Eliminar').
 * @param description - A human-readable description of the action.
 * @param details - Contextual details about the action.
 */
export const logAudit = async (
  actionType: AuditLog['actionType'],
  description: string,
  details: Partial<Omit<AuditLog, 'id' | 'createdAt' | 'actionType' | 'description'>> = {}
): Promise<void> => {
  if (!db) {
    console.error("Audit log failed: Database not initialized.");
    return;
  }
  const newLog: Omit<AuditLog, "id"> = {
    ...details,
    actionType,
    description,
    createdAt: serverTimestamp(),
  };
  try {
    await addDoc(collection(db, 'auditLogs'), newLog as any);
  } catch (error) {
    console.error("Failed to write audit log:", error instanceof Error ? error.message : String(error));
  }
};

/**
 * Subscribes to real-time updates of the users collection.
 * @param callback - Function to be called with the array of users on each update.
 * @returns An unsubscribe function.
 */
const onUsersUpdate = (callback: (users: User[]) => void): (() => void) => {
    if (!db) return () => {};
    const usersCollection = collection(db, 'users');
    return onSnapshot(usersCollection, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (error) => console.error("Error listening to users:", error instanceof Error ? error.message : String(error)));
};

/**
 * Fetches the current list of users once.
 * @returns A promise that resolves to an array of users.
 */
const onUsersUpdatePromise = async (): Promise<User[]> => {
    if (!db) return [];
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};


/**
 * Subscribes to real-time updates of the application roles.
 * @param callback - Function to be called with the array of roles on each update.
 * @returns An unsubscribe function.
 */
const onRolesUpdate = (callback: (roles: AppRole[]) => void): (() => void) => {
    if (!db) return () => {};
    const rolesCollection = collection(db, 'appRoles');
    return onSnapshot(rolesCollection, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppRole)));
    }, (error) => console.error("Error listening to roles:", error instanceof Error ? error.message : String(error)));
};

/**
 * Subscribes to real-time updates of audit logs, ordered by date descending.
 * @param callback - Function to be called with the array of logs on each update.
 * @returns An unsubscribe function.
 */
const onAuditLogsUpdate = (callback: (logs: AuditLog[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'auditLogs'), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuditLog));
        callback(items);
    }, (error) => console.error("Error listening to audit logs:", error instanceof Error ? error.message : String(error)));
};

/**
 * Creates or updates a user in Firestore.
 * @param user - The user object to be saved. Can be a partial object for updates.
 * @param adminUser - The administrator performing the action.
 * @returns The saved user object, including its ID.
 */
const saveUser = async (user: Partial<User>, adminUser: User): Promise<User> => {
    if (!db) throw new Error("Database not initialized.");
    
    const isEditing = !!user.id;
    const { password, ...userData } = user as any;
    const cleanedData = cleanObjectForFirestore(userData);

    try {
        let userId = user.id;
        if (isEditing) {
            if(!userId) throw new Error("User ID is missing for an update operation.");
            await updateDoc(doc(db, 'users', userId), cleanedData);
        } else {
            const newUserRef = await addDoc(collection(db, 'users'), { ...cleanedData, createdAt: serverTimestamp() });
            userId = newUserRef.id;
        }

        const description = `${isEditing ? 'Actualizó' : 'Creó'} al usuario "${user.name}" (Email: ${user.email}).`;
        await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Usuario', entityId: userId, userId: adminUser.id, userName: adminUser.name });

        const savedUserDoc = await getDoc(doc(db, 'users', userId));
        if (!savedUserDoc.exists()) throw new Error("Failed to retrieve saved user.");
        return { id: userId, ...savedUserDoc.data() } as User;
    } catch (error) {
        console.error(`Error saving user ${user.email}:`, error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to save user. ${error instanceof Error ? error.message : ''}`);
    }
};

/**
 * Archives or un-archives a user in Firestore.
 * @param userId - The ID of the user to archive/un-archive.
 * @param archive - Boolean indicating whether to archive (true) or un-archive (false).
 * @param adminUser - The administrator performing the action.
 */
const archiveUser = async (userId: string, archive: boolean, adminUser: User): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const userDocRef = doc(db, 'users', userId);
    
    try {
        const userDoc = await getDoc(userDocRef);
        const userName = userDoc.exists() ? userDoc.data().name : `ID ${userId}`;

        await updateDoc(userDocRef, { isArchived: archive });

        const action = archive ? 'Archivar' : 'Restaurar';
        const description = `${archive ? 'Archivó' : 'Restauró'} al usuario "${userName}".`;
        await logAudit(action, description, { entityType: 'Usuario', entityId: userId, userId: adminUser.id, userName: adminUser.name });
    } catch (error) {
        console.error(`Error archiving user ${userId}:`, error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to archive user. ${error instanceof Error ? error.message : ''}`);
    }
};


/**
 * Creates or updates an application role in Firestore.
 * @param role - The role object to save.
 * @param adminUser - The administrator performing the action.
 * @param roleId - The ID of the role if it's being edited.
 * @returns The saved role object.
 */
const saveRole = async (role: Omit<AppRole, 'id'>, adminUser: User, roleId?: string): Promise<AppRole> => {
    if (!db) throw new Error("Database not initialized.");
    const isEditing = !!roleId;
    const cleanedData = cleanObjectForFirestore(role);
    
    try {
        let id = roleId;
        if (isEditing) {
            await updateDoc(doc(db, 'appRoles', id!), cleanedData);
        } else {
            const newRoleRef = await addDoc(collection(db, 'appRoles'), cleanedData);
            id = newRoleRef.id;
        }

        const description = `${isEditing ? 'Actualizó el' : 'Creó el'} rol: "${role.name}".`;
        await logAudit(isEditing ? 'Editar' : 'Crear', description, { entityType: 'Rol', entityId: id!, userId: adminUser.id, userName: adminUser.name });
        return { id: id!, ...role };
    } catch (error) {
        console.error(`Error saving role ${role.name}:`, error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to save role. ${error instanceof Error ? error.message : ''}`);
    }
};

/**
 * Deletes a role from Firestore.
 * @param roleId - The ID of the role to delete.
 * @param adminUser - The administrator performing the action.
 */
const deleteRole = async (roleId: string, adminUser: User): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const roleDocRef = doc(db, 'appRoles', roleId);

    try {
        const roleDoc = await getDoc(roleDocRef);
        const roleName = roleDoc.exists() ? roleDoc.data().name : `ID ${roleId}`;

        await deleteDoc(roleDocRef);
        await logAudit('Eliminar', `Se eliminó el rol "${roleName}".`, { entityType: 'Rol', entityId: roleId, userId: adminUser.id, userName: adminUser.name });
    } catch (error) {
        console.error(`Error deleting role ${roleId}:`, error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to delete role. ${error instanceof Error ? error.message : ''}`);
    }
};

/**
 * Updates a user's profile information.
 * @param user - A partial user object containing the fields to update. Must include the user's ID.
 * @returns The updated user object.
 */
const updateUserProfile = async (user: Partial<User> & { id: string }): Promise<User> => {
    if (!db) throw new Error("Database not initialized.");
    const { id, ...userData } = user;
    const userRef = doc(db, 'users', id);

    try {
        await updateDoc(userRef, cleanObjectForFirestore(userData));
        const updatedDoc = await getDoc(userRef);
        if (!updatedDoc.exists()) throw new Error("User document disappeared after update.");
        return { id, ...updatedDoc.data() } as User;
    } catch (error) {
        console.error(`Error updating profile for user ${id}:`, error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to update profile. ${error instanceof Error ? error.message : ''}`);
    }
};

const getDocById = async (col: string, id: string) => {
    const snap = await getDoc(doc(db, col, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const adminService = {
    onUsersUpdate,
    onUsersUpdatePromise,
    onRolesUpdate,
    onAuditLogsUpdate,
    saveUser,
    archiveUser,
    saveRole,
    deleteRole,
    updateUserProfile,
    logAudit,
    getDocById,
};
