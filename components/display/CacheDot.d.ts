import * as React from "react";

/**
 * Cache indicator dot — green glow = cache hit, grey = live fetch.
 * Required on every drug row and interaction card (product rule 11).
 */
export interface CacheDotProps {
  /** @default false */
  hit?: boolean;
  /** Append a mono "cache hit" / "live fetch" label. @default false */
  showLabel?: boolean;
}

export declare function CacheDot(props: CacheDotProps): React.ReactElement;
