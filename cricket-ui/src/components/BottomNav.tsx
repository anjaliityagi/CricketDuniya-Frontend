import { NavLink, useLocation } from "react-router-dom";
import { Home, Plus, Trophy, User, Users } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  match?: (pathname: string) => boolean;
};

const items: NavItem[] = [
  {
    to: "/home",
    label: "Home",
    icon: Home,
    match: (p) => p === "/home",
  },
  {
    to: "/teams",
    label: "Teams",
    icon: Users,
    match: (p) => p.startsWith("/teams"),
  },
  {
    to: "/matches",
    label: "Matches",
    icon: Trophy,
    match: (p) =>
      p.startsWith("/matches") && p !== "/matches/create",
  },
  {
    to: "/players",
    label: "Players",
    icon: User,
    match: (p) => p.startsWith("/players"),
  },
];

function isCreateActive(pathname: string) {
  return pathname === "/matches/create";
}

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-1/2 z-[35] w-full max-w-[430px] -translate-x-1/2 touch-manipulation"
      aria-label="Main"
    >
      <div className="pointer-events-auto relative border-t border-border bg-background/92 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]">
        <div className="grid h-14 grid-cols-5 items-end gap-0 px-1">
          {items.slice(0, 2).map(({ to, label, icon: Icon, match }) => {
            const active = match ? match(pathname) : pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-end gap-0.5 rounded-xl pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground transition-colors",
                  active && "text-primary",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-6 stroke-[2.25]" aria-hidden />
                <span>{label}</span>
              </NavLink>
            );
          })}

          <div className="relative flex h-full flex-col items-center justify-start">
            <NavLink
              to="/matches/create"
              className={cn(
                "absolute -top-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition hover:opacity-95 active:scale-[0.98]",
                isCreateActive(pathname) && "ring-primary/25",
              )}
              aria-label="Create match"
              aria-current={isCreateActive(pathname) ? "page" : undefined}
            >
              <Plus className="size-8 stroke-[2.5]" aria-hidden />
            </NavLink>
          </div>

          {items.slice(2).map(({ to, label, icon: Icon, match }) => {
            const active = match ? match(pathname) : pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-end gap-0.5 rounded-xl pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground transition-colors",
                  active && "text-primary",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-6 stroke-[2.25]" aria-hidden />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
