import * as React from "react"
import { cn } from "@/lib/utils"

export function Card({ className = "", ...props }) {
  return <div className={cn("rounded-xl bg-white border shadow-sm", className)} {...props} />
}
export function CardHeader({ className = "", ...props }) {
  return <div className={cn("p-4 border-b", className)} {...props} />
}
export function CardContent({ className = "", ...props }) {
  return <div className={cn("p-4", className)} {...props} />
}
export function CardFooter({ className = "", ...props }) {
  return <div className={cn("p-4 border-t", className)} {...props} />
}
export function CardTitle({ className = "", ...props }) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
}
export function CardDescription({ className = "", ...props }) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />
}
