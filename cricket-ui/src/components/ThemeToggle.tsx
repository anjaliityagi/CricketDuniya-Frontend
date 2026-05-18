import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  iconOnly?: boolean;
};

export default function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 justify-between"
      onClick={toggleTheme}
    >
      <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </Button>
  );
}
