

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Driver, Vehicle } from "@/types";

const assignVehicleSchema = z.object({
  assignedVehicleId: z.string().nullable().optional(),
});

type AssignVehicleFormValues = z.infer<typeof assignVehicleSchema>;

interface AssignVehicleFormProps {
  id: string;
  driver: Driver;
  allVehicles: Vehicle[];
  onSubmit: (values: AssignVehicleFormValues) => void;
}

export function AssignVehicleForm({
  id,
  driver,
  allVehicles,
  onSubmit,
}: AssignVehicleFormProps) {
  const form = useForm<AssignVehicleFormValues>({
    resolver: zodResolver(assignVehicleSchema),
    defaultValues: {
      assignedVehicleId: driver.assignedVehicleId,
    },
  });
  
  const fleetVehicles = allVehicles.filter(v => v.isFleetVehicle);

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="assignedVehicleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vehículo a Asignar</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Seleccionar vehículo --" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">-- Ninguno --</SelectItem>
                  {fleetVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id} disabled={!!v.assignedDriverId && v.assignedDriverId !== driver.id}>
                        {v.licensePlate} - {v.make} {v.model} {v.assignedDriverId && v.assignedDriverId !== driver.id ? '(Asignado a otro)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

