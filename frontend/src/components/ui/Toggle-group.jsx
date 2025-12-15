import React from "react";

export function ToggleGroup({ type = "single", value, onValueChange, children, className = "" }) {
  const handleClick = (val) => {
    if (type === "single") onValueChange && onValueChange(val);
  };
  return (
    <div className={"inline-flex items-center gap-2 " + className}>
      {React.Children.map(children, (child) =>
        child && child.type === ToggleGroupItem
          ? React.cloneElement(child, {
              active: child.props.value === value,
              onClick: () => handleClick(child.props.value),
            })
          : child
      )}
    </div>
  );
}

export function ToggleGroupItem({ value, children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md border px-3 py-1.5 text-sm " +
        (active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-300")
      }
    >
      {children}
    </button>
  );
}

export default ToggleGroup;

