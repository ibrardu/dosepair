import * as React from "react";

/**
 * Native select styled to match Input — used for route (oral / topical / …)
 * and time pickers in medication rows.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  /** Either plain strings or { value, label } pairs. */
  options?: Array<string | { value: string; label: string }>;
  style?: React.CSSProperties;
}

export declare function Select(props: SelectProps): React.ReactElement;
