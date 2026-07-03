import * as React from "react";

/**
 * Primary action button. Variants: primary (accent blue, one per view),
 * secondary (raised surface + border), ghost (transparent), danger (red tint).
 * @startingPoint section="Components" subtitle="DosePair button — primary / secondary / ghost / danger" viewport="700x220"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual style. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  disabled?: boolean;
  /** Optional leading icon node (e.g. a Lucide <i> or inline SVG). */
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export declare function Button(props: ButtonProps): React.ReactElement;
