import * as React from "react";

/**
 * Standard text field with uppercase mono label, focus glow, optional hint.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Uppercase mono label above the field. */
  label?: string;
  /** Muted helper text below the field. */
  hint?: string;
  /** Use mono font for the value (doses, keys, times). @default false */
  mono?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export declare function Input(props: InputProps): React.ReactElement;
