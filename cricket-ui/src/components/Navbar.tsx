import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass =
    "block text-lg font-semibold py-2 text-foreground hover:text-muted-foreground transition";

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <nav className="bg-background border-b border-border relative z-30">
        <div className="max-w-[430px] mx-auto px-4 py-3 flex items-center justify-between">
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
      </nav>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMenu}
          />

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background shadow-xl">
            <div className="px-4 py-4 flex items-center justify-between border-b border-border">
              <h2 className="text-xl font-extrabold tracking-tight">Menu</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <X />
              </Button>
            </div>

            <div className="px-4 py-6 space-y-2">
              <Link onClick={closeMenu} to="/home" className={linkClass}>
                Home
              </Link>
              <Link onClick={closeMenu} to="/matches" className={linkClass}>
                Matches
              </Link>
              <Link onClick={closeMenu} to="/teams" className={linkClass}>
                Teams
              </Link>

              <div className="pt-4 space-y-3">
                <ThemeToggle />
                <Button asChild className="w-full h-11">
                  <Link onClick={closeMenu} to="/login">
                    Login
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
