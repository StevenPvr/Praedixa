"use client";

import { cn } from "../../../lib/utils";

type InputType = "text" | "email" | "textarea" | "select";

interface InputFieldV2Props {
  label: string;
  name: string;
  type: InputType;
  options?: string[];
  required?: boolean;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const baseInputClass = cn(
  "w-full rounded-[var(--radius-input)] border border-v2-border-200 bg-surface-0 px-4 text-sm text-ink-950 placeholder:text-ink-600",
  "transition-all duration-200 ease-out-expo",
  "focus:border-proof-500 focus:outline-none focus:ring-2 focus:ring-proof-500/20",
);

const errorInputClass =
  "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20";

function InputFieldLabel({
  inputId,
  label,
  required,
}: {
  inputId: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={inputId} className="text-sm font-medium text-ink-950">
      {label}
      {required ? (
        <span className="ml-0.5 text-danger-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

function getControlClass(hasError: boolean, className: string) {
  return cn(baseInputClass, className, hasError && errorInputClass);
}

type SharedControlProps = {
  errorId?: string;
  hasError: boolean;
  inputId: string;
  name: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
};

function buildControlProps({
  errorId,
  hasError,
  inputId,
  name,
  required,
  value,
}: SharedControlProps) {
  return {
    id: inputId,
    name,
    ...(required !== undefined ? { required } : {}),
    value,
    ...(errorId !== undefined ? { "aria-describedby": errorId } : {}),
    "aria-invalid": hasError,
  } as const;
}

function TextareaControl(props: SharedControlProps) {
  return (
    <textarea
      {...buildControlProps(props)}
      rows={4}
      onChange={(event) => props.onChange(event.target.value)}
      className={getControlClass(props.hasError, "resize-y py-3")}
    />
  );
}

function SelectControl(props: SharedControlProps & { options?: string[] }) {
  return (
    <select
      {...buildControlProps(props)}
      onChange={(event) => props.onChange(event.target.value)}
      className={getControlClass(props.hasError, "h-14 appearance-none")}
    >
      <option value="" disabled />
      {(props.options ?? []).map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function InputFieldControl({
  options,
  type,
  ...props
}: Omit<InputFieldV2Props, "className" | "error" | "label"> &
  SharedControlProps) {
  if (type === "textarea") {
    return <TextareaControl {...props} />;
  }

  if (type === "select") {
    return (
      <SelectControl
        {...props}
        {...(options !== undefined ? { options } : {})}
      />
    );
  }

  return (
    <input
      {...buildControlProps(props)}
      type={type}
      onChange={(event) => props.onChange(event.target.value)}
      className={getControlClass(props.hasError, "h-14")}
    />
  );
}

export function InputFieldV2({
  label,
  name,
  type,
  options,
  required,
  error,
  value,
  onChange,
  className,
}: InputFieldV2Props) {
  const inputId = `input-${name}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hasError = Boolean(error);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <InputFieldLabel
        inputId={inputId}
        label={label}
        {...(required !== undefined ? { required } : {})}
      />
      <InputFieldControl
        hasError={hasError}
        inputId={inputId}
        name={name}
        onChange={onChange}
        {...(errorId !== undefined ? { errorId } : {})}
        {...(options !== undefined ? { options } : {})}
        {...(required !== undefined ? { required } : {})}
        type={type}
        value={value}
      />

      {error && (
        <p id={errorId} className="text-xs text-danger-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
