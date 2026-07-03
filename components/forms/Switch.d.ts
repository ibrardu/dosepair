import * as React from "react";

/**
 * Toggle switch — settings page (theme, key overrides).
 */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Inline label rendered to the right. */
  label?: React.ReactNode;
  disabled?: boolean;
}

export declare function Switch(props: SwitchProps): React.ReactElement;
