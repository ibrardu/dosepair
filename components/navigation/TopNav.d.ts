import * as React from "react";

/**
 * Fixed top navigation — dark surface with blur, DosePair wordmark left,
 * five links right, active link gets accent-blue text + underline.
 */
export interface TopNavProps {
  /** @default the five product pages (home / analyze / research / history / settings) */
  links?: Array<{ id: string; label: string }>;
  /** Active link id. @default "home" */
  active?: string;
  onNavigate?: (id: string) => void;
  /** Path to the DosePair logo SVG. */
  logoSrc?: string;
  /** position:fixed instead of sticky. @default false */
  fixed?: boolean;
}

export declare function TopNav(props: TopNavProps): React.ReactElement;
