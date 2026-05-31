import { Link, NavLink } from "react-router-dom";
import {
  CalendarDays,
  House,
  Shield,
  Users,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { cn } from "@/lib/utils";

const bottomTabs = [
  { to: "/home", label: "Home", icon: House },
  { to: "/matches", label: "Matches", icon: CalendarDays },
  { to: "/teams", label: "Teams", icon: UsersRound },
  { to: "/players", label: "Players", icon: Users },
];

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const { data: profile } = useProfileQuery(isAuthenticated);
  const displayName =
    getStringValue(profile?.user.name) ||
    getStringValue(user?.name) ||
    getStringValue(user?.full_name) ||
    getStringValue(user?.fullName) ||
    getStringValue(user?.username) ||
    getStringValue(user?.first_name) ||
    getStringValue(user?.firstName) ||
    "Profile";
  const initials = getInitials(
    displayName,
    getStringValue(user?.first_name) || getStringValue(user?.firstName),
    getStringValue(user?.last_name) || getStringValue(user?.lastName),
  ).toUpperCase();

  return (
    <>
      <nav className="glass-nav sticky top-0 z-30 border-b border-border/80 backdrop-blur-xl">
        <div className="india-accent-strip h-1" />
        <div className="max-w-[430px] mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Shield size={18} />
            </span>
            <div>
              <h1 className="brand-wordmark text-[1.35rem] font-black leading-none">
                CricRx
              </h1>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.24em] text-muted-foreground">
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
                size="icon"
                className="size-10 rounded-full p-0"
              >
                <Link to="/profile" aria-label={`Open ${displayName} profile`} title={displayName}>
                  <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground shadow-sm shadow-primary/25">
                    {initials}
                  </span>
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgb(9_21_36_/_0.14)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[430px] items-center justify-between gap-1">
          {bottomTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground transition",
                  "hover:bg-muted hover:text-foreground",
                  isActive && "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                )
              }
            >
              <Icon size={19} strokeWidth={2.4} />
              <span className="max-w-full truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getInitials(displayName: string, firstName = "", lastName = "") {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`;
  }

  const nameParts = displayName.split(/\s+/).filter(Boolean);

  if (nameParts.length > 1) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`;
  }

  return nameParts[0]?.[0] || "P";
}
