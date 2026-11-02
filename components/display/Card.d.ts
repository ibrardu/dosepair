import * as React from "react";

/**
 * Surface card — the base container for every results panel.
 * Border does the work; shadow is minimal (dark UI).
 */
export interface CardProps {
  children?: React.ReactNode;
  /** Display-font heading rendered above content. */
  title?: string;
  /** Override border color (e.g. var(--severity-moderate) for the disclaimer's amber). */
  accent?: string;
  /** @default "var(--space-5)" */
  padding?: string | number;
  style?: React.CSSProperties;
}

export declare function Card(props: CardProps): React.ReactElement;
