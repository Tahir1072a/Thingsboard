"use client";

import { Button } from "@/components/ui/button";
import {
  UserPlus,
  UserMinus,
  Trash2,
  Share2,
  Power,
  Activity,
} from "lucide-react";

export default function EntityActionBar({ actions }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 items-center mb-6">
      {actions.map((action, index) => {
        const Icon = action.icon;

        return (
          <Button
            key={index}
            size="sm"
            variant={action.variant || "outline"}
            onClick={action.onClick}
            disabled={action.disabled}
            className={action.className}
          >
            {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
