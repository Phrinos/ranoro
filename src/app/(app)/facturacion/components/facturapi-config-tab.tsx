"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

const configSchema = z.object({
  liveSecretKey: z.string().min(1, "La llave secreta es requerida"),
});

type ConfigValues = z.infer<typeof configSchema>;

export function FacturapiConfigTab() {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<ConfigValues>({
    resolver: zodResolver(configSchema),
    defaultValues: { liveSecretKey: "" },
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, "settings", "billing");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          form.reset({ liveSecretKey: data.liveSecretKey || "" });
        }
      } catch (e: any) {
        console.error("Error loading config:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, [form]);

  const onSubmit = async (values: ConfigValues) => {
    try {
      const docRef = doc(db, "settings", "billing");
      await setDoc(docRef, { liveSecretKey: values.liveSecretKey }, { merge: true });
      toast({ title: "Configuración Guardada", description: "Las llaves de Facturapi han sido actualizadas." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-sm max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Configuración Facturapi
        </CardTitle>
        <CardDescription>Instala aquí la llave secreta para que el portal público genere las facturas correctamente.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="liveSecretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Live Secret Key o Test Secret Key (Facturapi)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="sk_live_..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
