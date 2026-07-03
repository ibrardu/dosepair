import * as React from "react";

/**
 * Pill-shaped drug search field (homepage signature component). Confirmed
 * drugs render as removable chips inside the field; `+`, `,` or Enter
 * confirms the typed name; Enter on empty text submits the combo.
 * @startingPoint section="Components" subtitle="Tag-input drug search with autocomplete" viewport="700x180"
 */
export interface TagInputProps {
  /** Confirmed drug names (controlled). */
  tags?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  /** 15 desktop / 5 mobile per product rule. @default 15 */
  maxTags?: number;
  /** Autocomplete candidates (RxNorm names). Prefix-matched against typed text. */
  suggestions?: string[];
  /** Called when user presses Enter with ≥1 chip and no pending text. */
  onSubmit?: (tags: string[]) => void;
  autoFocus?: boolean;
}

export declare function TagInput(props: TagInputProps): React.ReactElement;
