// src/app/(app)/servicios/nuevo/page.tsx
"use client";

// This route creates a new service — reuse the [id] page with id="nuevo"
// Next.js will match /servicios/nuevo to this page, not to [id]/page.tsx
// We just redirect to the [id] editor which already handles the "nuevo" case.
import { redirect } from "next/navigation";

// Actually we serve the editor directly here since Next.js dynamic routes
// won't match "nuevo" if we have a static segment — so we just re-export the [id] page.
export { default } from "../[id]/page";
