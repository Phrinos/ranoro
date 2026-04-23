"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, KeyRound, ExternalLink, User, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Separator } from "@/components/ui/separator";

const configSchema = z.object({
  liveSecretKey: z.string().optional(),
  facturapiUser: z.string().optional(),
  facturapiPass: z.string().optional(),
});

type ConfigValues = z.infer<typeof configSchema>;

export function FacturapiConfigTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { toast } = useToast();

  const form = useForm<ConfigValues>({
    resolver: zodResolver(configSchema),
    defaultValues: { liveSecretKey: "", facturapiUser: "", facturapiPass: "" },
  });

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const docRef = doc(db, "settings", "billing");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          form.reset({ 
            liveSecretKey: data.liveSecretKey || "",
            facturapiUser: data.facturapiUser || "",
            facturapiPass: data.facturapiPass || ""
          });
        }
      } catch (e: any) {
        console.error("Error loading config:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadConfig();
    return () => { isMounted = false; };
  }, [form]);

  const onSubmit = async (values: ConfigValues) => {
    try {
      const docRef = doc(db, "settings", "billing");
      await setDoc(docRef, { 
        liveSecretKey: values.liveSecretKey,
        facturapiUser: values.facturapiUser,
        facturapiPass: values.facturapiPass
      }, { merge: true });
      toast({ title: "Configuración Guardada", description: "Las credenciales de Facturapi han sido actualizadas." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-xs max-w-3xl border-slate-200">
      <CardHeader className="bg-muted/20 border-b border-slate-100 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl text-primary">
              <KeyRound className="h-5 w-5" />
              Configuración de Facturapi
            </CardTitle>
            <CardDescription className="mt-1">
              Administra tus llaves de API y anota tus accesos al portal de Facturapi para tenerlos a la mano.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="hidden sm:flex bg-slate-50 border-slate-200 text-slate-700 hover:text-primary">
            <a href="https://dashboard.facturapi.io" target="_blank" rel="noreferrer">
              Ir a Facturapi <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* API Key Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Llave de Integración (API Key)</h3>
                <FormField
                  control={form.control}
                  name="liveSecretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Secret Key (Live o Test)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showKey ? "text" : "password"} 
                            placeholder="sk_live_..." 
                            className="pr-10 font-mono text-sm bg-slate-50/50"
                            {...field} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Si dejas este campo en blanco, el sistema operará en <strong>Modo Pruebas Interno</strong> (sin comunicarse con Facturapi).
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Login Credentials Reference */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Accesos al Dashboard (Solo de Referencia)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Guarda tu usuario y contraseña de Facturapi para no olvidarlos.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facturapiUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600">Usuario / Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="usuario@correo.com" className="pl-9 bg-slate-50/50" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="facturapiPass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600">Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                              type={showPass ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="pl-9 pr-10 bg-slate-50/50" 
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass(!showPass)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-[150px] shadow-sm">
                  {form.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar Configuración
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
