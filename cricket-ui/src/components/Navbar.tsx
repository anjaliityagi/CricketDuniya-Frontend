import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = "text-foreground hover:text-muted-foreground transition";

  return (
    <nav className="bg-background border-b border-border">
      <div className="max-w-[430px] mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">Cricket Duniya</h1>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open && (
        <div className="max-w-[430px] mx-auto px-4 pb-4 space-y-3 border-t border-border pt-3">
          <Link onClick={() => setOpen(false)} to="/home" className={cn("block", linkClass)}>
            Home
          </Link>
          <Link onClick={() => setOpen(false)} to="/matches" className={cn("block", linkClass)}>
            Matches
          </Link>
          <Link onClick={() => setOpen(false)} to="/teams" className={cn("block", linkClass)}>
            Teams
          </Link>
          <Button asChild className="w-full">
            <Link onClick={() => setOpen(false)} to="/login">
              Login
            </Link>
          </Button>
        </div>
      )}
    </nav>
  );
}
