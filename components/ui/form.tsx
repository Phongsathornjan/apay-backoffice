import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const FIELD_BASE =
  "w-full rounded-card border border-line bg-surface px-3.5 text-sm text-ink shadow-card outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-secondary aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, "h-10", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD_BASE, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_BASE, "min-h-24 py-2.5", className)} {...props} />;
}

type FieldChild = ReactElement<{
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}>;

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;

  const child = isValidElement(children) ? (children as FieldChild) : null;
  const controlId = htmlFor ?? child?.props.id ?? generatedId;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const control =
    child && describedBy
      ? cloneElement(child, {
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
        })
      : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={controlId} className="text-xs font-semibold text-ink">
          {label}
          {optional ? (
            <span className="ml-1.5 font-normal text-ink-muted">(ไม่บังคับ)</span>
          ) : null}
        </label>
        {hint ? (
          <span id={hintId} className="text-[11px] text-ink-muted">
            {hint}
          </span>
        ) : null}
      </div>
      {control}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-card border border-line bg-surface p-3.5 transition hover:border-line-strong",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-brand"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-ink-secondary">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
