import { cn } from "@/lib/utils"

export function Separator({ vertical = false, orientation = 'horizontal', className = '' }) {
  const isVertical = vertical || orientation === 'vertical'
  return (
    <div
      className={cn(
        "shrink-0 bg-slate-200",
        isVertical ? "h-full w-px" : "h-px w-full",
        className
      )}
    />
  )
}

