// src/app/(app)/usuarios/actions.ts
"use server";

import type { UpdateRequest } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { requireActionAuth } from "@/lib/server-auth";

interface SyncUserParams {
  /** ID token del usuario que invoca (debe ser Superadministrador). */
  idToken: string;
  id?: string;
  email: string;
  name: string;
  password?: string;
}

/**
 * Creates or updates a Firebase Auth user and returns their UID.
 * On create: a new user is created in Firebase Auth.
 * On update: email/displayName are updated; password only if provided.
 *
 * SEGURIDAD: usa el Admin SDK (privilegios totales). Exige que el invocador
 * sea Superadministrador — sin esto sería un vector de account-takeover.
 */
export async function syncFirebaseAuthUser(params: SyncUserParams): Promise<string> {
  const { idToken, id, email, name, password } = params;
  await requireActionAuth(idToken, { minRole: "superadmin" });

  const auth = getAdminAuth();

  if (id) {
    const updateData: UpdateRequest = { email, displayName: name };
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
