import * as React from "react";

/**
 * Pill chip (32px) — quick combos, recent searches, related-drug tags.
 * Hover lifts with a subtle shadow when clickable.
 */
export interface ChipProps {
  children?: React.ReactNode;
  /** Makes the chip clickable (hover lift). */
  onClick?: (e: React.MouseEvent) => void;
  /** Renders an × dismiss affordance (recent searches). */
  onRemove?: () => void;
  /** Blue-tint selected state. @default false */
  selected?: boolean;
  style?: React.CSSProperties;
}

export declare function Chip(props: ChipProps): React.ReactElement;
