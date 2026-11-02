import * as React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  mono?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export declare function Input(props: InputProps): React.JSX.Element;
