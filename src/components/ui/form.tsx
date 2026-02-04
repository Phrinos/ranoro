// src/components/ui/form.tsx
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  props: ControllerProps<TFieldValues, TName>
) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

type FormItemContextValue = { id: string };
const FormItemContext = React.createContext<FormItemContextValue | null>(null);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div
          ref={ref}
          className={cn("space-y-2", className)}
          {...props}
        />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = "FormItem";

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) throw new Error("useFormField must be used within <FormField>");
  if (!itemContext) throw new Error("useFormField must be used within <FormItem>");

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  const formItemId = `${id}-form-item`;
  const formDescriptionId = `${id}-form-item-description`;
  const formMessageId = `${id}-form-item-message`;

  return {
    id,
    name: fieldContext.name,
    formItemId,
    formDescriptionId,
    formMessageId,
    ...fieldState,
  };
};

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();
  return (
    <Label
      ref={ref}
      htmlFor={formItemId}
      className={cn(
        "text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
        error && "text-destructive",
        className
      )}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  // Si hay error, describimos también el mensaje; si no, sólo description.
  const describedBy = error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId;

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={describedBy}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;

  if (!body) return null;

  return (
    <p
      ref={ref}
      id={formMessageId}
      role="alert"
      aria-live="polite"
      className={cn("text-sm font-semibold text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
