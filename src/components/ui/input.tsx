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
      ...props
    },
    ref
  ) => {
    const invalid = Boolean(error);

    // Mantener no-controlado si no pasan `value`
    const hasValue = Object.prototype.hasOwnProperty.call(props, "value");
    const valueProp = hasValue ? { value: (props as any).value ?? "" } : {};

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
          className={cn(
            // Base
            "block w-full rounded-md border bg-white text-foreground placeholder:text-muted-foreground outline-none transition",
            // Focus sin “doble borde”
            "border-input focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 ring-offset-1 focus-visible:ring-offset-1",
            // Deshabilitado
            "disabled:cursor-not-allowed disabled:opacity-60",
            // Error
            invalid &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40",
            // Icon paddings
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            // Evitar fondo de autofill también por clase utilitaria
            "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:inherit]",
            sizeClasses
          )}
        />

        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </span>
        )}
        {typeof error === "string" && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
