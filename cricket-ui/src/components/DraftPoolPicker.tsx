import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import type { PoolPlayerOption } from "@/data/matchStore";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type DraftPoolPickerProps = {
  players: PoolPlayerOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/** Custom list picker matching the draft HUD — avoids native &lt;select&gt; UX on mobile/desktop. */
export default function DraftPoolPicker({
  players,
  value,
  onChange,
  disabled,
  placeholder = "Select player…",
}: DraftPoolPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = players.find((p) => p.id === value);

  useEffect(() => {
    function closeOnOutside(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("pointerdown", closeOnOutside, true);
      return () => document.removeEventListener("pointerdown", closeOnOutside, true);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  const blocked = !!disabled;

  useEffect(() => {
    if (blocked) setOpen(false);
  }, [blocked]);

  return (
    <div ref={rootRef} className={cn("relative min-w-0 flex-1", blocked && "pointer-events-none opacity-45")}>
      <button
        type="button"
        disabled={blocked}
        aria-expanded={open}
        aria-haspopup="listbox"
        id="draft-pool-picker-trigger"
        onClick={() => {
          if (!blocked) setOpen((o) => !o);
        }}
        className={cn(
          "flex h-12 w-full min-w-0 items-center gap-2 rounded-xl border border-cyan-500/30 bg-background/90 px-3 text-left backdrop-blur-sm outline-none transition-[box-shadow,transform,border-color]",
          !blocked && "motion-safe:active:scale-[0.995]",
          open && !blocked ? "border-primary/55 ring-[3px] ring-primary/20" : "hover:border-primary/40",
          blocked && "cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-[10px] font-black",
            selected && "border-primary/30 bg-primary/10 text-primary",
          )}
          aria-hidden
        >
          {selected ? initials(selected.name) : "—"}
        </span>
        <span className="min-w-0 flex-1">
          {!selected ? (
            <span className="truncate text-sm font-medium text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="flex min-w-0 flex-col gap-0 leading-tight">
              <span className="truncate text-sm font-bold">{selected.name}</span>
              {selected.phone ? (
                <span className="truncate text-[11px] text-muted-foreground">{selected.phone}</span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/75">Pool</span>
              )}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-labelledby="draft-pool-picker-trigger"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[70] max-h-[min(18rem,calc(100vh-220px))] overflow-y-auto overscroll-contain rounded-xl border border-primary/35 bg-popover py-1.5 shadow-[0_14px_40px_-12px_rgb(15_23_42/0.45)] backdrop-blur-md dark:border-cyan-500/25 dark:shadow-[0_18px_48px_-8px_rgb(0_0_0/0.65)]"
        >
          <li role="presentation" className="px-2 pb-1">
            <button
              type="button"
              className={cn(
                "w-full rounded-lg px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wider transition-colors touch-manipulation",
                !value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/80",
              )}
              onClick={() => pick("")}
            >
              {placeholder}
            </button>
          </li>
          {players.map((p) => (
            <li key={p.id} role="option" aria-selected={value === p.id}>
              <button
                type="button"
                onClick={() => pick(p.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors touch-manipulation",
                  value === p.id ? "bg-primary/12" : "hover:bg-muted/60 active:bg-muted/80",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-[10px] font-black">
                  {initials(p.name)}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  {p.phone ? (
                    <span className="block truncate text-[11px] text-muted-foreground">{p.phone}</span>
                  ) : null}
                </span>
                {value === p.id ? (
                  <Check className="size-4 shrink-0 text-primary" aria-hidden strokeWidth={2.5} />
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
