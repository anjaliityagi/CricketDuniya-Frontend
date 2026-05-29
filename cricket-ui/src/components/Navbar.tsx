import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, Shield, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const displayName = user?.name || "Profile";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const linkClass =
    "block rounded-xl px-3 py-3 text-base font-semibold text-foreground transition hover:bg-muted";

  function closeMenu() {
    setOpen(false);
  }

  function handleLogout() {
    logout();
    closeMenu();
    navigate("/login");
  }

  return (
    <>
      <nav className="bg-background/92 backdrop-blur border-b border-border relative z-30">
        <div className="india-accent-strip h-1" />
        <div className="max-w-[430px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </Button>
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Shield size={18} />
            </span>
            <div>
              <h1 className="brand-wordmark text-xl font-black tracking-tight">
                CricRx
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
                Cricket hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle iconOnly />
            {isAuthenticated ? (
              <Button
                asChild
                variant="ghost"
                className="h-10 max-w-[132px] gap-2 rounded-full px-2"
              >
                <Link to="/profile">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                    {initials}
                  </span>
                  <span className="truncate text-xs font-bold">{displayName}</span>
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="h-9 rounded-full">
                <Link to="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="nav-drawer-overlay absolute inset-0 bg-black/45"
            onClick={closeMenu}
          />

          <div className="nav-drawer absolute left-0 top-0 h-full w-[82vw] max-w-[340px] bg-background shadow-2xl">
            <div className="india-accent-strip h-1" />
            <div className="px-4 py-4 flex items-center justify-between border-b border-border">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Menu</h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  <span className="brand-wordmark">CricRx</span>
                </p>
              </div>
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
              <Link onClick={closeMenu} to="/players" className={linkClass}>
                Players
              </Link>

              <div className="pt-4 space-y-3">
                {isAuthenticated ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-2"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />
                    Logout
                  </Button>
                ) : (
                  <Button asChild className="w-full h-11">
                    <Link onClick={closeMenu} to="/login">
                      Login
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
