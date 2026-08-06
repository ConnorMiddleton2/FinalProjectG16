"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";

type BaseProps = {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  className?: string;
  children?: ReactNode;
};

type InputProps = BaseProps & {
  as?: "input";
} & InputHTMLAttributes<HTMLInputElement>;

type TextareaProps = BaseProps & {
  as: "textarea";
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

type SelectProps = BaseProps & {
  as: "select";
} & SelectHTMLAttributes<HTMLSelectElement>;

type Props = InputProps | TextareaProps | SelectProps;

const STRIP_KEYS = new Set([
  "as",
  "label",
  "error",
  "hint",
  "required",
  "className",
  "children",
]);

/**
 * Accessible labeled field with aria-invalid / describedby wiring.
 *
 * Always mounts a real native control for input/textarea/select.
 * Children are ONLY used as <option> nodes for selects — never as a
 * replacement for the typing box (that previously made fields look
 * editable while swallowing value/onChange).
 */
export function PortalField(props: Props) {
  const autoId = useId();
  const {
    label,
    error,
    hint,
    required,
    className = "",
    as = "input",
    children,
  } = props;
  const id = ("id" in props && props.id) || autoId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  const labelNode = (
    <label htmlFor={id} className="label py-1">
      <span className="label-text font-medium text-[var(--harbor-ink)]">
        {label}
        {required ? (
          <>
            <span className="text-error" aria-hidden="true">
              {" "}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </span>
    </label>
  );

  let control: ReactNode;

  if (as === "textarea") {
    const textareaProps = { ...(props as TextareaProps) } as Record<
      string,
      unknown
    >;
    for (const key of STRIP_KEYS) delete textareaProps[key];
    control = (
      <textarea
        id={id}
        className={`portal-native-textarea w-full portal-focus ${error ? "border-error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        suppressHydrationWarning
        {...(textareaProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    );
  } else if (as === "select") {
    const selectProps = { ...(props as SelectProps) } as Record<string, unknown>;
    for (const key of STRIP_KEYS) delete selectProps[key];
    control = (
      <select
        id={id}
        className={`portal-native-select w-full min-h-11 portal-focus ${error ? "border-error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        suppressHydrationWarning
        {...(selectProps as SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {children}
      </select>
    );
  } else {
    const inputProps = { ...(props as InputProps) } as Record<string, unknown>;
    for (const key of STRIP_KEYS) delete inputProps[key];
    // Default to a real text box when callers omit type.
    if (inputProps.type == null) inputProps.type = "text";
    control = (
      <input
        id={id}
        className={`portal-native-input w-full min-h-11 portal-focus ${error ? "border-error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        suppressHydrationWarning
        {...(inputProps as InputHTMLAttributes<HTMLInputElement>)}
      />
    );
  }

  return (
    <div className={`form-control w-full max-w-full ${className}`}>
      {labelNode}
      {control}
      {hint ? (
        <p id={hintId} className="mt-1 text-sm text-[var(--harbor-ink)]/75">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
