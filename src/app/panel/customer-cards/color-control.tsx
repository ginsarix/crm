"use client";

import { Layers } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { cn } from "~/lib/utils";

type ColorValue = "green" | "blue" | "orange" | "gray" | "all";

const colorConfig = {
  green: {
    label: "Yeşil",
    dot: "bg-green-500",
    active: "bg-green-500/10 text-green-600",
    hover: "hover:bg-green-500/20 hover:text-green-600",
  },
  blue: {
    label: "Mavi",
    dot: "bg-blue-500",
    active: "bg-blue-500/10 text-blue-600",
    hover: "hover:bg-blue-500/20 hover:text-blue-600",
  },
  orange: {
    label: "Turuncu",
    dot: "bg-orange-500",
    active: "bg-orange-500/10 text-orange-600",
    hover: "hover:bg-orange-500/20 hover:text-orange-600",
  },
  gray: {
    label: "Gri",
    dot: "bg-gray-400",
    active: "bg-gray-400/10 text-gray-500",
    hover: "hover:bg-gray-400/20 hover:text-gray-500",
  },
} as const;

export default function ColorControl({
  id,
  color,
  setColor,
  includeAll = false,
}: {
  id?: string;
  color: ColorValue;
  setColor: (color: ColorValue) => void;
  includeAll?: boolean;
}) {
  return (
    <ButtonGroup id={id}>
      {(Object.keys(colorConfig) as (keyof typeof colorConfig)[]).map((c) => {
        const cfg = colorConfig[c];
        const isActive = color === c;
        return (
          <Button
            aria-pressed={isActive}
            className={cn(isActive && cfg.active, cfg.hover)}
            key={c}
            onClick={() => setColor(c)}
            type="button"
            variant="outline"
          >
            <span className={cn("h-3 w-3 rounded-full", cfg.dot)} />
            <span
              className={cn(
                "overflow-hidden transition-[max-width] duration-200 sm:max-w-24",
                isActive ? "max-w-24" : "max-w-0",
              )}
            >
              {cfg.label}
            </span>
          </Button>
        );
      })}
      {includeAll && (
        <Button
          aria-pressed={color === "all"}
          className={cn(
            color === "all" && "bg-primary/10 text-primary",
            "hover:bg-primary/20 hover:text-primary",
          )}
          onClick={() => setColor("all")}
          type="button"
          variant="outline"
        >
          <Layers />
          <span
            className={cn(
              "overflow-hidden transition-[max-width] duration-200 sm:max-w-24",
              color === "all" ? "max-w-24" : "max-w-0",
            )}
          >
            Tümü
          </span>
        </Button>
      )}
    </ButtonGroup>
  );
}
