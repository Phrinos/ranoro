'use server';

import { getAdminAuth } from '@/lib/firebaseAdmin';

export async function syncFirebaseAuthUser(user: { id?: string, email: string, name: string, password?: string }) {
  const auth = getAdminAuth();
  
  if (user.id) {
    // Si estamos editando y hay un ID
    // Primero, verifica si el usuario existe en Firebase Auth
    try {
        const existingUser = await auth.getUserByEmail(user.email);
        const updateData: any = { displayName: user.name };
        
        // Solo actualiza el password si se provee uno nuevo
        if (user.password && user.password.trim().length > 0) {
            updateData.password = user.password;
        }
        
        await auth.updateUser(existingUser.uid, updateData);
        return existingUser.uid;
    } catch (error: any) {
         // Si no existe, tenemos que crearlo con el uid definido (user.id)
         if (error.code === 'auth/user-not-found') {
              const authUser = await auth.createUser({
                  uid: user.id,
                  email: user.email,
                  password: user.password || 'ranoro2025', // Fallback si editamos pero no existía en Auth
                  displayName: user.name
              });
              return authUser.uid;
         }
         throw error;
    }
  } else {
      // Es un usuario completamente nuevo, crear en auth
      if (!user.password || user.password.trim() === '') {
          throw new Error('La contraseña es requerida para nuevos usuarios en Firebase Auth.');
      }
      
      try {
          const authUser = await auth.createUser({
              email: user.email,
              password: user.password,
              displayName: user.name
          });
          return authUser.uid; // Usaremos esto para el ID en Firestore
      } catch (error: any) {
          if (error.code === 'auth/email-already-exists') {
              throw new Error('El correo electrónico ya está registrado en el sistema de autenticación.');
          }
          throw error;
      }
  }
}
