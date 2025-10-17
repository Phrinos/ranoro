import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  error?: string | boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      error,
      leftIcon,
      rightIcon,
      size = "md",
      id,
      "aria-describedby": ariaDesc,
      ...props
    },
    ref
  ) => {
    const invalid = Boolean(error) || (props as any)["aria-invalid"] === true;

    // Si te pasan `value`, lo conservamos; si no, dejamos el input no-controlado.
    const hasValueProp = Object.prototype.hasOwnProperty.call(props, "value");
    const valueProp = hasValueProp ? { value: (props as any).value ?? "" } : {};

    const describedBy =
      ariaDesc ?? (invalid && id ? `${id}-error` : undefined);

    const sizeClasses =
      size === "sm"
        ? "h-9 text-sm px-3"
        : size === "lg"
        ? "h-12 text-base px-4"
        : "h-10 text-sm px-3";

    return (
      <div className={cn("relative", className)}>
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {leftIcon}
          </span>
        )}

        <input
          id={id}
          ref={ref}
          type={type}
          {...props}
          {...valueProp}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            // Base
            "block w-full rounded-md border text-foreground outline-none transition",
            // Fondo
            "bg-white placeholder-shown:bg-muted/30 focus:bg-white placeholder:text-muted-foreground",
            // Normal focus (sin “doble” borde)
            "border-input focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
            // Deshabilitado
            "disabled:cursor-not-allowed disabled:opacity-60",
            // Estado de error: solo cambiamos border + ring sutil
            invalid &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40",
            // Padding si hay iconos
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            sizeClasses
          )}
        />

        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </span>
        )}

        {typeof error === "string" && (
          <p id={id ? `${id}-error` : undefined} className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
