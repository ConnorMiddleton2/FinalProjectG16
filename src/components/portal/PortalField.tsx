"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
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

/**
 * Accessible labeled field with aria-invalid / describedby wiring.
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
    ...rest
  } = props;
  const id = ("id" in rest && rest.id) || autoId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const controlClass = `input input-bordered w-full min-h-11 portal-focus ${
    error ? "input-error" : ""
  }`;

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
  if (children) {
    control = children;
  } else if (as === "textarea") {
    const { as: _a, label: _l, error: _e, hint: _h, required: _r, className: _c, ...textareaProps } =
      props as TextareaProps;
    control = (
      <textarea
        id={id}
        className={`textarea textarea-bordered w-full min-h-28 portal-focus ${error ? "textarea-error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        {...textareaProps}
      />
    );
  } else if (as === "select") {
    const { as: _a, label: _l, error: _e, hint: _h, required: _r, className: _c, children: selectChildren, ...selectProps } =
      props as SelectProps;
    control = (
      <select
        id={id}
        className={`select select-bordered w-full min-h-11 portal-focus ${error ? "select-error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        {...selectProps}
      >
        {selectChildren}
      </select>
    );
  } else {
    const { as: _a, label: _l, error: _e, hint: _h, required: _r, className: _c, ...inputProps } =
      props as InputProps;
    control = (
      <input
        id={id}
        className={controlClass}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        {...inputProps}
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
