import * as React from 'react';

export type SelectOption = string | { value: string; label: React.ReactNode };

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'style'> {
  label?: React.ReactNode;
  options?: SelectOption[];
  style?: React.CSSProperties;
}

export declare function Select(props: SelectProps): React.JSX.Element;
