"use client";

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

type TextFieldProps = {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
};

type TextAreaFieldProps = {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
};

type SelectFieldProps = {
  label: string;
  value: string;
  disabled?: boolean;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
};

export function CheckboxField(props: Readonly<CheckboxFieldProps>) {
  const fieldId = `checkbox-field-${props.label.toLowerCase().replaceAll(/\s+/g, "-")}`;
  return (
    <label
      htmlFor={fieldId}
      className="flex items-center gap-2 text-sm text-ink-secondary"
    >
      <input
        id={fieldId}
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

export function TextField(props: Readonly<TextFieldProps>) {
  const fieldId = `text-field-${props.label.toLowerCase().replaceAll(/\s+/g, "-")}`;
  return (
    <label htmlFor={fieldId} className="space-y-1 text-xs text-ink-tertiary">
      <span>{props.label}</span>
      <input
        id={fieldId}
        type="text"
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
      />
    </label>
  );
}

export function TextAreaField(props: Readonly<TextAreaFieldProps>) {
  const fieldId = `textarea-field-${props.label.toLowerCase().replaceAll(/\s+/g, "-")}`;
  return (
    <label htmlFor={fieldId} className="space-y-1 text-xs text-ink-tertiary">
      <span>{props.label}</span>
      <textarea
        id={fieldId}
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-[88px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
      />
    </label>
  );
}

export function SelectField(props: Readonly<SelectFieldProps>) {
  const fieldId = `select-field-${props.label.toLowerCase().replaceAll(/\s+/g, "-")}`;
  return (
    <label htmlFor={fieldId} className="space-y-1 text-xs text-ink-tertiary">
      <span>{props.label}</span>
      <select
        id={fieldId}
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
      >
        <option value="">Selectionner</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
