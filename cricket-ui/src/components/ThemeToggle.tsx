import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

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
