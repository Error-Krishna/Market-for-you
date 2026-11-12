import type { ReactNode } from "react";

import { Input, type InputProps } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface AuthFormFieldProps extends InputProps {
  label: string;
  errorMessage?: string;
  icon?: ReactNode;
}

export function AuthFormField({ label, errorMessage, id, icon, ...props }: AuthFormFieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>

      <Input id={id} leftIcon={icon} error={Boolean(errorMessage)} {...props} />

      {errorMessage && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{errorMessage}</p>}
    </div>
  );
}
