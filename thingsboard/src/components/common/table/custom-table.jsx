"use client";

import { cn, spanClasses } from "@/lib/utils";
import { Square } from "lucide-react";

export function CustomTableHeader({ columns, gridClassName = "grid-cols-12" }) {
  return (
    <div
      className={cn(
        "grid gap-2 px-6 py-4 border-b border-white/10 bg-white/30 items-center",
        gridClassName
      )}
    >
      {columns.map((col) => (
        <div
          key={col.id}
          className={cn(
            spanClasses[col.span] || "col-span-1",
            "text-sm font-semibold text-text-main flex items-center gap-2",
            col.align === "center" && "justify-center",
            col.align === "right" && "justify-end"
          )}
        >
          {col.icon && <col.icon className="w-4 h-4 text-text-muted" />}

          {col.headerRender ? col.headerRender() : col.title}
        </div>
      ))}
    </div>
  );
}

export function CustomTableRow({
  children,
  onClick,
  index = 0,
  gridClassName = "grid-cols-12",
  className,
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "grid gap-2 px-6 py-3 hover:bg-white/40 transition-all duration-200 group animate-slide-in items-center cursor-pointer border-b border-white/5 last:border-0",
        gridClassName,
        className
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {children}
    </div>
  );
}
