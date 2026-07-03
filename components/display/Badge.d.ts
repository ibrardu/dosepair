import * as React from "react";

/**
 * Uppercase mono badge. Severity tones (high / moderate / low) for
 * interactions; info for llm_source; research for the teal panel.
 */
export interface BadgeProps {
  /** @default "neutral" */
  tone?: "high" | "moderate" | "low" | "info" | "research" | "neutral";
  /** Defaults to the tone's label (e.g. "Moderate"). */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function Badge(props: BadgeProps): React.ReactElement;
