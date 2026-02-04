"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
    Loader2, Wand2, Calculator, Info, 
    PlusCircle, CheckCircle2, TrendingUp 
} from 'lucide-react';
import { suggestQuote, type QuoteSuggestionOutput } from '@/ai/flows/quote-suggestion-flow';
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function CotizadorIaContent() {
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QuoteSuggestionOutput | null>(null);

  const handleGenerateQuote = async () => {
    if (!description.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const quote = await suggestQuote({ serviceDescription: description });
      setResult(quote);
      toast({ title: "Cotización Generada", description: "La IA ha analizado los costos." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo generar la cotización.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Columna Izquierda: Input */}
      <Card className="flex flex-col shadow-lg border-primary/5 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Cotizador Mágico
          </CardTitle>
          <CardDescription>
            Describe el problema o servicio y la IA generará una propuesta detallada.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4 pt-6">
          <div className="flex-1">
            <Textarea 
              placeholder="Ej: El cliente reporta ruido al frenar y quiere afinación para un Versa 2018..."
              className="h-full min-h-[250px] resize-none text-base border-none bg-muted/20 focus-visible:ring-primary shadow-inner rounded-xl"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleGenerateQuote} 
            disabled={isLoading || !description.trim()}
            className="w-full h-14 text-lg font-bold shadow-lg"
          >
            {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Wand2 className="mr-2 h-6 w-6" />}
            Generar Cotización Inteligente
          </Button>
        </CardContent>
      </Card>

      {/* Columna Derecha: Resultado */}
      <Card className="flex flex-col shadow-lg border-primary/5 rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Propuesta Estimada
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          {!result && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 text-muted-foreground opacity-50">
              <Calculator className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Esperando datos...</p>
              <p className="text-sm max-w-xs mt-2">La propuesta aparecerá aquí una vez que la IA analice tu solicitud.</p>
            </div>
          )}

          {isLoading && (
            <div className="h-full flex flex-col items-center justify-center p-12 space-y-4">
                <div className="relative">
                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    <Wand2 className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center animate-pulse">
                    <p className="font-bold text-xl">Consultando bases de datos...</p>
                    <p className="text-sm text-muted-foreground">Calculando precios de mercado y tiempos de obra.</p>
                </div>
            </div>
          )}

          {result && (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="p-6 space-y-6">
                {/* Ítems */}
                <div className="space-y-3">
                  {result.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-card border shadow-sm group hover:border-primary/20 transition-colors">
                      <div className="flex gap-3 items-center">
                        <Badge variant={item.type === 'work' ? 'secondary' : 'outline'} className="rounded-lg h-6">
                          {item.type === 'work' ? 'Obra' : 'Parte'}
                        </Badge>
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                      </div>
                      <span className="font-bold">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Total */}
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Total Estimado Sugerido</p>
                      <p className="text-4xl font-black text-primary">{formatCurrency(result.estimatedTotal)}</p>
                    </div>
                    <Badge className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-1">
                      IVA Incluido
                    </Badge>
                  </div>
                </div>

                {/* Razonamiento */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                    <Info className="h-4 w-4" />
                    NOTAS DE LA IA
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl text-sm italic leading-relaxed text-muted-foreground border-l-4 border-primary/20">
                    "{result.reasoning}"
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setResult(null)}>Limpiar</Button>
                    <Button className="flex-1 rounded-xl h-12 gap-2" variant="secondary">
                        <PlusCircle className="h-4 w-4" /> Crear Cotización Real
                    </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
