import * as React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  title?: React.ReactNode;
  accent?: string;
  padding?: string;
  style?: React.CSSProperties;
}

export declare function Card(props: CardProps): React.JSX.Element;
