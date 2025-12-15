// src/components/ui/button.jsx
import React from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  as: Comp = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-4 text-[13px]",
    lg: "h-10 px-5 text-base",
  };

  const variants = {
    primary: "bg-[#0B5ED7] text-white hover:bg-[#0a53be] focus-visible:ring-[#0B5ED7]",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
    outline: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-900",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  };

  return (
    <Comp
      className={[base, sizes[size], variants[variant], className].join(" ")}
      {...props}
    >
      {children}
    </Comp>
  );
}
