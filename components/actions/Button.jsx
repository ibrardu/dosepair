import React from "react";

const VARIANTS = {
  primary: {
    base: { background: "var(--accent)", color: "var(--accent-on, #FFFFFF)", border: "1px solid transparent" },
    hover: { background: "var(--accent-hover)" },
    press: { background: "var(--accent-press)" },
  },
  secondary: {
    base: { background: "var(--surface-card)", color: "var(--text-body)", border: "1px solid var(--border-default)" },
    hover: { background: "var(--surface-raised)", border: "1px solid var(--border-strong, var(--border-default))" },
    press: { background: "var(--surface-raised)" },
  },
  ghost: {
    base: { background: "transparent", color: "var(--text-secondary)", border: "1px solid transparent" },
    hover: { background: "var(--tint-ink, var(--surface-raised))", color: "var(--text-body)" },
    press: { background: "var(--surface-raised)" },
  },
  danger: {
    base: { background: "var(--tint-red)", color: "var(--severity-high)", border: "1px solid var(--severity-high)" },
    hover: { background: "var(--severity-high)", color: "var(--accent-on, #FFFFFF)" },
    press: { background: "var(--severity-high)", color: "var(--accent-on, #FFFFFF)" },
  },
};

const SIZES = {
  sm: { height: 32, padding: "0 12px", fontSize: "var(--text-sm)" },
  md: { height: "var(--height-button)", padding: "0 20px", fontSize: "var(--text-base)" },
  lg: { height: 48, padding: "0 28px", fontSize: "var(--text-md)" },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  icon = null,
  onClick,
  style,
  ...rest
}) {
  const [state, setState] = React.useState("base");
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const stateStyle = state === "press" ? { ...v.hover, ...v.press } : state === "hover" ? v.hover : {};

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setState("hover")}
      onMouseLeave={() => setState("base")}
      onMouseDown={() => setState("press")}
      onMouseUp={() => setState("hover")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        width: fullWidth ? "100%" : undefined,
        transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
        whiteSpace: "nowrap",
        ...s,
        ...v.base,
        ...(disabled ? {} : stateStyle),
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
