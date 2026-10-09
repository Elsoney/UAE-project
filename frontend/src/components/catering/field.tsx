import type { ReactNode } from "react";

/** Label, hint and error wiring for one form control (WCAG 1.3.1, 3.3.1, 3.3.2). */
export function Field({
  id,
  label,
  required,
  requiredLabel,
  optionalLabel,
  hint,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  required?: boolean;
  requiredLabel: string;
  optionalLabel: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-semibold text-indigo">
        {label} <span className={`text-sm font-normal ${required ? "text-madder" : "text-date"}`}>({required ? requiredLabel : optionalLabel})</span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-date">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold text-madder">
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export const inputClass =
  "min-h-12 w-full rounded-lg border-2 border-rule bg-white px-3 text-base text-indigo placeholder:text-date/50 focus:border-indigo aria-[invalid=true]:border-madder";
