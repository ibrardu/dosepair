import * as React from "react";

/**
 * Medical disclaimer — amber border, always the LAST panel on every
 * results view. Non-negotiable (product rule 6).
 */
export interface DisclaimerProps {
  /** Override the default disclaimer copy. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function Disclaimer(props: DisclaimerProps): React.ReactElement;
