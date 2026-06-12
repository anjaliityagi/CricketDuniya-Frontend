import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

type BackButtonProps = {
  fallbackTo: string;
  label?: string;
  className?: string;
  iconSize?: number;
  iconOnly?: boolean;
};

export default function BackButton({
  fallbackTo,
  label = "Back",
  className,
  iconSize = 18,
  iconOnly = false,
}: BackButtonProps) {
  const navigate = useNavigate();

  function handleBack() {
    const historyState = window.history.state as { idx?: number } | null;

    if (typeof historyState?.idx === "number" && historyState.idx > 0) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo, { replace: true });
  }

  return (
    <button
      type="button"
      aria-label={iconOnly ? label : undefined}
      className={cn(
        iconOnly
          ? "inline-grid size-10 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          : "inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground",
        className,
      )}
      onClick={handleBack}
    >
      <ArrowLeft size={iconSize} />
      {!iconOnly && label}
    </button>
  );
}
