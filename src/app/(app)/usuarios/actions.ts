// src/app/(app)/usuarios/actions.ts
"use server";

import { getAdminAuth } from "@/lib/firebaseAdmin";

interface SyncUserParams {
  id?: string;
  email: string;
  name: string;
  password?: string;
}

/**
 * Creates or updates a Firebase Auth user and returns their UID.
 * On create: a new user is created in Firebase Auth.
 * On update: email/displayName are updated; password only if provided.
 */
export async function syncFirebaseAuthUser(params: SyncUserParams): Promise<string> {
  const { id, email, name, password } = params;
  const auth = getAdminAuth();

  if (id) {
    const updateData: any = { email, displayName: name };
    if (password && password.length >= 6) {
      updateData.password = password;
    }
    await auth.updateUser(id, updateData);
    return id;
  } else {
    const user = await auth.createUser({
      email,
      displayName: name,
      password: password || Math.random().toString(36).slice(-10),
    });
    return user.uid;
  }
}
