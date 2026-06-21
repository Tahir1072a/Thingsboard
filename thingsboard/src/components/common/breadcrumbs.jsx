"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Breadcrumbs — Sayfa navigasyonu için ekmek kırıntısı bileşeni.
 *
 * Kullanım:
 * <Breadcrumbs items={[
 *   { label: "Cihazlar", href: "/devices" },
 *   { label: "Sensör-1" },
 * ]} />
 */
export default function Breadcrumbs({ items = [], className }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 text-sm mb-4 animate-fade-in",
        className
      )}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-text-muted hover:text-halo-600 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-text-muted/50" />
            {isLast || !item.href ? (
              <span
                className={cn(
                  "font-medium truncate max-w-[200px]",
                  isLast ? "text-text-main" : "text-text-muted"
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-text-muted hover:text-halo-600 transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
