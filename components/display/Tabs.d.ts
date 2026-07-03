import * as React from "react";

/**
 * Underline tabs — research panel (Clinical Trials / PubMed / FDA Approvals).
 * Active tab gets the accent-blue underline, matching nav-active.
 */
export interface TabsProps {
  /** Plain strings or { id, label, count? } objects. */
  tabs?: Array<string | { id: string; label: string; count?: number }>;
  /** Active tab id. */
  active?: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
}

export declare function Tabs(props: TabsProps): React.ReactElement;
