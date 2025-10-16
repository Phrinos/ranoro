
// src/app/api/auth/login/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json({ error: "No token provided." }, { status: 400 });
    }

    // El token de Firebase se valida en el middleware. Aquí solo establecemos la cookie.
    // Es seguro ya que el middleware es el guardián de las rutas protegidas.
    cookies().set("AuthToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: "/",
    });
    
    return NextResponse.json({ success: true, message: "Session cookie set." });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
