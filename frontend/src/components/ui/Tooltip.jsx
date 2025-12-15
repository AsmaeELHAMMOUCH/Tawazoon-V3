import React from "react";

export function Tooltip({ children }) {
  return <>{children}</>;
}

export function TooltipProvider({ children }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children, asChild }) {
  return <>{children}</>;
}

export function TooltipContent({ children, className = "" }) {
  // Minimal no-op tooltip content; could be enhanced later
  return <div className={"hidden " + className}>{children}</div>;
}

export default Tooltip;

