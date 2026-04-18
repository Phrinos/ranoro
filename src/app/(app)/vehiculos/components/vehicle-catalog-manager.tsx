"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebaseClient";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, Car, Settings2, ChevronRight, Edit2, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MakeDoc {
  id: string; // The Make name
  models: string[];
}

export function VehicleCatalogManager() {
  const { toast } = useToast();
  const [makes, setMakes] = useState<MakeDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMake, setSelectedMake] = useState<MakeDoc | null>(null);
  
  const [newMakeName, setNewMakeName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState("");

  // Fetch all makes
  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      if (!db) return;
      const snapshot = await getDocs(collection(db, VEHICLE_COLLECTION));
      const fetchedMakes: MakeDoc[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let parsedModels: string[] = [];
        
        if (Array.isArray(data.models)) {
           parsedModels = data.models.map((m: any) => {
              if (typeof m === 'string') return m;
              if (m && typeof m === 'object' && m.name) return m.name;
              return '';
           }).filter(Boolean);
        }

        return {
          id: docSnap.id,
          models: Array.from(new Set(parsedModels)).sort()
        };
      }).sort((a, b) => a.id.localeCompare(b.id));

      setMakes(fetchedMakes);
      
      // Update selectedMake if it exists to refresh its models
      if (selectedMake) {
         const refreshed = fetchedMakes.find(m => m.id === selectedMake.id);
         setSelectedMake(refreshed || null);
      }
    } catch (error) {
      console.error("Error loaded catalog", error);
      toast({ title: "Error al cargar catálogo", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddMake = async (e: React.FormEvent) => {
    e.preventDefault();
    const make = newMakeName.trim();
    if (!make) return;
    if (makes.some(m => m.id === make)) {
      toast({ title: "La marca ya existe", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      await setDoc(doc(db, VEHICLE_COLLECTION, make), { models: [] });
      setNewMakeName("");
      toast({ title: "Marca agregada" });
      await fetchCatalog();
    } catch (error) {
       toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMake = async (makeId: string) => {
    if (!confirm(`¿Estás seguro de eliminar la marca ${makeId}? Todos sus modelos se perderán.`)) return;
    
    setIsProcessing(true);
    try {
       await deleteDoc(doc(db, VEHICLE_COLLECTION, makeId));
       if (selectedMake?.id === makeId) setSelectedMake(null);
       toast({ title: "Marca eliminada" });
       await fetchCatalog();
    } catch (error) {
       toast({ title: "Error al eliminar", variant: "destructive" });
    } finally {
       setIsProcessing(false);
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMake) return;
    const model = newModelName.trim();
    if (!model) return;
    if (selectedMake.models.includes(model)) {
      toast({ title: "El modelo ya existe", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const updatedModels = [...selectedMake.models, model].sort();
      await updateDoc(doc(db, VEHICLE_COLLECTION, selectedMake.id), {
        models: updatedModels
      });
      setNewModelName("");
      toast({ title: "Modelo agregado" });
      await fetchCatalog();
    } catch (error) {
      toast({ title: "Error al guardar modelo", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!selectedMake) return;
    if (!confirm(`¿Eliminar el modelo ${modelName} de ${selectedMake.id}?`)) return;

    setIsProcessing(true);
    try {
       const updatedModels = selectedMake.models.filter(m => m !== modelName);
       await updateDoc(doc(db, VEHICLE_COLLECTION, selectedMake.id), {
         models: updatedModels
       });
       toast({ title: "Modelo eliminado" });
       await fetchCatalog();
    } catch (error) {
       toast({ title: "Error al eliminar modelo", variant: "destructive" });
    } finally {
       setIsProcessing(false);
    }
  };

  const handleUpdateModel = async (oldModelName: string) => {
     if (!selectedMake) return;
     const finalName = editingModelName.trim();
     if (!finalName || finalName === oldModelName) {
       setEditingModel(null);
       return;
     }
     if (selectedMake.models.includes(finalName)) {
       toast({ title: "El modelo ya existe", variant: "destructive" });
       return;
     }

     setIsProcessing(true);
     try {
       const updatedModels = selectedMake.models.map(m => m === oldModelName ? finalName : m).sort();
       await updateDoc(doc(db, VEHICLE_COLLECTION, selectedMake.id), {
         models: updatedModels
       });
       toast({ title: "Modelo actualizado" });
       setEditingModel(null);
       await fetchCatalog();
     } catch (error) {
       toast({ title: "Error al actualizar", variant: "destructive" });
     } finally {
       setIsProcessing(false);
     }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center flex-col items-center h-[50vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      
      {/* LEFT COLUMN: MAKES */}
      <Card className="lg:col-span-1 shadow-sm border-border/50 flex flex-col h-[70vh]">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" /> Marcas
          </CardTitle>
          <CardDescription>Selecciona para ver sus modelos</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex flex-col h-full overflow-hidden">
           
           <div className="p-4 border-b">
              <form onSubmit={handleAddMake} className="flex gap-2">
                <Input 
                  placeholder="Ej: TOYOTA" 
                  value={newMakeName} 
                  onChange={e => setNewMakeName(e.target.value)}
                  disabled={isProcessing}
                  className="h-9"
                />
                <Button type="submit" size="sm" disabled={!newMakeName.trim() || isProcessing} className="px-3 shrink-0 h-9">
                  <Plus className="w-4 h-4" />
                </Button>
              </form>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {makes.map(make => (
               <div 
                 key={make.id}
                 className={cn(
                   "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border border-transparent",
                   selectedMake?.id === make.id ? "bg-primary/10 border-primary/20 text-primary font-bold" : "hover:bg-muted text-slate-700"
                 )}
                 onClick={() => setSelectedMake(make)}
               >
                 <span className="truncate pr-2">{make.id}</span>
                 <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded-md text-slate-500 font-mono">
                      {make.models.length}
                    </span>
                    {selectedMake?.id === make.id && <ChevronRight className="w-4 h-4" />}
                 </div>
               </div>
             ))}
             {makes.length === 0 && (
                <div className="text-center p-4 text-sm text-muted-foreground italic">No hay marcas registradas.</div>
             )}
           </div>
        </CardContent>
      </Card>

      {/* RIGHT COLUMN: MODELS */}
      <Card className="lg:col-span-3 shadow-sm border-border/50 flex flex-col h-[70vh]">
        {!selectedMake ? (
           <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
              <Settings2 className="w-16 h-16 opacity-20 mb-4" />
              <p className="text-lg font-medium text-slate-500">Selecciona una marca del menú lateral</p>
              <p className="text-sm opacity-70">Para administrar sus modelos</p>
           </div>
        ) : (
           <>
              <CardHeader className="pb-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl font-black text-slate-800">{selectedMake.id}</CardTitle>
                  <CardDescription>Catálogo de modelos disponibles</CardDescription>
                </div>
                <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteMake(selectedMake.id); }} disabled={isProcessing}>
                  Eliminar Marca
                </Button>
              </CardHeader>
              
              <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
                 <div className="p-6 border-b bg-slate-50">
                    <form onSubmit={handleAddModel} className="flex gap-4 max-w-lg">
                      <Input 
                        placeholder={`Nuevo modelo para ${selectedMake.id}...`} 
                        value={newModelName} 
                        onChange={e => setNewModelName(e.target.value)}
                        disabled={isProcessing}
                        className="bg-white"
                      />
                      <Button type="submit" disabled={!newModelName.trim() || isProcessing}>
                        <Plus className="w-4 h-4 mr-2" /> Agregar Modelo
                      </Button>
                    </form>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                       {selectedMake.models.map((model, index) => (
                          <div key={`${model}-${index}`} className="flex items-center justify-between p-3 border rounded-xl hover:border-slate-300 transition-colors bg-white shadow-sm">
                             {editingModel === model ? (
                               <div className="flex items-center gap-2 w-full">
                                  <Input 
                                    value={editingModelName}
                                    onChange={e => setEditingModelName(e.target.value)}
                                    className="h-8 py-1 px-2 flex-1"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleUpdateModel(model);
                                      if (e.key === 'Escape') setEditingModel(null);
                                    }}
                                  />
                                  <div className="flex shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleUpdateModel(model)} disabled={isProcessing}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100" onClick={() => setEditingModel(null)} disabled={isProcessing}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                               </div>
                             ) : (
                               <>
                                 <span className="font-bold text-slate-700">{model}</span>
                                 <div className="flex items-center shrink-0">
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => { setEditingModel(model); setEditingModelName(model); }} disabled={isProcessing}>
                                     <Edit2 className="w-4 h-4" />
                                   </Button>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteModel(model)} disabled={isProcessing}>
                                     <Trash2 className="w-4 h-4" />
                                   </Button>
                                 </div>
                               </>
                             )}
                          </div>
                       ))}
                    </div>
                    {selectedMake.models.length === 0 && (
                       <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-xl mt-4">
                          Esta marca aún no tiene modelos registrados.
                       </div>
                    )}
                 </div>
              </CardContent>
           </>
        )}
      </Card>
      
    </div>
  );
}
