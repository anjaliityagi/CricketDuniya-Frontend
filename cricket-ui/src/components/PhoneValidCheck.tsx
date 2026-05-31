import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

type PhoneValidCheckProps = {
  valid: boolean;
  className?: string;
  size?: number;
};

export default function PhoneValidCheck({
  valid,
  className,
  size = 18,
}: PhoneValidCheckProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!valid) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [valid]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "phone-valid-check pointer-events-none absolute top-1/2 grid place-items-center rounded-full",
        visible && "phone-valid-check-visible",
        className
      )}
    >
      <CheckCircle2 size={size} strokeWidth={2.5} />
    </span>
  );
}
